from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from benchmark.lib.benchlib import mean_std


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        rows.append(json.loads(line))
    return rows


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def task_weight(task: dict[str, Any]) -> float:
    if "weight" in task:
        return float(task["weight"])
    diff = int(task.get("difficulty", 1))
    return 1.0 if diff == 1 else 1.5 if diff == 2 else 2.0


def score_website_run(run_dir: Path, tasks: list[dict[str, Any]], prefix: str, kind: str) -> float | None:
    """
    kind:
      - 'rule' : uses <task_dir>/result.json with passed boolean
      - 'llm'  : uses <task_dir>/<prefix>_result.json with score_mean
    Returns weighted score in [0,1] or None if missing.
    """
    num = 0.0
    den = 0.0
    for t in tasks:
        tid = t["task_id"]
        w = task_weight(t)
        task_dir = run_dir / tid
        if not task_dir.exists():
            continue
        if kind == "rule":
            p = task_dir / "result.json"
            if not p.exists():
                continue
            r = load_json(p)
            s = 1.0 if bool(r.get("passed")) else 0.0
        else:
            p = task_dir / f"{prefix}_result.json"
            if not p.exists():
                continue
            r = load_json(p)
            s = float(r.get("score_mean", 0.0) or 0.0)
        num += w * s
        den += w
    return (num / den) if den > 0 else None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--websites", required=True, help="json listing 20 websites")
    ap.add_argument("--tasks", required=True, help="common tasks jsonl (site executability)")
    ap.add_argument("--results_root", required=True, help="benchmark/results root")
    ap.add_argument("--out", required=True, help="output markdown table path")
    ap.add_argument("--openai_gpt_prefix", default="openai_gpt")
    ap.add_argument("--openai_gpt4v_prefix", default="openai_gpt4v")
    ap.add_argument("--gemini_prefix", default="gemini_flash")
    args = ap.parse_args()

    websites = load_json(Path(args.websites))["websites"]
    tasks = read_jsonl(Path(args.tasks))
    results_root = Path(args.results_root)

    site_ids = [w["id"] for w in websites]

    rows = [
        ("rule", None, "rule"),
        ("openai_gpt", args.openai_gpt_prefix, "llm"),
        ("openai_gpt4v", args.openai_gpt4v_prefix, "llm"),
        ("gemini_flash", args.gemini_prefix, "llm"),
    ]

    header = ["Evaluator"] + site_ids + ["Overall"]
    lines = ["| " + " | ".join(header) + " |", "| " + " | ".join(["---"] * len(header)) + " |"]

    for name, prefix, kind in rows:
        vals: list[float] = []
        cells: list[str] = [name]
        for sid in site_ids:
            run_dir = results_root / "site_exec_v1" / sid / "run_001"
            s = score_website_run(run_dir, tasks, prefix=(prefix or ""), kind=kind)
            if s is None:
                cells.append("NA")
            else:
                vals.append(s)
                cells.append(f"{s*100:.1f}%")
        overall = (sum(vals) / len(vals)) if vals else 0.0
        cells.append(f"{overall*100:.1f}%")
        lines.append("| " + " | ".join(cells) + " |")

    Path(args.out).write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()






