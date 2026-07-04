from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from rich.console import Console

from benchlib import dark_ratio, image_diff_ratio, read_jsonl, unique_color_count, write_json


console = Console()


def load_json(path: Path) -> dict[str, Any]:
    import json
    return json.loads(path.read_text(encoding="utf-8"))


def get_screens(task_dir: Path) -> list[Path]:
    screens = sorted((task_dir / "screens").glob("step_*.png"))
    return screens


def eval_task(task: dict[str, Any], task_dir: Path) -> dict[str, Any]:
    judge = task.get("judge", {})
    jtype = judge.get("type", "")
    obs_path = task_dir / "obs.json"
    obs = load_json(obs_path) if obs_path.exists() else {}
    body_text: str = obs.get("body_text", "") or ""
    hud: dict[str, Any] = obs.get("hud", {}) or {}
    screens = get_screens(task_dir)

    passed = False
    details: dict[str, Any] = {}
    reason = ""

    def need(n: int) -> bool:
        return len(screens) >= n

    if jtype == "nav_cycle":
        expected = judge.get("expected_titles", [])
        # We infer titles from traj if present; otherwise use final title only.
        traj = (task_dir / "traj.jsonl")
        titles = []
        if traj.exists():
            for line in traj.read_text(encoding="utf-8").splitlines():
                if '"title"' in line:
                    try:
                        import json
                        titles.append(json.loads(line).get("title"))
                    except Exception:
                        pass
        titles = [t for t in titles if t]
        passed = all(any(exp in t for t in titles) for exp in expected)
        details = {"seen_titles": titles[-20:], "expected_titles": expected}
        if not passed:
            reason = "not_all_titles_seen"

    elif jtype in {"visual_change_after_pan", "visual_change_after_zoom", "hover_visual_change"}:
        if not need(2):
            passed = False
            reason = "insufficient_screens"
        else:
            a, b = screens[0], screens[-1]
            diff = image_diff_ratio(a, b)
            thr = float(judge.get("min_diff_ratio", 0.02))
            passed = diff >= thr
            details = {"diff_ratio": diff, "threshold": thr}
            if not passed:
                reason = "diff_below_threshold"

    elif jtype == "page_text_absence":
        forbidden = judge.get("forbidden", [])
        hits = [w for w in forbidden if w in body_text]
        passed = len(hits) == 0
        details = {"forbidden": forbidden, "hits": hits}
        if not passed:
            reason = "forbidden_text_found"

    elif jtype == "text_presence":
        required = judge.get("required", [])
        missing = [w for w in required if w not in body_text]
        passed = len(missing) == 0
        details = {"required": required, "missing": missing}
        if not passed:
            reason = "missing_required_text"

    elif jtype == "click_and_expect_title":
        expected_title = judge.get("expected_title", "")
        final_title = obs.get("final_title", "")
        passed = expected_title in (final_title or "")
        details = {"expected_title": expected_title, "final_title": final_title}
        if not passed:
            reason = "title_mismatch"

    elif jtype == "canvas_not_uniform":
        if not need(1):
            passed = False
            reason = "no_screens"
        else:
            n = unique_color_count(screens[-1])
            thr = int(judge.get("min_unique_colors", 32))
            passed = n >= thr
            details = {"unique_colors": n, "threshold": thr}
            if not passed:
                reason = "canvas_too_uniform"

    elif jtype == "multi_click_visual_changes":
        # Expect consecutive screenshots to differ
        if len(screens) < 3:
            passed = False
            reason = "insufficient_screens"
        else:
            diffs = [image_diff_ratio(screens[i], screens[i + 1]) for i in range(len(screens) - 1)]
            thr = float(judge.get("pairwise_min_diff_ratio", 0.02))
            passed = all(d >= thr for d in diffs[1:])  # ignore baseline->first if needed
            details = {"pairwise_diffs": diffs, "threshold": thr}
            if not passed:
                reason = "pairwise_diff_below_threshold"

    elif jtype == "pan_zoom_stability":
        if not need(1):
            passed = False
            reason = "no_screens"
        else:
            # Ensure not mostly black (rendered)
            dr = dark_ratio(screens[-1])
            min_non_black = float(judge.get("min_non_black_ratio", 0.15))
            non_black = 1.0 - dr
            passed = non_black >= min_non_black
            details = {"dark_ratio": dr, "non_black_ratio": non_black, "threshold_non_black": min_non_black}
            if not passed:
                reason = "render_mostly_black"

    elif jtype == "play_causes_visual_change_and_toggle":
        # We check both: visual change + button text toggled exists in body text
        ok_visual = False
        if len(screens) >= 2:
            diff = image_diff_ratio(screens[0], screens[-1])
            ok_visual = diff >= float(judge.get("min_diff_ratio", 0.02))
            details["diff_ratio"] = diff
        play_text = judge.get("play_text", "Descend")
        pause_text = judge.get("pause_text", "Pause")
        ok_text = (play_text in body_text) or (pause_text in body_text)
        passed = ok_visual and ok_text
        details.update({"ok_visual": ok_visual, "ok_text": ok_text, "play_text": play_text, "pause_text": pause_text})
        if not passed:
            reason = "play_not_effective"

    elif jtype == "numeric_text_changes":
        label = judge.get("label_contains", "")
        # We rely on HUD extraction in obs; if present, check min_delta against stored numeric
        min_delta = float(judge.get("min_delta", 0.05))
        # We can't reliably get before/after without structured logging; use presence only here.
        passed = label in body_text and (("0." in body_text) or ("1." in body_text))
        details = {"label": label, "min_delta": min_delta, "note": "建议用 LLM/VLM 或更结构化日志做数值前后对比"}
        if not passed:
            reason = "numeric_label_missing"

    elif jtype in {"lr_regime_difference", "momentum_regime_difference", "two_runs_end_state_diff"}:
        # We approximate by requiring that the run produced multiple screenshots with at least one big change.
        if len(screens) < 4:
            passed = False
            reason = "insufficient_screens"
        else:
            diffs = [image_diff_ratio(screens[i], screens[i + 1]) for i in range(len(screens) - 1)]
            thr = float(judge.get("min_behavior_diff_ratio", judge.get("min_end_diff_ratio", 0.01)))
            passed = max(diffs) >= thr
            details = {"max_step_diff": max(diffs), "threshold": thr, "diffs": diffs}
            if not passed:
                reason = "behavior_diff_too_small"

    elif jtype == "two_clicks_change_start":
        if len(screens) < 3:
            passed = False
            reason = "insufficient_screens"
        else:
            d1 = image_diff_ratio(screens[0], screens[1])
            d2 = image_diff_ratio(screens[1], screens[2])
            thr = float(judge.get("min_diff_ratio", 0.02))
            passed = (d1 >= thr) and (d2 >= thr)
            details = {"diff_01": d1, "diff_12": d2, "threshold": thr}
            if not passed:
                reason = "click_not_changing_view"

    elif jtype == "pan_zoom_then_click_works":
        if len(screens) < 4:
            passed = False
            reason = "insufficient_screens"
        else:
            thr = float(judge.get("min_diff_ratio", 0.02))
            diffs = [image_diff_ratio(screens[i], screens[i + 1]) for i in range(len(screens) - 1)]
            passed = all(d >= thr for d in diffs)
            details = {"diffs": diffs, "threshold": thr}
            if not passed:
                reason = "one_step_diff_below_threshold"

    elif jtype == "dark_ratio_threshold":
        if not need(1):
            passed = False
            reason = "no_screens"
        else:
            dr = dark_ratio(screens[-1])
            thr = float(judge.get("min_dark_ratio", 0.5))
            passed = dr >= thr
            details = {"dark_ratio": dr, "threshold": thr}
            if not passed:
                reason = "fog_not_detected"

    elif jtype == "steps_increases_after_key":
        # Use HUD extraction if present; fallback to diff
        inc = hud.get("steps")
        passed = (inc is not None) and (inc >= 1)
        details = {"steps": inc}
        if not passed:
            # fallback: any visual change
            if len(screens) >= 2:
                passed = image_diff_ratio(screens[0], screens[-1]) >= 0.01
                details["fallback_visual"] = True
        if not passed:
            reason = "steps_not_detected"

    elif jtype == "steps_increases_after_ui_click":
        inc = hud.get("steps")
        passed = (inc is not None) and (inc >= 1)
        details = {"steps": inc}
        if not passed:
            reason = "steps_not_detected"

    elif jtype == "module_pan":
        if len(screens) < 2:
            passed = False
            reason = "insufficient_screens"
        else:
            diff = image_diff_ratio(screens[0], screens[-1])
            thr = float(judge.get("min_diff_ratio", 0.02))
            passed = diff >= thr
            details = {"diff_ratio": diff, "threshold": thr}
            if not passed:
                reason = "diff_below_threshold"

    elif jtype == "module_zoom_stability":
        if not screens:
            passed = False
            reason = "no_screens"
        else:
            dr = dark_ratio(screens[-1])
            min_non_black = float(judge.get("min_non_black_ratio", 0.1))
            non_black = 1.0 - dr
            passed = non_black >= min_non_black
            details = {"dark_ratio": dr, "non_black_ratio": non_black, "threshold_non_black": min_non_black}
            if not passed:
                reason = "render_mostly_black"

    elif jtype in {"pan_then_hover_diff", "zoom_then_hover_diff"}:
        if len(screens) < 3:
            passed = False
            reason = "insufficient_screens"
        else:
            # require hover step changes vs pre-hover
            diff = image_diff_ratio(screens[-2], screens[-1])
            thr = float(judge.get("min_diff_ratio", 0.01))
            passed = diff >= thr
            details = {"diff_ratio": diff, "threshold": thr}
            if not passed:
                reason = "hover_no_visual_change"

    elif jtype == "pause_reduces_motion":
        if len(screens) < 3:
            passed = False
            reason = "insufficient_screens"
        else:
            # Compare pause shot vs paused later shot
            diff = image_diff_ratio(screens[-2], screens[-1])
            thr = float(judge.get("max_diff_ratio", 0.01))
            passed = diff <= thr
            details = {"diff_ratio": diff, "max_allowed": thr}
            if not passed:
                reason = "still_moving_after_pause"

    elif jtype == "switch_then_run_diff":
        if len(screens) < 4:
            passed = False
            reason = "insufficient_screens"
        else:
            diffs = [image_diff_ratio(screens[i], screens[i + 1]) for i in range(len(screens) - 1)]
            thr = float(judge.get("min_behavior_diff_ratio", 0.02))
            passed = max(diffs) >= thr
            details = {"max_diff": max(diffs), "threshold": thr, "diffs": diffs}
            if not passed:
                reason = "behavior_diff_too_small"

    elif jtype == "click_then_run_changes":
        if len(screens) < 3:
            passed = False
            reason = "insufficient_screens"
        else:
            diff = image_diff_ratio(screens[0], screens[-1])
            thr = float(judge.get("min_diff_ratio", 0.02))
            passed = diff >= thr
            details = {"diff_ratio": diff, "threshold": thr}
            if not passed:
                reason = "no_path_after_run"

    elif jtype == "lr_change_affects_run":
        if len(screens) < 4:
            passed = False
            reason = "insufficient_screens"
        else:
            diffs = [image_diff_ratio(screens[i], screens[i + 1]) for i in range(len(screens) - 1)]
            thr = float(judge.get("min_behavior_diff_ratio", 0.02))
            passed = max(diffs) >= thr
            details = {"max_diff": max(diffs), "threshold": thr}
            if not passed:
                reason = "lr_change_no_effect"

    elif jtype == "reset_changes_hud":
        # Use body_text: should still contain HUD; steps should reset to small
        steps = hud.get("steps")
        passed = steps is None or steps <= 2
        details = {"steps": steps, "note": "若 Steps 未解析到，建议用更结构化 DOM 提取"}
        if not passed:
            reason = "steps_not_reset"

    elif jtype == "move_causes_visual_change":
        if len(screens) < 2:
            passed = False
            reason = "insufficient_screens"
        else:
            diff = image_diff_ratio(screens[0], screens[-1])
            thr = float(judge.get("min_diff_ratio", 0.01))
            passed = diff >= thr
            details = {"diff_ratio": diff, "threshold": thr}
            if not passed:
                reason = "move_no_visual_change"

    elif jtype == "min_button_count":
        n = int(obs.get("button_count", 0) or 0)
        thr = int(judge.get("min", 3))
        passed = n >= thr
        details = {"button_count": n, "threshold": thr}
        if not passed:
            reason = "not_enough_buttons"

    elif jtype == "nav_flip_flop":
        # Verify we saw both titles at least once
        expected = judge.get("titles", [])
        traj = (task_dir / "traj.jsonl")
        titles = []
        if traj.exists():
            for line in traj.read_text(encoding="utf-8").splitlines():
                if '"title"' in line:
                    try:
                        import json
                        titles.append(json.loads(line).get("title"))
                    except Exception:
                        pass
        titles = [t for t in titles if t]
        passed = all(any(exp in t for t in titles) for exp in expected)
        details = {"expected": expected, "seen_titles": titles[-30:]}
        if not passed:
            reason = "missing_title_during_flipflop"

    elif jtype == "reach_victory_modal":
        required_text = judge.get("required_text", "Minimum Found")
        passed = required_text in body_text
        details = {"required_text": required_text, "found": passed}
        if not passed:
            reason = "victory_not_reached"

    elif jtype == "still_interactive_after_stress":
        required_any = judge.get("required_text_any", [])
        passed = any(t in body_text for t in required_any)
        details = {"required_any": required_any}
        if not passed:
            reason = "not_interactive"

    else:
        passed = False
        reason = f"unknown_judge_type:{jtype}"
        details = {"known_types": True}

    return {
        "task_id": task["task_id"],
        "module": task.get("module"),
        "judge_type": jtype,
        "passed": passed,
        "reason": reason,
        "details": details,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run_dir", required=True, help="e.g. results/scripted_oracle/run_001")
    ap.add_argument("--tasks", required=True, help="tasks jsonl")
    args = ap.parse_args()

    run_dir = Path(args.run_dir)
    tasks = read_jsonl(Path(args.tasks))

    summaries: list[dict[str, Any]] = []
    for task in tasks:
        task_id = task["task_id"]
        task_dir = run_dir / task_id
        if not task_dir.exists():
            console.print(f"[yellow]Missing task dir[/yellow]: {task_id}")
            summaries.append({"task_id": task_id, "passed": False, "reason": "missing_task_dir"})
            continue
        res = eval_task(task, task_dir)
        write_json(task_dir / "result.json", res)
        summaries.append(res)

    # run summary
    by_module: dict[str, list[dict[str, Any]]] = {}
    for r in summaries:
        by_module.setdefault(r.get("module", "UNKNOWN"), []).append(r)
    module_rates = {
        mod: sum(1 for x in rs if x.get("passed")) / max(1, len(rs))
        for mod, rs in by_module.items()
    }
    overall = sum(1 for x in summaries if x.get("passed")) / max(1, len(summaries))
    write_json(run_dir / "summary.json", {"overall": overall, "by_module": module_rates, "n": len(summaries)})
    console.print(f"[bold green]Done[/bold green]. overall={overall:.3f} tasks={len(summaries)}")


if __name__ == "__main__":
    main()


