from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from typing import Any


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--websites", required=True, help="json listing websites with start_url")
    ap.add_argument("--tasks", required=True, help="common tasks jsonl")
    ap.add_argument("--results_root", required=True, help="benchmark/results root")
    ap.add_argument("--run_id", default="run_001")
    ap.add_argument("--headless", action="store_true")
    ap.add_argument("--viewport_width", type=int, default=1024)
    ap.add_argument("--viewport_height", type=int, default=768)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--limit", type=int, default=0, help="only first N sites")
    args = ap.parse_args()

    websites = load_json(Path(args.websites))["websites"]
    if args.limit and args.limit > 0:
        websites = websites[: args.limit]

    results_root = Path(args.results_root)
    results_root.mkdir(parents=True, exist_ok=True)

    for w in websites:
        sid = w["id"]
        base_url = w["start_url"]
        out_dir = results_root / "site_exec_v1" / sid / args.run_id
        out_dir.mkdir(parents=True, exist_ok=True)
        cmd = [
            "python",
            "-m",
            "benchmark.runner.run_benchmark",
            "--base_url",
            base_url,
            "--tasks",
            str(Path(args.tasks)),
            "--out_dir",
            str(out_dir),
            "--viewport_width",
            str(args.viewport_width),
            "--viewport_height",
            str(args.viewport_height),
            "--seed",
            str(args.seed),
        ]
        if args.headless:
            cmd.append("--headless")
        print("RUN", sid, "->", out_dir)
        subprocess.run(cmd, check=True)


if __name__ == "__main__":
    main()






