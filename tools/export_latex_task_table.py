#!/usr/bin/env python3
"""
Export LaTeX rows for the paper table from benchmark results.

Reads:
  benchmark/results/codegen_score_v1/<site_id>/<run_id>/site_score.json

Example:
  python tools/export_latex_task_table.py --metric final
  python tools/export_latex_task_table.py --metric base
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from statistics import mean


ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "benchmark" / "results" / "codegen_score_v1"


FIRST_BLOCK = [
    ("Alg-DP", "Algorithm_Dynamic_Programming"),
    ("Alg-GP", "Algorithm_Graph_Pathfinding"),
    ("Alg-SR", "Algorithm_Sorting_Race"),
    ("DS-BT", "DataStructure_Balanced_Trees"),
    ("DS-HM", "DataStructure_Hash_Map"),
    ("Dist-Raft", "Distributed_Raft_Consensus"),
    ("Math-Lorenz", "Math_Chaos_Lorenz"),
    ("Math-FFT", "Math_Fourier_Transform"),
    ("Math-Eig", "Math_Linear_Algebra_Eigen"),
    ("Math-MC", "Math_Monte_Carlo_Estimation"),
]

SECOND_BLOCK = [
    ("ML-GD", "ML_Gradient_Descent"),
    ("ML-KM", "ML_KMeans_Clustering"),
    ("ML-NNV", "ML_Neural_Network_Viz"),
    ("Phys-CFD", "Physics_Fluid_CFD"),
    ("Phys-Orbit", "Physics_Gravity_Orbits"),
    ("Phys-Opt", "Physics_Optics_Lab"),
    ("Phys-Therm", "Physics_Thermodynamics"),
    ("Sys-Sched", "Sys_CPU_Scheduler"),
    ("Sys-VM", "Sys_Virtual_Memory"),
]

TASKS = FIRST_BLOCK + SECOND_BLOCK


@dataclass(frozen=True)
class ModelSpec:
    label: str
    run_id: str


DEFAULT_MODELS = [
    ModelSpec("GPT5.2", "run_chatgpt52_fileurl_001"),
    ModelSpec("Gemini-3-pro-preview", "run_gemini3pro_preview_fileurl_001"),
    ModelSpec("Qwen-Max", "run_qwen_fileurl_001"),
    ModelSpec("Kimi 2.5", "run_kimi_fileurl_001"),
    ModelSpec("PaperVoyager (Ours)", "run_papervoyager_fileurl_001"),
]


def load_score(site_id: str, run_id: str) -> dict:
    path = RESULTS / site_id / run_id / "site_score.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def pick_metric(ss: dict, metric: str) -> float | None:
    key = "final_score" if metric == "final" else "base_score"
    if key not in ss:
        return None
    try:
        return float(ss.get(key) or 0.0)
    except Exception:
        return None


def fmt_pct(val: float | None) -> str:
    if val is None:
        return "--"
    return f"{val*100:.1f}\\%"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--metric", choices=["final", "base"], default="final")
    args = ap.parse_args()

    metric = args.metric

    for spec in DEFAULT_MODELS:
        vals: list[float] = []
        cells_1: list[str] = []
        cells_2: list[str] = []
        missing: list[str] = []

        for i, (abbr, site_id) in enumerate(TASKS):
            ss = load_score(site_id, spec.run_id)
            v = pick_metric(ss, metric)
            if v is None:
                missing.append(abbr)
            else:
                vals.append(v)
            cell = fmt_pct(v)
            if i < len(FIRST_BLOCK):
                cells_1.append(cell)
            else:
                cells_2.append(cell)

        overall = mean(vals) if vals else None
        coverage = f"{len(vals)}/{len(TASKS)}"

        print(f"{spec.label} ({metric}, coverage={coverage})")
        print("  " + " & ".join(cells_1) + r" \\")
        print("  " + " & ".join(cells_2) + f" & {fmt_pct(overall)}" + r" \\")
        if missing:
            print("  missing:", ", ".join(missing))
        print()


if __name__ == "__main__":
    main()
