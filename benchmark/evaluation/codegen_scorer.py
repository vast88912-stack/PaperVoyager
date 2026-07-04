from __future__ import annotations

import argparse
import json
import math
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from benchmark.generation.prompt_rulebook import PromptExpectations, load_prompt_expectations
from benchmark.lib.benchlib import ensure_dir, now_ms


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def clamp01(x: float) -> float:
    return 0.0 if x < 0.0 else 1.0 if x > 1.0 else x


def log_norm(x: float, lo: float, hi: float) -> float:
    """
    Map x in [lo, hi] to [0,1] in log space.
    """
    if x <= 0:
        return 0.0
    x = max(lo, min(hi, x))
    return clamp01((math.log(x) - math.log(lo)) / (math.log(hi) - math.log(lo)))


@dataclass(frozen=True)
class ModuleScore:
    module_id: str
    module_name: str
    score: float
    components: dict[str, float]
    dom_stats: dict[str, Any]
    metrics: dict[str, Any]
    errors: list[str]
    baseline: str | None


def score_module(probe: dict[str, Any]) -> ModuleScore:
    module_id = str(probe.get("module_id") or "")
    module_name = str(probe.get("module_name") or module_id)
    errors = list(probe.get("errors") or [])
    baseline = probe.get("baseline") or (probe.get("screens") or [None])[0]

    dom = probe.get("dom_stats_after") or probe.get("dom_stats") or {}
    metrics = probe.get("metrics") or {}
    health = probe.get("health") or {}

    button_count = int(dom.get("button_count") or 0)
    range_count = int(dom.get("range_count") or 0)
    canvas_count = int(dom.get("canvas_count") or 0)
    input_count = int(dom.get("input_count") or 0)
    select_count = int(dom.get("select_count") or 0)
    textarea_count = int(dom.get("textarea_count") or 0)

    dark = float(metrics.get("dark_ratio") or 0.0)
    uniq = float(metrics.get("unique_color_count") or 0.0)
    max_diff = float(metrics.get("max_diff_after_actions") or 0.0)
    nav_diff = float(metrics.get("nav_diff_vs_prev") or 0.0)

    # 40%: 模块存在性与导航可达（能切模块，且内容有变化）
    # Strict: higher nav_diff thresholds require genuine module-level content transitions.
    # Landing page keeps its reachable/distinct pass (nav_diff=0 is a measurement artifact,
    # not a content problem — there is no previous page to diff against).
    reachable = 1.0 if probe.get("clicked") is not None or module_id == "_landing" else 0.7
    distinct = 1.0 if (nav_diff >= 0.012 or module_id == "_landing") else (0.5 if nav_diff >= 0.004 else 0.15)
    nav_score = clamp01(0.55 * reachable + 0.45 * distinct)

    # 30%: 交互性（控件存在 + 交互有可观测变化）
    # element_presence grows with more controls
    elem_presence = 1.0 - math.exp(
        -(
            0.030 * min(button_count, 40)
            + 0.22 * min(range_count, 6)
            + 0.50 * min(canvas_count, 2)
            + 0.015 * min(input_count + select_count + textarea_count, 30)
        )
    )
    change_score = clamp01(max_diff / 0.070)  # raised: 7% pixels changed ~= "visible"
    interactivity_score = clamp01(0.45 * elem_presence + 0.55 * change_score)

    # 20%: 可视化复杂度/非空（颜色丰富 + 非纯黑/纯色）
    color_score = log_norm(uniq, lo=30, hi=2500)
    non_dark = clamp01(1.0 - max(0.0, (dark - 0.85) / 0.15))  # dark>0.85 starts to look like blank/black
    visual_score = clamp01(0.75 * color_score + 0.25 * non_dark)

    # 10%: 稳定性（不崩溃、不白屏）
    has_text = bool(health.get("has_text")) if "has_text" in health else True
    root_children = int(health.get("root_child_count") or 0) if "root_child_count" in health else 1
    fatal = (root_children == 0 and not has_text) or (dark >= 0.99) or (uniq <= 3)
    stability_score = 0.0 if fatal else 1.0
    if errors:
        stability_score = min(stability_score, 0.8)

    score = clamp01(0.40 * nav_score + 0.30 * interactivity_score + 0.20 * visual_score + 0.10 * stability_score)
    return ModuleScore(
        module_id=module_id,
        module_name=module_name,
        score=score,
        components={
            "nav": nav_score,
            "interactivity": interactivity_score,
            "visual": visual_score,
            "stability": stability_score,
            "elem_presence": float(elem_presence),
            "change": float(change_score),
        },
        dom_stats=dom,
        metrics=metrics,
        errors=errors,
        baseline=str(baseline) if baseline else None,
    )


def apply_prompt_adjustments(
    base_score: float,
    site_id: str,
    expectations: PromptExpectations,
    module_scores: list[ModuleScore],
    all_probes: list[dict[str, Any]],
) -> tuple[float, dict[str, Any]]:
    discovered_total = len(module_scores)
    # Default to 6 modules: all prompts specify a landing page + 5 interactive modules.
    # When the parser cannot extract a count, enforce the standard 6-module expectation.
    expected = expectations.expected_module_count if expectations.expected_module_count is not None else 6

    penalty = 0.0
    reasons: dict[str, Any] = {}

    # Module count expectation (strict): each missing module costs 8%, capped at 40%.
    if expected >= 3:
        short = max(0, expected - max(1, discovered_total))
        if short > 0:
            p = min(0.40, 0.08 * short)
            penalty += p
            reasons["module_count_shortfall"] = {"expected": expected, "discovered_total": discovered_total, "penalty": p}

    # Canvas requirement (raised penalty)
    total_canvas = 0
    for m in module_scores:
        total_canvas += int((m.dom_stats or {}).get("canvas_count") or 0)
    if expectations.requires_canvas and total_canvas == 0:
        p = 0.22
        penalty += p
        reasons["canvas_required_missing"] = {"penalty": p}

    # Inspector requirement: look for keywords in captured body text
    if expectations.requires_inspector:
        joined = "\n".join(str(p.get("body_text") or "") for p in all_probes)[:50000].lower()
        has_inspector = any(k in joined for k in ["inspector", "hyperparameters", "parameters", "settings", "loss log"])
        if not has_inspector:
            p = 0.10
            penalty += p
            reasons["inspector_required_missing"] = {"penalty": p}

    final = clamp01(base_score - penalty)
    reasons["base_score"] = base_score
    reasons["penalty_total"] = penalty
    reasons["final_score"] = final
    return final, reasons


def score_site_run(run_dir: Path, site_id: str, prompts_dir: Path) -> dict[str, Any]:
    modules_dir = run_dir / "modules"
    module_probe_paths = sorted(modules_dir.glob("*/module_probe.json"))
    probes: list[dict[str, Any]] = []
    for p in module_probe_paths:
        try:
            probes.append(load_json(p))
        except Exception:
            continue

    module_scores = [score_module(pr) for pr in probes]
    # Prefer stable ordering: landing first then others
    module_scores.sort(key=lambda m: (0 if m.module_id == "_landing" else 1, m.module_name.lower()))

    base = sum(m.score for m in module_scores) / len(module_scores) if module_scores else 0.0
    expectations = load_prompt_expectations(site_id, prompts_dir)
    final, adj = apply_prompt_adjustments(base, site_id, expectations, module_scores, probes)

    out = {
        "site_id": site_id,
        "run_dir": str(run_dir),
        "ts_ms": now_ms(),
        "weights": {"nav": 0.40, "interactivity": 0.30, "visual": 0.20, "stability": 0.10},
        "base_score": base,
        "final_score": final,
        "prompt_expectations": asdict(expectations),
        "adjustments": adj,
        "modules": [asdict(m) for m in module_scores],
    }
    return out


def write_table(site_scores: list[dict[str, Any]], out_path: Path, *, llm_missing_zero: bool) -> None:
    site_ids = [s["site_id"] for s in site_scores]
    header = ["Metric"] + site_ids + ["Overall"]
    lines = ["| " + " | ".join(header) + " |", "| " + " | ".join(["---"] * len(header)) + " |"]

    def row(name: str, key: str) -> None:
        vals = []
        cells = [name]
        for s in site_scores:
            v = float(s.get(key) or 0.0)
            vals.append(v)
            cells.append(f"{v*100:.1f}%")
        overall = (sum(vals) / len(vals)) if vals else 0.0
        cells.append(f"{overall*100:.1f}%")
        lines.append("| " + " | ".join(cells) + " |")

    row("codegen_final", "final_score")
    row("codegen_base", "base_score")

    # Optional LLM judge rows (WebVoyager-style auto eval on probe evidence)
    def row_llm(name: str, key: str) -> None:
        vals = []
        cells = [name]
        for s in site_scores:
            if key not in s:
                if llm_missing_zero:
                    v = 0.0
                    vals.append(v)
                    cells.append(f"{v*100:.1f}%")
                else:
                    cells.append("NA")
                continue
            try:
                v = float(s.get(key) or 0.0)
            except Exception:
                v = 0.0
            vals.append(v)
            cells.append(f"{v*100:.1f}%")
        overall = (sum(vals) / len(vals)) if vals else 0.0
        cells.append(f"{overall*100:.1f}%" if vals else ("0.0%" if llm_missing_zero else "NA"))
        lines.append("| " + " | ".join(cells) + " |")

    row_llm("openai_vlm", "openai_vlm_score_mean")
    row_llm("gemini_vlm", "gemini_vlm_score_mean")

    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--websites", required=True, help="benchmark/inputs/websites/tsx_20.json")
    ap.add_argument("--results_root", required=True, help="benchmark/results root")
    ap.add_argument("--run_id", default="run_001")
    ap.add_argument("--prompts_dir", default=str(Path(__file__).parents[2] / "prompts"))
    ap.add_argument("--out_table", default=str(Path(__file__).parents[1] / "generated" / "codegen_score_table.md"))
    ap.add_argument("--only_site", default="", help="score only one site_id (exact match)")
    ap.add_argument("--openai_site_prefix", default="openai_gpt4v", help="prefix for <prefix>_site_result.json")
    ap.add_argument("--gemini_site_prefix", default="gemini_flash", help="prefix for <prefix>_site_result.json")
    ap.add_argument(
        "--llm_missing_zero",
        action="store_true",
        help="Treat missing LLM judge scores as 0.0%% instead of NA (useful when build/probe failed sites should count as 0).",
    )
    args = ap.parse_args()

    websites = load_json(Path(args.websites))["websites"]
    if args.only_site:
        websites = [w for w in websites if w.get("id") == args.only_site]
    results_root = Path(args.results_root)
    prompts_dir = Path(args.prompts_dir)
    out_table = Path(args.out_table)
    ensure_dir(out_table.parent)

    all_scores: list[dict[str, Any]] = []
    for w in websites:
        sid = w["id"]
        run_dir = results_root / "codegen_score_v1" / sid / args.run_id
        if not run_dir.exists():
            # still produce a placeholder score
            sc = {
                "site_id": sid,
                "run_dir": str(run_dir),
                "ts_ms": now_ms(),
                "base_score": 0.0,
                "final_score": 0.0,
                "error": "missing_run_dir",
            }
            all_scores.append(sc)
            continue
        sc = score_site_run(run_dir, site_id=sid, prompts_dir=prompts_dir)
        # per-site output required by spec
        (run_dir / "site_score.json").write_text(json.dumps(sc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        # Attach optional LLM judge scores if present
        openai_p = run_dir / f"{args.openai_site_prefix}_site_result.json"
        if openai_p.exists():
            try:
                r = load_json(openai_p)
                sc["openai_vlm_score_mean"] = float(r.get("score_mean", 0.0) or 0.0)
            except Exception:
                pass
        gemini_p = run_dir / f"{args.gemini_site_prefix}_site_result.json"
        if gemini_p.exists():
            try:
                r = load_json(gemini_p)
                sc["gemini_vlm_score_mean"] = float(r.get("score_mean", 0.0) or 0.0)
            except Exception:
                pass

        all_scores.append(sc)

    write_table(all_scores, out_table, llm_missing_zero=bool(args.llm_missing_zero))
    print("DONE. Table at:", out_table)


if __name__ == "__main__":
    main()


