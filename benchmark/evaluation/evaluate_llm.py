from __future__ import annotations

import argparse
import base64
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from openai import OpenAI
from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError
from rich.console import Console
from tenacity import retry, stop_after_attempt, wait_exponential

from benchmark.lib.benchlib import mean_std, read_jsonl, write_json


console = Console()


class Rubric(BaseModel):
    outcome: float = Field(ge=0, le=1)
    evidence: float = Field(ge=0, le=1)
    trajectory: float = Field(ge=0, le=1)
    ux_clarity: float = Field(ge=0, le=1)


class EvidenceUsed(BaseModel):
    screenshots_count: int = Field(ge=0)
    used_last_k: int = Field(ge=0)
    used_traj: bool
    used_text_obs: bool


class LlmEvalOut(BaseModel):
    task_id: str
    passed: bool
    score_0_1: float = Field(ge=0, le=1)
    confidence_0_1: float = Field(ge=0, le=1)
    failure_reasons_topk: list[str] = Field(default_factory=list, max_length=5)
    rubric: Rubric
    evidence_used: EvidenceUsed
    explanation_short: str = ""
    recommended_fix: str = ""
    consistency_notes: str = ""


def load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def b64_png(path: Path) -> str:
    raw = path.read_bytes()
    return base64.b64encode(raw).decode("ascii")


def last_k_screens(task_dir: Path, k: int) -> list[Path]:
    screens = sorted((task_dir / "screens").glob("step_*.png"))
    return screens[-k:] if k > 0 else []


def read_traj_snippet(task_dir: Path, max_lines: int = 200) -> str:
    traj = task_dir / "traj.jsonl"
    if not traj.exists():
        return ""
    lines = traj.read_text(encoding="utf-8").splitlines()
    if len(lines) <= max_lines:
        return "\n".join(lines)
    # keep head+tail
    head = lines[: max_lines // 2]
    tail = lines[-max_lines // 2 :]
    return "\n".join(head + ["...TRUNCATED..."] + tail)


def render_user_prompt(template: str, task: dict[str, Any], obs: dict[str, Any], traj: str, last_k: int) -> str:
    return (
        template.replace("{{TASK_JSON}}", json.dumps(task, ensure_ascii=False))
        .replace("{{JUDGE_JSON}}", json.dumps(task.get("judge", {}), ensure_ascii=False))
        .replace("{{TRAJ_JSONL}}", traj)
        .replace("{{OBS_JSON}}", json.dumps(obs, ensure_ascii=False))
        .replace("{{LAST_K}}", str(last_k))
    )


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
def call_openai_json(
    client: OpenAI,
    model: str,
    system_prompt: str,
    user_prompt: str,
    images: list[Path],
) -> dict[str, Any]:
    content: list[dict[str, Any]] = [{"type": "text", "text": user_prompt}]
    for img in images:
        content.append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{b64_png(img)}"},
            }
        )
    # Support both Responses API (newer) and Chat Completions API (older / compatible).
    if hasattr(client, "responses"):
        resp = client.responses.create(
            model=model,
            input=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": content},
            ],
            response_format={"type": "json_object"},
        )
        text = resp.output_text
        return json.loads(text)
    # Fallback: chat.completions
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": content},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )
    text = resp.choices[0].message.content or "{}"
    return json.loads(text)


def eval_one_trial(
    client: OpenAI,
    model: str,
    system_prompt: str,
    user_template: str,
    task: dict[str, Any],
    task_dir: Path,
    last_k: int,
    max_traj_lines: int,
) -> tuple[bool, dict[str, Any]]:
    obs = load_json(task_dir / "obs.json") if (task_dir / "obs.json").exists() else {}
    traj = read_traj_snippet(task_dir, max_lines=max_traj_lines)
    images = last_k_screens(task_dir, last_k)
    user_prompt = render_user_prompt(user_template, task, obs, traj, last_k=len(images))
    raw = call_openai_json(client, model=model, system_prompt=system_prompt, user_prompt=user_prompt, images=images)
    # Normalize to schema: make the evaluator robust (WebVoyager-style auto eval focuses on success;
    # we add missing fields deterministically to avoid "schema brittle" failures.)
    if "task_id" not in raw:
        raw["task_id"] = task.get("task_id", "")
    if "failure_reasons_topk" not in raw or not isinstance(raw.get("failure_reasons_topk"), list):
        raw["failure_reasons_topk"] = []
    if "confidence_0_1" not in raw:
        raw["confidence_0_1"] = 0.5
    if "score_0_1" not in raw:
        raw["score_0_1"] = 1.0 if bool(raw.get("passed")) else 0.0
    if "rubric" not in raw or not isinstance(raw.get("rubric"), dict):
        # Conservative defaults: assume outcome aligns with score, others mid.
        s = float(raw.get("score_0_1", 0.0) or 0.0)
        raw["rubric"] = {
            "outcome": s,
            "evidence": min(1.0, max(0.0, float(raw.get("confidence_0_1", 0.5) or 0.5))),
            "trajectory": 0.6,
            "ux_clarity": 0.6,
        }
    if "evidence_used" not in raw or not isinstance(raw.get("evidence_used"), dict):
        raw["evidence_used"] = {
            "screenshots_count": len(sorted((task_dir / "screens").glob("step_*.png"))),
            "used_last_k": len(images),
            "used_traj": bool(traj.strip()),
            "used_text_obs": bool((obs.get("body_text") or "").strip()),
        }
    try:
        parsed = LlmEvalOut.model_validate(raw)
        # enforce passed definition (upgrade: consistent rule)
        passed = bool(parsed.score_0_1 >= 0.5 and parsed.rubric.outcome >= 0.5)
        raw["_normalized_passed"] = passed
        return passed, {"ok": True, "raw": raw}
    except ValidationError as e:
        return False, {"ok": False, "error": "schema_validation_error", "raw": raw, "detail": str(e)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run_dir", required=True)
    ap.add_argument("--tasks", required=True)
    ap.add_argument("--model", default="gpt-4.1-mini")
    ap.add_argument("--trials", type=int, default=3)
    ap.add_argument("--last_k", type=int, default=8)
    ap.add_argument("--max_traj_lines", type=int, default=240)
    ap.add_argument("--system_prompt", default=str(Path(__file__).parent / "prompts" / "system_eval_v1.txt"))
    ap.add_argument("--user_prompt", default=str(Path(__file__).parent / "prompts" / "user_eval_v1.md"))
    ap.add_argument("--task_id", default="", help="仅评测指定 task_id（用于快速验证）")
    ap.add_argument("--limit", type=int, default=0, help="最多评测前 N 条任务（用于快速验证）")
    ap.add_argument("--out_prefix", default="llm", help="输出文件前缀（用于多评测器共存，例如 openai_gpt4v / gemini_flash）")
    args = ap.parse_args()

    # Load .env from repo root (preferred) or current working directory
    repo_root = Path(__file__).resolve().parents[2]
    load_dotenv(repo_root / ".env")
    load_dotenv()

    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("Missing OPENAI_API_KEY in environment.")

    client = OpenAI(api_key=api_key)
    run_dir = Path(args.run_dir)
    tasks = read_jsonl(Path(args.tasks))
    if args.task_id:
        tasks = [t for t in tasks if t.get("task_id") == args.task_id]
    if args.limit and args.limit > 0:
        tasks = tasks[: args.limit]
    system_prompt = load_text(Path(args.system_prompt))
    user_template = load_text(Path(args.user_prompt))

    summaries: list[dict[str, Any]] = []
    for task in tasks:
        task_id = task["task_id"]
        task_dir = run_dir / task_id
        if not task_dir.exists():
            summaries.append({"task_id": task_id, "passed": False, "reason": "missing_task_dir"})
            continue

        runs_path = task_dir / f"{args.out_prefix}_eval_runs.jsonl"
        if runs_path.exists():
            runs_path.unlink()

        trial_passes: list[int] = []
        trial_scores: list[float] = []
        trial_conf: list[float] = []
        failure_reasons: list[str] = []

        for t in range(args.trials):
            console.print(f"[cyan]LLM eval[/cyan] {task_id} trial {t+1}/{args.trials}")
            passed, payload = eval_one_trial(
                client=client,
                model=args.model,
                system_prompt=system_prompt,
                user_template=user_template,
                task=task,
                task_dir=task_dir,
                last_k=args.last_k,
                max_traj_lines=args.max_traj_lines,
            )
            out = {"task_id": task_id, "trial": t, "passed": passed, **payload}
            with runs_path.open("a", encoding="utf-8") as f:
                f.write(json.dumps(out, ensure_ascii=False) + "\n")

            if payload.get("ok") and isinstance(payload.get("raw"), dict):
                raw = payload["raw"]
                trial_passes.append(1 if raw.get("_normalized_passed", passed) else 0)
                if "score_0_1" in raw:
                    trial_scores.append(float(raw["score_0_1"]))
                if "confidence_0_1" in raw:
                    trial_conf.append(float(raw["confidence_0_1"]))
                fr = raw.get("failure_reasons_topk") or []
                if isinstance(fr, list):
                    for r in fr:
                        if isinstance(r, str) and r:
                            failure_reasons.append(r)

        # aggregate: majority vote + mean±std
        pass_rate = sum(trial_passes) / max(1, len(trial_passes))
        passed_final = pass_rate >= 0.5
        score_mu, score_sd = mean_std(trial_scores)
        conf_mu, conf_sd = mean_std(trial_conf)

        # top-K failure reasons (frequency)
        freq: dict[str, int] = {}
        for r in failure_reasons:
            freq[r] = freq.get(r, 0) + 1
        topk = [k for k, _ in sorted(freq.items(), key=lambda kv: (-kv[1], kv[0]))[:5]]

        result = {
            "task_id": task_id,
            "module": task.get("module"),
            "passed": passed_final,
            "consistency": pass_rate,  # agreement proxy
            "score_mean": score_mu,
            "score_std": score_sd,
            "confidence_mean": conf_mu,
            "confidence_std": conf_sd,
            "failure_reasons_topk": topk,
            "model": args.model,
            "trials": args.trials,
            "last_k": args.last_k,
        }
        write_json(task_dir / f"{args.out_prefix}_result.json", result)
        summaries.append(result)

    # run summary (LLM)
    by_module: dict[str, list[dict[str, Any]]] = {}
    for r in summaries:
        by_module.setdefault(r.get("module", "UNKNOWN"), []).append(r)
    module_rates = {
        mod: sum(1 for x in rs if x.get("passed")) / max(1, len(rs))
        for mod, rs in by_module.items()
    }
    overall = sum(1 for x in summaries if x.get("passed")) / max(1, len(summaries))
    write_json(run_dir / f"{args.out_prefix}_summary.json", {"overall": overall, "by_module": module_rates, "n": len(summaries)})
    console.print(f"[bold green]LLM summary[/bold green] overall={overall:.3f} tasks={len(summaries)}")


if __name__ == "__main__":
    main()


