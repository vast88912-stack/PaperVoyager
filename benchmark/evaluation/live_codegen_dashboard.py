from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Any

from benchmark.lib.benchlib import ensure_dir, now_ms


def load_json(path: Path) -> dict[str, Any] | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def load_websites(websites_path: Path) -> list[str]:
    obj = json.loads(websites_path.read_text(encoding="utf-8"))
    return [w["id"] for w in obj.get("websites", [])]


def fmt_pct(x: float | None) -> str:
    if x is None:
        return "NA"
    return f"{x*100:.1f}%"


def scan_one(results_root: Path, run_id: str, site_id: str) -> dict[str, Any]:
    run_dir = results_root / "codegen_score_v1" / site_id / run_id
    out: dict[str, Any] = {"site_id": site_id, "run_dir": str(run_dir)}
    if not run_dir.exists():
        out["exists"] = False
        return out
    out["exists"] = True

    # Probe completion proxy: site_probe exists
    out["probe_ok"] = (run_dir / "site_probe.json").exists()
    # Deterministic rule score
    ss = load_json(run_dir / "site_score.json")
    if ss:
        out["codegen_final"] = float(ss.get("final_score") or 0.0)
        out["codegen_base"] = float(ss.get("base_score") or 0.0)
    # OpenAI
    oai = load_json(run_dir / "openai_gpt4v_site_result.json")
    if oai:
        out["openai_vlm"] = float(oai.get("score_mean") or 0.0)
        out["openai_done"] = True
    else:
        out["openai_done"] = False
    # Gemini (default prefix gemini_flash)
    gem = load_json(run_dir / "gemini_flash_site_result.json")
    if gem:
        out["gemini_vlm"] = float(gem.get("score_mean") or 0.0)
        out["gemini_done"] = True
    else:
        out["gemini_done"] = False

    # Screenshots count
    screens = list(run_dir.glob("modules/*/screens/*.png"))
    out["screens"] = len(screens)
    return out


def render_markdown(rows: list[dict[str, Any]]) -> str:
    site_ids = [r["site_id"] for r in rows]
    header = ["Metric"] + site_ids + ["Overall"]
    lines = ["| " + " | ".join(header) + " |", "| " + " | ".join(["---"] * len(header)) + " |"]

    def row(name: str, key: str) -> None:
        vals: list[float] = []
        cells = [name]
        for r in rows:
            v = r.get(key)
            if isinstance(v, (int, float)):
                vals.append(float(v))
                cells.append(fmt_pct(float(v)))
            else:
                cells.append("NA")
        overall = (sum(vals) / len(vals)) if vals else None
        cells.append(fmt_pct(overall))
        lines.append("| " + " | ".join(cells) + " |")

    row("codegen_final(rule)", "codegen_final")
    row("codegen_base(rule)", "codegen_base")
    row("openai_vlm", "openai_vlm")
    row("gemini_vlm", "gemini_vlm")

    # Progress row
    probe_ok = sum(1 for r in rows if r.get("probe_ok"))
    openai_ok = sum(1 for r in rows if r.get("openai_done"))
    gemini_ok = sum(1 for r in rows if r.get("gemini_done"))
    screens = sum(int(r.get("screens") or 0) for r in rows)
    lines.append("")
    lines.append(f"- ts_ms: {now_ms()}")
    lines.append(f"- progress: probe={probe_ok}/{len(rows)} openai={openai_ok}/{len(rows)} gemini={gemini_ok}/{len(rows)}")
    lines.append(f"- screenshots_total: {screens}")
    return "\n".join(lines) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--websites", required=True)
    ap.add_argument("--results_root", required=True)
    ap.add_argument("--run_id", default="run_001")
    ap.add_argument("--out", default=str(Path(__file__).parents[1] / "generated" / "codegen_score_live.md"))
    ap.add_argument("--interval", type=float, default=5.0, help="seconds; 0 means run once")
    args = ap.parse_args()

    websites_path = Path(args.websites)
    results_root = Path(args.results_root)
    out_path = Path(args.out)
    ensure_dir(out_path.parent)

    site_ids = load_websites(websites_path)

    def tick() -> None:
        rows = [scan_one(results_root, args.run_id, sid) for sid in site_ids]
        md = render_markdown(rows)
        out_path.write_text(md, encoding="utf-8")
        probe_ok = sum(1 for r in rows if r.get("probe_ok"))
        openai_ok = sum(1 for r in rows if r.get("openai_done"))
        gemini_ok = sum(1 for r in rows if r.get("gemini_done"))
        print(f"[live] wrote {out_path}  probe={probe_ok}/{len(rows)} openai={openai_ok}/{len(rows)} gemini={gemini_ok}/{len(rows)}")

    tick()
    if args.interval <= 0:
        return
    while True:
        time.sleep(args.interval)
        tick()


if __name__ == "__main__":
    main()






