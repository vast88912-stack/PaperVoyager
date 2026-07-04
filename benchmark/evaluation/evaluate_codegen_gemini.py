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

from benchmark.lib.benchlib import mean_std, write_json
from benchmark.lib.json_extract import coerce_json_object, extract_first_json_value


console = Console()


def load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def b64_png(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("ascii")


def module_images(module_dir: Path, k: int) -> list[Path]:
    screens_dir = module_dir / "screens"
    if not screens_dir.exists():
        return []
    prefer = ["step_000.png", "after_slider.png", "after_play_wait.png", "after_button_clicks.png", "after_pan.png", "after_zoom.png"]
    picked: list[Path] = []
    for name in prefer:
        p = screens_dir / name
        if p.exists():
            picked.append(p)
    if picked:
        return picked[:k] if k > 0 else []
    allp = sorted(screens_dir.glob("*.png"))
    return allp[-k:] if k > 0 else []


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
    parsed = extract_first_json_value((resp.text or "").strip())
    return coerce_json_object(parsed)


def normalize_min_schema(raw: Any, site_id: str) -> dict[str, Any]:
    raw = coerce_json_object(raw)
    if "site_id" not in raw:
        raw["site_id"] = site_id
    if "confidence_0_1" not in raw:
        raw["confidence_0_1"] = 0.5
    if "score_0_1" not in raw:
        raw["score_0_1"] = 1.0 if bool(raw.get("passed")) else 0.0
    if "failure_reasons_topk" not in raw or not isinstance(raw.get("failure_reasons_topk"), list):
        raw["failure_reasons_topk"] = []
    if "rubric" not in raw or not isinstance(raw.get("rubric"), dict):
        s = float(raw.get("score_0_1", 0.0) or 0.0)
        raw["rubric"] = {
            "spec_adherence": s,
            "module_navigation": s,
            "interactivity": s,
            "visual_quality": s,
            "stability": s,
        }
    if "modules" not in raw or not isinstance(raw.get("modules"), list):
        raw["modules"] = []
    # normalize pass
    passed = bool(float(raw.get("score_0_1", 0.0) or 0.0) >= 0.5 and float((raw.get("rubric") or {}).get("spec_adherence", 0.0) or 0.0) >= 0.5)
    raw["_normalized_passed"] = passed
    return raw


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run_dir", required=True)
    ap.add_argument("--site_id", required=True)
    ap.add_argument("--prompts_dir", required=True)
    ap.add_argument("--model", default="gemini-3-pro-preview")
    ap.add_argument("--trials", type=int, default=1)
    ap.add_argument("--last_k_per_module", type=int, default=4)
    ap.add_argument("--system_prompt", default=str(Path(__file__).parent / "prompts" / "system_codegen_eval_v1.txt"))
    ap.add_argument("--user_prompt", default=str(Path(__file__).parent / "prompts" / "user_codegen_eval_v1.md"))
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
    site_id = args.site_id
    prompts_dir = Path(args.prompts_dir)
    prompt_path = prompts_dir / f"{site_id}.txt"
    prompt_spec_text = prompt_path.read_text(encoding="utf-8") if prompt_path.exists() else ""

    site_probe_path = run_dir / "site_probe.json"
    site_probe = load_json(site_probe_path) if site_probe_path.exists() else {}

    modules_dir = run_dir / "modules"
    module_probe_paths = sorted(modules_dir.glob("*/module_probe.json")) if modules_dir.exists() else []
    module_probes: list[dict[str, Any]] = []
    images_flat: list[Path] = []
    # Gemini API doesn't support interleaving text separators per image as conveniently; we embed grouping markers into user text.
    grouping_lines: list[str] = []
    for p in module_probe_paths:
        try:
            pr = load_json(p)
        except Exception:
            continue
        module_probes.append(pr)
        module_dir = p.parent
        name = str(pr.get("module_name") or module_dir.name)
        mid = str(pr.get("module_id") or module_dir.name)
        imgs = module_images(module_dir, k=args.last_k_per_module)
        grouping_lines.append(f"- MODULE {mid}: {name} images={len(imgs)} (in order next)")
        images_flat.extend(imgs)

    packed = json.dumps(module_probes, ensure_ascii=False)
    if len(packed) > 120_000:
        packed = packed[:120_000] + "...TRUNCATED..."

    system_prompt = load_text(Path(args.system_prompt))
    user_template = load_text(Path(args.user_prompt))
    user_prompt = (
        user_template.replace("{{SITE_ID}}", site_id)
        .replace("{{PROMPT_SPEC_TEXT}}", prompt_spec_text[:120_000])
        .replace("{{SITE_PROBE_JSON}}", json.dumps(site_probe, ensure_ascii=False)[:80_000])
        .replace("{{MODULE_PROBES_JSON}}", packed)
        + "\n\n### Image Grouping (important)\n"
        + "\n".join(grouping_lines)
        + "\n"
    )

    # Normalize model name for v1beta: accept both "gemini-xxx" and "models/gemini-xxx"
    model_name = args.model.strip()
    if model_name and not model_name.startswith("models/"):
        model_name = f"models/{model_name}"

    runs_path = run_dir / f"{args.out_prefix}_eval_runs.jsonl"
    if runs_path.exists():
        runs_path.unlink()

    trial_passes: list[int] = []
    trial_scores: list[float] = []
    trial_conf: list[float] = []
    failure_reasons: list[str] = []

    for t in range(args.trials):
        console.print(f"[magenta]Codegen Gemini eval[/magenta] {site_id} trial {t+1}/{args.trials}")
        raw = gemini_generate_json(client, model=model_name, system_prompt=system_prompt, user_prompt=user_prompt, images=images_flat)
        raw = normalize_min_schema(raw, site_id=site_id)
        passed = bool(raw.get("_normalized_passed"))
        out = {"site_id": site_id, "trial": t, "passed": passed, "ok": True, "raw": raw}
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

    site_result = {
        "site_id": site_id,
        "passed": passed_final,
        "consistency": pass_rate,
        "score_mean": score_mu,
        "score_std": score_sd,
        "confidence_mean": conf_mu,
        "confidence_std": conf_sd,
        "failure_reasons_topk": topk,
        "model": args.model,
        "trials": args.trials,
        "last_k_per_module": args.last_k_per_module,
    }
    write_json(run_dir / f"{args.out_prefix}_site_result.json", site_result)
    console.print(f"[bold green]Codegen Gemini site[/bold green] score_mean={score_mu:.3f} passed={passed_final}")


if __name__ == "__main__":
    main()


