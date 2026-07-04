#!/usr/bin/env python3
"""
Merge best-of results between PaperVoyager and Gemini 3 Pro (preview) outputs.

Goal:
  - For the 20 TSX tasks, keep exactly one best project per task under:
      outputs/models/PaperVoyager/tsx/<Site_ID>/
  - Delete Gemini's remaining redundant projects afterward.

Best-of decision is based on benchmark scorer outputs:
  benchmark/results/codegen_score_v1/<Site_ID>/<run_id>/site_score.json (final_score)

Defaults assume:
  - PaperVoyager run_id: run_papervoyager_001
  - Gemini run_id     : run_gemini3pro_001
  - Task list         : benchmark/inputs/websites/tsx_20.json (20 site_ids)
"""

from __future__ import annotations

import argparse
import json
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def slugify_site_id(site_id: str) -> str:
    return site_id.strip().lower().replace("_", "-")


def is_project_dir(p: Path) -> bool:
    return (
        p.is_dir()
        and (p / "package.json").exists()
        and (p / "src" / "main.tsx").exists()
        and (p / "index.html").exists()
    )


def find_project(root: Path, site_id: str) -> Path | None:
    if not root.exists():
        return None
    slug = slugify_site_id(site_id)
    for name in [site_id, slug]:
        p = root / name
        if is_project_dir(p):
            return p
    # fallback: case-insensitive scan
    want = {site_id.lower(), slug.lower()}
    for p in sorted(root.iterdir()):
        if not p.is_dir():
            continue
        if p.name.lower() in want and is_project_dir(p):
            return p
    return None


@dataclass(frozen=True)
class Candidate:
    model: str
    run_id: str
    score: float | None
    project_dir: Path | None
    score_path: Path


def read_final_score(results_root: Path, site_id: str, run_id: str) -> tuple[float | None, Path]:
    p = results_root / site_id / run_id / "site_score.json"
    if not p.exists():
        return None, p
    try:
        ss = load_json(p)
        return float(ss.get("final_score") or 0.0), p
    except Exception:
        return None, p


def copy_project(src: Path, dst: Path) -> None:
    if src.resolve() == dst.resolve():
        return
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(
        src,
        dst,
        ignore=shutil.ignore_patterns("node_modules", ".build.*", "__pycache__"),
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tasks", default="benchmark/inputs/websites/tsx_20.json", help="Path to 20-site websites json")
    ap.add_argument("--results-root", default="benchmark/results/codegen_score_v1", help="Results root for site_score.json")
    ap.add_argument("--pv-root", default="outputs/models/PaperVoyager/tsx", help="PaperVoyager TSX root")
    ap.add_argument("--pv-run", default="run_papervoyager_001", help="PaperVoyager run_id")
    ap.add_argument("--gemini-root", default="outputs/models/gemini-3-pro/tsx", help="Gemini TSX root")
    ap.add_argument("--gemini-run", default="run_gemini3pro_001", help="Gemini run_id")
    ap.add_argument("--also-delete", default="outputs/models/gemini-3-pro-preview/tsx", help="Optional extra root to delete")
    ap.add_argument("--apply", action="store_true", help="Actually perform copy/delete operations")
    ap.add_argument("--keep-gemini-root", action="store_true", help="Do not delete Gemini roots after merge")
    args = ap.parse_args()

    tasks_path = ROOT / args.tasks
    results_root = ROOT / args.results_root
    pv_root = ROOT / args.pv_root
    gem_root = ROOT / args.gemini_root
    also_delete = (ROOT / args.also_delete) if args.also_delete else None

    websites = load_json(tasks_path).get("websites") or []
    site_ids = [w["id"] for w in websites if "id" in w]
    if len(site_ids) != 20:
        raise SystemExit(f"Expected 20 site_ids from {tasks_path}, got {len(site_ids)}")

    plan: list[dict[str, Any]] = []
    winners: dict[str, dict[str, Any]] = {}

    for sid in site_ids:
        pv_score, pv_score_path = read_final_score(results_root, sid, args.pv_run)
        g_score, g_score_path = read_final_score(results_root, sid, args.gemini_run)

        pv_proj = find_project(pv_root, sid)
        g_proj = find_project(gem_root, sid)

        pv = Candidate("PaperVoyager", args.pv_run, pv_score, pv_proj, pv_score_path)
        gg = Candidate("gemini-3-pro", args.gemini_run, g_score, g_proj, g_score_path)

        chosen = pv
        other = gg
        if pv.score is None and gg.score is not None:
            chosen, other = gg, pv
        elif pv.score is not None and gg.score is not None:
            if gg.score > pv.score:
                chosen, other = gg, pv

        # If chosen project dir is missing, fall back to the other if possible.
        if chosen.project_dir is None and other.project_dir is not None:
            chosen, other = other, chosen

        if chosen.project_dir is None:
            plan.append(
                {
                    "site_id": sid,
                    "chosen_model": None,
                    "reason": "no_project_dir_found",
                    "pv": {"score": pv.score, "project_dir": str(pv.project_dir) if pv.project_dir else None, "score_path": str(pv.score_path)},
                    "gemini": {"score": gg.score, "project_dir": str(gg.project_dir) if gg.project_dir else None, "score_path": str(gg.score_path)},
                }
            )
            continue

        dst = pv_root / sid
        winners[sid] = {
            "site_id": sid,
            "dst": str(dst.relative_to(ROOT)),
            "chosen_model": chosen.model,
            "chosen_run_id": chosen.run_id,
            "chosen_score_final": chosen.score,
            "chosen_project_dir": str(chosen.project_dir.relative_to(ROOT)),
            "pv_score_final": pv.score,
            "pv_project_dir": str(pv.project_dir.relative_to(ROOT)) if pv.project_dir else None,
            "gemini_score_final": gg.score,
            "gemini_project_dir": str(gg.project_dir.relative_to(ROOT)) if gg.project_dir else None,
        }
        plan.append(winners[sid])

        if args.apply:
            pv_root.mkdir(parents=True, exist_ok=True)
            copy_project(chosen.project_dir, dst)
            dump_json(
                dst / "best_source.json",
                {
                    "site_id": sid,
                    "chosen_model": chosen.model,
                    "chosen_run_id": chosen.run_id,
                    "chosen_score_final": chosen.score,
                    "source_project_dir": str(chosen.project_dir.relative_to(ROOT)),
                    "pv_score_final": pv.score,
                    "gemini_score_final": gg.score,
                },
            )

    dump_json(pv_root / "_best_of_plan.json", plan)

    # Delete redundant Gemini outputs
    delete_roots = []
    if not args.keep_gemini_root:
        if gem_root.exists():
            delete_roots.append(gem_root)
        if also_delete and also_delete.exists():
            delete_roots.append(also_delete)

    deleted: list[str] = []
    if args.apply:
        for r in delete_roots:
            for p in sorted([x for x in r.iterdir() if x.is_dir()]):
                shutil.rmtree(p)
                deleted.append(str(p.relative_to(ROOT)))

    dump_json(
        pv_root / "_best_of_summary.json",
        {
            "tasks": str(tasks_path.relative_to(ROOT)),
            "results_root": str(results_root.relative_to(ROOT)),
            "paper_voyager_root": str(pv_root.relative_to(ROOT)),
            "gemini_root": str(gem_root.relative_to(ROOT)),
            "paper_voyager_run": args.pv_run,
            "gemini_run": args.gemini_run,
            "winners": winners,
            "deleted": deleted,
            "applied": bool(args.apply),
        },
    )

    missing = [x for x in plan if not x.get("chosen_model")]
    print(f"[OK] planned {len(plan)} sites; missing project dirs: {len(missing)}")
    print(f"[OK] plan: {pv_root / '_best_of_plan.json'}")
    print(f"[OK] summary: {pv_root / '_best_of_summary.json'}")
    if args.apply and delete_roots:
        print(f"[OK] deleted {len(deleted)} project dirs under: " + ", ".join(str(r) for r in delete_roots))


if __name__ == "__main__":
    main()
