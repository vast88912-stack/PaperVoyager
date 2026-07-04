from __future__ import annotations

import argparse
import json
import os
import random
import re
import time
from pathlib import Path
from typing import Any

from playwright.sync_api import Page, sync_playwright
from rich.console import Console

from benchlib import append_jsonl, ensure_dir, now_ms, read_jsonl, write_json


console = Console()


def safe_sleep(ms: int) -> None:
    time.sleep(ms / 1000.0)


def body_inner_text(page: Page, limit: int = 50000) -> str:
    txt = page.evaluate("() => document.body ? document.body.innerText : ''") or ""
    txt = re.sub(r"\s+\n", "\n", txt).strip()
    return txt[:limit]


def get_header_title(page: Page) -> str:
    # Prefer header h2 if present; fallback to document.title
    loc = page.locator("header h2").first
    if loc.count() > 0:
        try:
            return (loc.inner_text() or "").strip()
        except Exception:
            pass
    try:
        return (page.title() or "").strip()
    except Exception:
        return ""


def click_sidebar_module(page: Page, module_title: str) -> None:
    # Sidebar buttons include module.title text
    page.get_by_role("button", name=module_title).first.click(timeout=10_000)
    safe_sleep(250)


def screenshot_step(page: Page, screens_dir: Path, step_idx: int) -> Path:
    path = screens_dir / f"step_{step_idx:03d}.png"
    page.screenshot(path=str(path), full_page=True)
    return path


def drag_pan_on_canvas(page: Page, dx: int = 180, dy: int = 120) -> None:
    canvas = page.locator("canvas").first
    box = canvas.bounding_box()
    if not box:
        raise RuntimeError("Canvas not found for pan.")
    sx = box["x"] + box["width"] * 0.5
    sy = box["y"] + box["height"] * 0.5
    page.mouse.move(sx, sy)
    page.mouse.down()
    page.mouse.move(sx + dx, sy + dy, steps=15)
    page.mouse.up()
    safe_sleep(200)


def wheel_zoom_on_canvas(page: Page, delta_y: int = -500) -> None:
    canvas = page.locator("canvas").first
    box = canvas.bounding_box()
    if not box:
        raise RuntimeError("Canvas not found for zoom.")
    cx = box["x"] + box["width"] * 0.5
    cy = box["y"] + box["height"] * 0.5
    page.mouse.move(cx, cy)
    page.mouse.wheel(0, delta_y)
    safe_sleep(250)


def hover_on_canvas(page: Page, x_ratio: float, y_ratio: float) -> None:
    canvas = page.locator("canvas").first
    box = canvas.bounding_box()
    if not box:
        raise RuntimeError("Canvas not found for hover.")
    x = box["x"] + box["width"] * x_ratio
    y = box["y"] + box["height"] * y_ratio
    page.mouse.move(x, y)
    safe_sleep(150)


def click_canvas(page: Page, x_ratio: float, y_ratio: float) -> None:
    canvas = page.locator("canvas").first
    box = canvas.bounding_box()
    if not box:
        raise RuntimeError("Canvas not found for click.")
    x = box["x"] + box["width"] * x_ratio
    y = box["y"] + box["height"] * y_ratio
    page.mouse.click(x, y)
    safe_sleep(200)


def set_slider_by_label(page: Page, label_contains: str, target_value: float) -> None:
    # Robustly find a range input near the label, then set its value via JS + dispatch input/change.
    label = page.locator(f"text={label_contains}").first
    slider = None
    # climb up a few ancestors to find an input[type=range]
    for k in range(1, 5):
        cand = label.locator(f"xpath=ancestor::div[{k}]").locator("input[type=range]").first
        if cand.count() > 0:
            slider = cand
            break
    if slider is None:
        slider = page.locator("input[type=range]").first
    page.evaluate(
        """([el, val]) => {
            el.value = String(val);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }""",
        [slider, target_value],
    )
    safe_sleep(250)


def click_button_by_text(page: Page, text: str) -> None:
    page.get_by_role("button", name=re.compile(re.escape(text))).first.click(timeout=10_000)
    safe_sleep(250)


def extract_hud_numbers(page: Page) -> dict[str, Any]:
    txt = body_inner_text(page, limit=20000)
    out: dict[str, Any] = {}
    # naive regexes
    for key in ["Altitude", "Steepness", "Steps", "Current Loss", "Learning Rate", "Momentum"]:
        if key in txt:
            out[f"has_{key.lower().replace(' ', '_')}"] = True
    # capture steps
    m = re.search(r"Steps\s*\n?\s*(\d+)", txt)
    if m:
        out["steps"] = int(m.group(1))
    m = re.search(r"Altitude\s*\n?\s*(-?\d+(?:\.\d+)?)", txt)
    if m:
        out["altitude"] = float(m.group(1))
    m = re.search(r"Steepness\s*\n?\s*(\d+(?:\.\d+)?)", txt)
    if m:
        out["steepness"] = float(m.group(1))
    # learning rate / momentum shown as a float in the control panel; grab the first float after the label
    m = re.search(r"Learning Rate.*?(\d+\.\d+)", txt, flags=re.S)
    if m:
        out["learning_rate"] = float(m.group(1))
    m = re.search(r"Momentum.*?(\d+\.\d+)", txt, flags=re.S)
    if m:
        out["momentum"] = float(m.group(1))
    return out


def run_task(page: Page, task: dict[str, Any], task_dir: Path, base_url: str) -> None:
    screens_dir = task_dir / "screens"
    ensure_dir(screens_dir)
    traj_path = task_dir / "traj.jsonl"
    if traj_path.exists():
        traj_path.unlink()

    step = 0
    def log(action: str, details: dict[str, Any] | None = None, take_shot: bool = True) -> Path | None:
        nonlocal step
        shot_path = screenshot_step(page, screens_dir, step) if take_shot else None
        append_jsonl(
            traj_path,
            {
                "ts_ms": now_ms(),
                "step": step,
                "task_id": task["task_id"],
                "action": action,
                "details": details or {},
                "screenshot": str(shot_path) if shot_path else None,
                "title": get_header_title(page),
            },
        )
        step += 1
        return shot_path

    # Start from base URL per task
    page.goto(base_url, wait_until="domcontentloaded")
    safe_sleep(350)
    log("goto", {"url": base_url})

    # Navigate to module if needed (except global checks which may do their own navigation)
    module = task.get("module", "")
    judge = task.get("judge", {})
    jtype = judge.get("type", "")

    def ensure_module(mod: str) -> None:
        title_map = {
            "M0": "The Descent",
            "M1": "The Loss Landscape",
            "M2": "Steps & Learning Rate",
            "M3": "Local Minima",
            "M4": "Optimizers",
            "M5": "Blind Climber",
        }
        if mod in title_map:
            click_sidebar_module(page, title_map[mod])
            log("click_sidebar_module", {"module": mod, "title": title_map[mod]})

    if module in {"M0","M1","M2","M3","M4","M5"} and jtype not in {"nav_cycle"}:
        ensure_module(module)

    # Scripted probe actions per judge type
    if jtype == "nav_cycle":
        titles = judge.get("expected_titles", [])
        for t in titles:
            click_sidebar_module(page, t)
            log("click_sidebar_module", {"title": t})
    elif jtype == "visual_change_after_pan":
        ensure_module("M1")
        log("before_pan", {}, take_shot=True)
        drag_pan_on_canvas(page)
        log("after_pan", {}, take_shot=True)
    elif jtype == "visual_change_after_zoom":
        ensure_module("M1")
        log("before_zoom", {}, take_shot=True)
        wheel_zoom_on_canvas(page, delta_y=-650)
        log("after_zoom", {}, take_shot=True)
    elif jtype == "page_text_absence":
        # Just capture body text in obs; evaluator will check forbidden tokens
        log("capture_body_text", {"limit": 50000}, take_shot=True)
    elif jtype == "text_presence":
        log("capture_text_presence", {"required": judge.get("required", [])}, take_shot=True)
    elif jtype == "click_and_expect_title":
        # In M0, click start
        ensure_module("M0")
        click_button_by_text(page, judge["click_text"])
        log("click_button", {"text": judge["click_text"]})
    elif jtype == "canvas_not_uniform":
        log("canvas_screenshot", {}, take_shot=True)
    elif jtype == "hover_visual_change":
        log("before_hover", {}, take_shot=True)
        hover_on_canvas(page, 0.35, 0.35)
        log("hover_1", {"x_ratio": 0.35, "y_ratio": 0.35}, take_shot=True)
        hover_on_canvas(page, 0.65, 0.65)
        log("hover_2", {"x_ratio": 0.65, "y_ratio": 0.65}, take_shot=True)
    elif jtype == "multi_click_visual_changes":
        log("baseline", {}, take_shot=True)
        for txt in judge.get("click_texts", []):
            click_button_by_text(page, txt)
            log("click_button", {"text": txt}, take_shot=True)
    elif jtype == "pan_zoom_stability":
        # ensure Rastrigin
        click_button_by_text(page, "Rastrigin")
        log("click_button", {"text": "Rastrigin"}, take_shot=True)
        drag_pan_on_canvas(page, dx=260, dy=-160)
        log("pan", {"dx": 260, "dy": -160}, take_shot=True)
        wheel_zoom_on_canvas(page, delta_y=-800)
        log("zoom_in", {"delta_y": -800}, take_shot=True)
    elif jtype == "play_causes_visual_change_and_toggle":
        ensure_module("M2")
        log("before_play", {}, take_shot=True)
        click_button_by_text(page, judge.get("play_text", "Descend"))
        log("click_play", {"text": judge.get("play_text", "Descend")}, take_shot=True)
        safe_sleep(700)
        log("after_running", {}, take_shot=True)
        # pause
        click_button_by_text(page, judge.get("pause_text", "Pause"))
        log("click_pause", {"text": judge.get("pause_text", "Pause")}, take_shot=True)
    elif jtype == "numeric_text_changes":
        # capture before/after after slider change
        log("before_slider", {"label": judge.get("label_contains")}, take_shot=True)
        label = judge.get("label_contains", "")
        # Set to random nearby value for evidence
        target = 0.45 if "Learning Rate" in label else 0.9
        set_slider_by_label(page, label, target)
        log("after_slider", {"label": label, "target": target}, take_shot=True)
    elif jtype == "lr_regime_difference":
        ensure_module("M2")
        # low LR run
        set_slider_by_label(page, "Learning Rate", judge.get("low_lr", 0.02))
        log("set_low_lr", {"value": judge.get("low_lr", 0.02)}, take_shot=True)
        click_button_by_text(page, "Descend")
        log("play_low_lr", {}, take_shot=True)
        safe_sleep(700)
        log("low_lr_running", {}, take_shot=True)
        click_button_by_text(page, "Pause")
        log("pause_low_lr", {}, take_shot=True)
        click_button_by_text(page, "Reset")
        log("reset", {}, take_shot=True)
        # high LR run
        set_slider_by_label(page, "Learning Rate", judge.get("high_lr", 0.45))
        log("set_high_lr", {"value": judge.get("high_lr", 0.45)}, take_shot=True)
        click_button_by_text(page, "Descend")
        log("play_high_lr", {}, take_shot=True)
        safe_sleep(700)
        log("high_lr_running", {}, take_shot=True)
        click_button_by_text(page, "Pause")
        log("pause_high_lr", {}, take_shot=True)
    elif jtype == "reset_restores_initial_like":
        ensure_module("M2")
        click_button_by_text(page, "Descend")
        log("play", {}, take_shot=True)
        safe_sleep(600)
        log("running", {}, take_shot=True)
        click_button_by_text(page, "Reset")
        log("reset", {}, take_shot=True)
    elif jtype == "two_clicks_change_start":
        ensure_module("M3")
        log("baseline", {}, take_shot=True)
        click_canvas(page, 0.3, 0.3)
        log("click_1", {"x_ratio": 0.3, "y_ratio": 0.3}, take_shot=True)
        click_canvas(page, 0.7, 0.7)
        log("click_2", {"x_ratio": 0.7, "y_ratio": 0.7}, take_shot=True)
    elif jtype == "two_runs_end_state_diff":
        ensure_module("M3")
        click_canvas(page, 0.3, 0.3)
        log("start_a", {}, take_shot=True)
        click_button_by_text(page, "Descend")
        log("run_a", {}, take_shot=True)
        safe_sleep(700)
        log("end_a", {}, take_shot=True)
        click_button_by_text(page, "Reset")
        log("reset", {}, take_shot=True)
        click_canvas(page, 0.7, 0.7)
        log("start_b", {}, take_shot=True)
        click_button_by_text(page, "Descend")
        log("run_b", {}, take_shot=True)
        safe_sleep(700)
        log("end_b", {}, take_shot=True)
        click_button_by_text(page, "Pause")
        log("pause", {}, take_shot=True)
    elif jtype == "pan_zoom_then_click_works":
        ensure_module("M3")
        log("baseline", {}, take_shot=True)
        drag_pan_on_canvas(page, dx=220, dy=160)
        log("pan", {}, take_shot=True)
        wheel_zoom_on_canvas(page, delta_y=-700)
        log("zoom", {}, take_shot=True)
        click_canvas(page, 0.5, 0.5)
        log("click_after_pan_zoom", {}, take_shot=True)
    elif jtype == "momentum_regime_difference":
        ensure_module("M4")
        # low beta
        set_slider_by_label(page, "Momentum", judge.get("low_beta", 0.0))
        log("set_low_beta", {}, take_shot=True)
        click_button_by_text(page, "Descend")
        log("run_low_beta", {}, take_shot=True)
        safe_sleep(700)
        log("end_low_beta", {}, take_shot=True)
        click_button_by_text(page, "Reset")
        log("reset", {}, take_shot=True)
        # high beta
        set_slider_by_label(page, "Momentum", judge.get("high_beta", 0.9))
        log("set_high_beta", {}, take_shot=True)
        click_button_by_text(page, "Descend")
        log("run_high_beta", {}, take_shot=True)
        safe_sleep(700)
        log("end_high_beta", {}, take_shot=True)
        click_button_by_text(page, "Pause")
        log("pause", {}, take_shot=True)
    elif jtype == "steps_increases_after_key":
        ensure_module("M5")
        log("before_key", {}, take_shot=True)
        page.keyboard.press(judge.get("key", "ArrowRight"))
        safe_sleep(200)
        log("after_key", {"key": judge.get("key", "ArrowRight")}, take_shot=True)
    elif jtype == "steps_increases_after_ui_click":
        ensure_module("M5")
        log("before_ui_click", {}, take_shot=True)
        # heuristic: click the right-most chevron button by role=button with no name fallback
        # we instead click by CSS: find buttons within bottom-right control cluster (3x3)
        buttons = page.locator("button").all()
        # fallback: just click the last button (often the right arrow)
        page.locator("button").last.click()
        safe_sleep(200)
        log("after_ui_click", {}, take_shot=True)
    elif jtype == "reach_victory_modal":
        ensure_module("M5")
        # Local search: greedy hill-climb using HUD Altitude value
        # We use WASD moves (small), accepting moves that reduce altitude; otherwise revert.
        log("start_search", {}, take_shot=True)
        max_steps = int(judge.get("max_steps", 250))
        directions = [("ArrowUp", (0, 1)), ("ArrowDown", (0, -1)), ("ArrowLeft", (-1, 0)), ("ArrowRight", (1, 0))]
        # capture baseline altitude
        for i in range(max_steps):
            txt = body_inner_text(page, limit=20000)
            if judge.get("required_text", "Minimum Found") in txt:
                log("victory_detected", {"i": i}, take_shot=True)
                break
            # Try each direction once; keep the best
            alt0 = extract_hud_numbers(page).get("altitude")
            best = None
            best_alt = alt0
            for key, _ in directions:
                page.keyboard.press(key)
                safe_sleep(120)
                alt1 = extract_hud_numbers(page).get("altitude")
                append_jsonl(traj_path, {"ts_ms": now_ms(), "step": step, "action": "probe_move", "details": {"key": key, "altitude": alt1}})
                if alt1 is not None and (best_alt is None or alt1 < best_alt):
                    best = key
                    best_alt = alt1
                # revert move by pressing opposite
                opp = {"ArrowUp": "ArrowDown", "ArrowDown": "ArrowUp", "ArrowLeft": "ArrowRight", "ArrowRight": "ArrowLeft"}[key]
                page.keyboard.press(opp)
                safe_sleep(80)
            # commit best move twice to accelerate
            if best:
                page.keyboard.press(best)
                safe_sleep(120)
                page.keyboard.press(best)
                safe_sleep(120)
            if i % 25 == 0:
                log("search_progress", {"i": i, "alt": extract_hud_numbers(page).get("altitude")}, take_shot=True)
        # final shot
        log("search_end", {}, take_shot=True)
    elif jtype == "still_interactive_after_stress":
        # simple stress: go M2 run, pan, zoom, pause
        ensure_module("M2")
        click_button_by_text(page, "Descend")
        log("stress_play", {}, take_shot=True)
        t0 = time.time()
        while time.time() - t0 < 10:
            drag_pan_on_canvas(page, dx=random.choice([180, -180]), dy=random.choice([120, -120]))
            wheel_zoom_on_canvas(page, delta_y=random.choice([-500, 500]))
        log("stress_end", {}, take_shot=True)
        try:
            click_button_by_text(page, "Pause")
        except Exception:
            pass
        log("stress_pause", {}, take_shot=True)
    elif jtype == "module_pan":
        click_sidebar_module(page, judge.get("module_title", "Steps & Learning Rate"))
        log("module_enter", {"title": judge.get("module_title")}, take_shot=True)
        drag_pan_on_canvas(page)
        log("module_pan", {}, take_shot=True)
    elif jtype == "module_zoom_stability":
        click_sidebar_module(page, judge.get("module_title", "Blind Climber"))
        log("module_enter", {"title": judge.get("module_title")}, take_shot=True)
        wheel_zoom_on_canvas(page, delta_y=-600)
        log("module_zoom", {}, take_shot=True)
    elif jtype == "pan_then_hover_diff":
        ensure_module("M1")
        log("baseline", {}, take_shot=True)
        drag_pan_on_canvas(page, dx=220, dy=140)
        log("pan", {}, take_shot=True)
        hover_on_canvas(page, 0.6, 0.4)
        log("hover_after_pan", {}, take_shot=True)
    elif jtype == "zoom_then_hover_diff":
        ensure_module("M1")
        log("baseline", {}, take_shot=True)
        wheel_zoom_on_canvas(page, delta_y=-700)
        log("zoom", {}, take_shot=True)
        hover_on_canvas(page, 0.6, 0.4)
        log("hover_after_zoom", {}, take_shot=True)
    elif jtype == "pause_reduces_motion":
        ensure_module("M2")
        click_button_by_text(page, "Descend")
        log("play", {}, take_shot=True)
        safe_sleep(650)
        click_button_by_text(page, "Pause")
        log("pause", {}, take_shot=True)
        safe_sleep(700)
        log("paused_later", {}, take_shot=True)
    elif jtype == "switch_then_run_diff":
        ensure_module("M2")
        log("baseline", {}, take_shot=True)
        for txt in judge.get("click_texts", []):
            click_button_by_text(page, txt)
            log("click_button", {"text": txt}, take_shot=True)
            click_button_by_text(page, "Descend")
            log("play", {}, take_shot=True)
            safe_sleep(650)
            log("running", {}, take_shot=True)
            try:
                click_button_by_text(page, "Pause")
            except Exception:
                pass
            try:
                click_button_by_text(page, "Reset")
            except Exception:
                pass
            log("reset", {}, take_shot=True)
    elif jtype == "click_then_run_changes":
        ensure_module("M3")
        click_canvas(page, 0.55, 0.55)
        log("click_start", {}, take_shot=True)
        click_button_by_text(page, "Descend")
        log("play", {}, take_shot=True)
        safe_sleep(650)
        log("running", {}, take_shot=True)
        try:
            click_button_by_text(page, "Pause")
        except Exception:
            pass
        log("pause", {}, take_shot=True)
    elif jtype == "lr_change_affects_run":
        ensure_module("M4")
        log("baseline", {}, take_shot=True)
        set_slider_by_label(page, "Learning Rate", 0.45)
        log("set_lr", {"value": 0.45}, take_shot=True)
        click_button_by_text(page, "Descend")
        log("play", {}, take_shot=True)
        safe_sleep(650)
        log("running", {}, take_shot=True)
        try:
            click_button_by_text(page, "Pause")
        except Exception:
            pass
        log("pause", {}, take_shot=True)
    elif jtype == "reset_changes_hud":
        ensure_module("M5")
        log("before_reset_key", {}, take_shot=True)
        page.keyboard.press(judge.get("key", "R"))
        safe_sleep(300)
        log("after_reset_key", {"key": judge.get("key", "R")}, take_shot=True)
    elif jtype == "move_causes_visual_change":
        ensure_module("M5")
        log("before_move", {}, take_shot=True)
        page.keyboard.press(judge.get("key", "ArrowUp"))
        safe_sleep(200)
        log("after_move", {"key": judge.get("key", "ArrowUp")}, take_shot=True)
    elif jtype == "min_button_count":
        ensure_module("M5")
        log("capture_buttons", {}, take_shot=True)
    elif jtype == "nav_flip_flop":
        titles = judge.get("titles", ["The Loss Landscape", "Steps & Learning Rate"])
        for i in range(10):
            click_sidebar_module(page, titles[i % len(titles)])
            log("flip", {"title": titles[i % len(titles)], "i": i}, take_shot=(i % 3 == 0))
    else:
        # Default: just capture a screenshot
        log("default_capture", {"judge_type": jtype}, take_shot=True)

    # Save observations
    obs = {
        "task_id": task["task_id"],
        "module": module,
        "judge": judge,
        "final_title": get_header_title(page),
        "body_text": body_inner_text(page, limit=50000),
        "hud": extract_hud_numbers(page),
        "button_count": page.locator("button").count(),
    }
    write_json(task_dir / "obs.json", obs)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base_url", required=True, help="e.g. http://127.0.0.1:5173")
    ap.add_argument("--tasks", required=True, help="jsonl tasks file")
    ap.add_argument("--out_dir", required=True, help="output run directory")
    ap.add_argument("--headless", action="store_true")
    ap.add_argument("--viewport_width", type=int, default=1024)
    ap.add_argument("--viewport_height", type=int, default=768)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    random.seed(args.seed)
    base_url = args.base_url.rstrip("/")
    tasks = read_jsonl(Path(args.tasks))
    out_dir = Path(args.out_dir)
    ensure_dir(out_dir)

    run_meta = {
        "base_url": base_url,
        "tasks_file": str(Path(args.tasks)),
        "seed": args.seed,
        "viewport": {"width": args.viewport_width, "height": args.viewport_height},
        "ts_ms": now_ms(),
    }
    write_json(out_dir / "run_meta.json", run_meta)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=args.headless)
        context = browser.new_context(viewport={"width": args.viewport_width, "height": args.viewport_height})
        page = context.new_page()

        for i, task in enumerate(tasks):
            task_id = task["task_id"]
            task_dir = out_dir / task_id
            ensure_dir(task_dir)
            console.print(f"[bold]Running[/bold] {i+1}/{len(tasks)}: {task_id} ({task.get('module')})")
            try:
                run_task(page, task, task_dir, base_url=base_url)
                write_json(task_dir / "run_status.json", {"ok": True})
            except Exception as e:
                write_json(task_dir / "run_status.json", {"ok": False, "error": str(e)})

        context.close()
        browser.close()


if __name__ == "__main__":
    main()


