from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from benchlib import mean_std, write_json


def load_json(path: Path) -> dict[str, Any]:
    import json
    return json.loads(path.read_text(encoding="utf-8"))


def collect_run_summaries(results_root: Path) -> dict[str, list[dict[str, Any]]]:
    """
    results_root structure:
      results/<agent_name>/<run_name>/summary.json
    """
    out: dict[str, list[dict[str, Any]]] = {}
    if not results_root.exists():
        return out
    for agent_dir in sorted(results_root.iterdir()):
        if not agent_dir.is_dir():
            continue
        for run_dir in sorted(agent_dir.iterdir()):
            if not run_dir.is_dir():
                continue
            summ = run_dir / "summary.json"
            if summ.exists():
                out.setdefault(agent_dir.name, []).append(load_json(summ))
    return out


def render_table(agent_summaries: dict[str, list[dict[str, Any]]]) -> str:
    # Determine module columns
    modules = set()
    for runs in agent_summaries.values():
        for s in runs:
            modules.update((s.get("by_module") or {}).keys())
    # stable order
    module_order = [m for m in ["GLOBAL", "M0", "M1", "M2", "M3", "M4", "M5", "ROBUSTNESS"] if m in modules]
    for m in sorted(modules):
        if m not in module_order:
            module_order.append(m)

    # Header
    header = ["Agent"] + module_order + ["Overall"]
    lines = ["| " + " | ".join(header) + " |", "| " + " | ".join(["---"] * len(header)) + " |"]

    for agent, runs in sorted(agent_summaries.items(), key=lambda kv: kv[0]):
        # compute mean±std per module + overall
        row = [agent]
        for mod in module_order:
            vals = []
            for s in runs:
                bm = s.get("by_module") or {}
                if mod in bm:
                    vals.append(float(bm[mod]))
            mu, sd = mean_std(vals)
            if len(vals) <= 1:
                row.append(f"{mu*100:.1f}%")
            else:
                row.append(f"{mu*100:.1f}%±{sd*100:.1f}%")
        overall_vals = [float(s.get("overall", 0.0)) for s in runs]
        mu, sd = mean_std(overall_vals)
        if len(overall_vals) <= 1:
            row.append(f"{mu*100:.1f}%")
        else:
            row.append(f"{mu*100:.1f}%±{sd*100:.1f}%")
        lines.append("| " + " | ".join(row) + " |")

    return "\n".join(lines) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--results_root", type=str, default=str(Path(__file__).parent / "results"))
    ap.add_argument("--out", type=str, default=str(Path(__file__).parent / "table.md"))
    args = ap.parse_args()

    results_root = Path(args.results_root)
    out_path = Path(args.out)
    agent_summaries = collect_run_summaries(results_root)
    table = render_table(agent_summaries)
    out_path.write_text(table, encoding="utf-8")
    write_json(out_path.with_suffix(".json"), {"agents": list(agent_summaries.keys())})


if __name__ == "__main__":
    main()






