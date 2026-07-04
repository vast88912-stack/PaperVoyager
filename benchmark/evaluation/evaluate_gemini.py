from __future__ import annotations

import argparse
import base64
import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types
from rich.console import Console

from benchmark.lib.benchlib import mean_std, read_jsonl, write_json


console = Console()


def load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def b64_png(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("ascii")


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


def gemini_generate_json(client: genai.Client, model: str, system_prompt: str, user_prompt: str, images: list[Path]) -> dict[str, Any]:
    parts: list[types.Part] = [types.Part(text=user_prompt)]
    for img in images:
        parts.append(
            types.Part(
                inline_data=types.Blob(
                    mime_type="image/png",
                    data=base64.b64decode(b64_png(img).encode("ascii")),
                )
            )
        )
    resp = client.models.generate_content(
        model=model,
        contents=[types.Content(role="user", parts=parts)],
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            temperature=0.0,
        ),
    )
    text = (resp.text or "").strip()
    return json.loads(text or "{}")


def normalize_min_schema(raw: dict[str, Any], task_id: str, task_dir: Path, images_count: int, used_last_k: int, traj: str, obs: dict[str, Any]) -> dict[str, Any]:
    # Same normalization philosophy as evaluate_llm.py
    if "task_id" not in raw:
        raw["task_id"] = task_id
    if "confidence_0_1" not in raw:
        raw["confidence_0_1"] = 0.5
    if "score_0_1" not in raw:
        raw["score_0_1"] = 1.0 if bool(raw.get("passed")) else 0.0
    if "failure_reasons_topk" not in raw or not isinstance(raw.get("failure_reasons_topk"), list):
        raw["failure_reasons_topk"] = []
    if "rubric" not in raw or not isinstance(raw.get("rubric"), dict):
        s = float(raw.get("score_0_1", 0.0) or 0.0)
        raw["rubric"] = {"outcome": s, "evidence": float(raw.get("confidence_0_1", 0.5)), "trajectory": 0.6, "ux_clarity": 0.6}
    if "evidence_used" not in raw or not isinstance(raw.get("evidence_used"), dict):
        raw["evidence_used"] = {
            "screenshots_count": images_count,
            "used_last_k": used_last_k,
            "used_traj": bool(traj.strip()),
            "used_text_obs": bool((obs.get("body_text") or "").strip()),
        }
    return raw


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run_dir", required=True)
    ap.add_argument("--tasks", required=True)
    ap.add_argument("--model", default="gemini-3.0-flash")
    ap.add_argument("--trials", type=int, default=1)
    ap.add_argument("--last_k", type=int, default=8)
    ap.add_argument("--max_traj_lines", type=int, default=240)
    ap.add_argument("--system_prompt", default=str(Path(__file__).parent / "prompts" / "system_eval_v1.txt"))
    ap.add_argument("--user_prompt", default=str(Path(__file__).parent / "prompts" / "user_eval_v1.md"))
    ap.add_argument("--out_prefix", default="gemini_flash")
    args = ap.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    load_dotenv(repo_root / ".env")
    load_dotenv()

    api_key = (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "").strip()
    if not api_key:
        raise SystemExit("Missing GEMINI_API_KEY (or GOOGLE_API_KEY) in environment.")

    client = genai.Client(api_key=api_key)
    run_dir = Path(args.run_dir)
    tasks = read_jsonl(Path(args.tasks))
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

        obs = load_json(task_dir / "obs.json") if (task_dir / "obs.json").exists() else {}
        traj = read_traj_snippet(task_dir, max_lines=args.max_traj_lines)
        images = last_k_screens(task_dir, args.last_k)
        user_prompt = render_user_prompt(user_template, task, obs, traj, last_k=len(images))

        for t in range(args.trials):
            console.print(f"[magenta]Gemini eval[/magenta] {task_id} trial {t+1}/{args.trials}")
            raw = gemini_generate_json(client, model=args.model, system_prompt=system_prompt, user_prompt=user_prompt, images=images)
            raw = normalize_min_schema(raw, task_id=task_id, task_dir=task_dir, images_count=len(images), used_last_k=len(images), traj=traj, obs=obs)
            # normalize pass
            passed = bool(float(raw.get("score_0_1", 0.0)) >= 0.5 and float((raw.get("rubric") or {}).get("outcome", 0.0)) >= 0.5)
            raw["_normalized_passed"] = passed

            out = {"task_id": task_id, "trial": t, "passed": passed, "ok": True, "raw": raw}
            with runs_path.open("a", encoding="utf-8") as f:
                f.write(json.dumps(out, ensure_ascii=False) + "\n")

            trial_passes.append(1 if passed else 0)
            trial_scores.append(float(raw.get("score_0_1", 0.0) or 0.0))
            trial_conf.append(float(raw.get("confidence_0_1", 0.0) or 0.0))
            fr = raw.get("failure_reasons_topk") or []
            if isinstance(fr, list):
                for r in fr:
                    if isinstance(r, str) and r:
                        failure_reasons.append(r)

        pass_rate = sum(trial_passes) / max(1, len(trial_passes))
        passed_final = pass_rate >= 0.5
        score_mu, score_sd = mean_std(trial_scores)
        conf_mu, conf_sd = mean_std(trial_conf)
        freq: dict[str, int] = {}
        for r in failure_reasons:
            freq[r] = freq.get(r, 0) + 1
        topk = [k for k, _ in sorted(freq.items(), key=lambda kv: (-kv[1], kv[0]))[:5]]

        result = {
            "task_id": task_id,
            "module": task.get("module"),
            "passed": passed_final,
            "consistency": pass_rate,
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

    by_module: dict[str, list[dict[str, Any]]] = {}
    for r in summaries:
        by_module.setdefault(r.get("module", "UNKNOWN"), []).append(r)
    module_rates = {mod: sum(1 for x in rs if x.get("passed")) / max(1, len(rs)) for mod, rs in by_module.items()}
    overall = sum(1 for x in summaries if x.get("passed")) / max(1, len(summaries))
    write_json(run_dir / f"{args.out_prefix}_summary.json", {"overall": overall, "by_module": module_rates, "n": len(summaries)})
    console.print(f"[bold green]Gemini summary[/bold green] overall={overall:.3f} tasks={len(summaries)}")


if __name__ == "__main__":
    main()






