#!/usr/bin/env python3
"""
Write per-output score metadata files and a global index.

Inputs:
  - benchmark/results/codegen_score_v1/<site_id>/<run_id>/site_score.json
  - outputs/tsx/* and outputs/models/<model>/tsx/*

Outputs:
  - outputs/score_index.json
  - outputs/score_index.csv
  - <each output site dir>/score.json (next to package.json)
"""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RESULTS_ROOT = ROOT / "benchmark" / "results" / "codegen_score_v1"
OUTPUTS_ROOT = ROOT / "outputs"
OUTPUTS_BY_MODEL_ROOT = ROOT / "outputs_by_model"


def slugify_site_id(site_id: str) -> str:
    return site_id.strip().lower().replace("_", "-")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(path: Path, obj: Any) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


@dataclass(frozen=True)
class OutputSite:
    model: str
    site_id: str
    output_dir: Path

    def index_html(self) -> Path:
        return self.output_dir / "dist" / "index.html"

    def score_json(self) -> Path:
        return self.output_dir / "score.json"


MODEL_TO_RUN_ID = {
    "baseline": "run_002",
    "chatgpt-5.2": "run_chatgpt5_2_001",
    "gemini-3-pro": "run_gemini3pro_001",
    "kimi": "run_kimi_001",
    "minimax": "run_minimax_001",
    "qwen": "run_qwen_001",
    "PaperVoyager": "run_papervoyager_001",
    "WebVoyager": "run_papervoyager_001",
}


def is_project(p: Path) -> bool:
    return (
        p.is_dir()
        and (p / "package.json").exists()
        and (p / "src" / "main.tsx").exists()
        and (p / "index.html").exists()
    )


def site_ids_from_results() -> list[str]:
    if not RESULTS_ROOT.exists():
        raise SystemExit(f"results root not found: {RESULTS_ROOT}")
    return sorted([p.name for p in RESULTS_ROOT.iterdir() if p.is_dir()])


def infer_site_id(dir_name: str, slug_to_site: dict[str, str], known_site_ids: set[str]) -> str | None:
    if dir_name in known_site_ids:
        return dir_name
    key = dir_name.strip().lower()
    return slug_to_site.get(key)


def iter_output_sites() -> list[OutputSite]:
    site_ids = site_ids_from_results()
    known_site_ids = set(site_ids)
    slug_to_site = {slugify_site_id(sid): sid for sid in site_ids}

    out: list[OutputSite] = []

    # Baseline outputs/tsx
    baseline_root = OUTPUTS_ROOT / "tsx"
    if baseline_root.exists():
        for p in sorted([x for x in baseline_root.iterdir() if x.is_dir()]):
            site_id = infer_site_id(p.name, slug_to_site, known_site_ids)
            if site_id:
                out.append(OutputSite(model="baseline", site_id=site_id, output_dir=p))

    # Model outputs/models/<model>/tsx
    models_root = OUTPUTS_ROOT / "models"
    if models_root.exists():
        for model_dir in sorted([x for x in models_root.iterdir() if x.is_dir()]):
            tsx_root = model_dir / "tsx"
            if not tsx_root.exists():
                continue
            model = model_dir.name
            for p in sorted([x for x in tsx_root.iterdir() if x.is_dir()]):
                site_id = infer_site_id(p.name, slug_to_site, known_site_ids)
                if site_id:
                    out.append(OutputSite(model=model, site_id=site_id, output_dir=p))

    # outputs_by_model/<model>/<site>
    if OUTPUTS_BY_MODEL_ROOT.exists():
        for model_dir in sorted([x for x in OUTPUTS_BY_MODEL_ROOT.iterdir() if x.is_dir()]):
            model = model_dir.name
            for p in sorted([x for x in model_dir.iterdir() if is_project(x)]):
                site_id = infer_site_id(p.name, slug_to_site, known_site_ids)
                if site_id:
                    out.append(OutputSite(model=model, site_id=site_id, output_dir=p))

    # De-dup (some directories exist in both slug + Site_ID forms)
    uniq: dict[tuple[str, str, str], OutputSite] = {}
    for s in out:
        key = (s.model, s.site_id, str(s.output_dir.resolve()).lower())
        uniq[key] = s
    return list(uniq.values())


def resolve_score(site: OutputSite) -> dict[str, Any]:
    run_id = MODEL_TO_RUN_ID.get(site.model)
    if not run_id:
        return {
            "missing": True,
            "missing_reason": f"no run_id mapping for model={site.model!r}",
            "run_id": None,
            "score_path": None,
            "base_score": None,
            "final_score": None,
            "ts_ms": None,
        }

    score_path = RESULTS_ROOT / site.site_id / run_id / "site_score.json"
    if not score_path.exists():
        return {
            "missing": True,
            "missing_reason": f"score file not found: {score_path.as_posix()}",
            "run_id": run_id,
            "score_path": score_path,
            "base_score": None,
            "final_score": None,
            "ts_ms": None,
        }

    ss = load_json(score_path)
    return {
        "missing": False,
        "missing_reason": None,
        "run_id": run_id,
        "score_path": score_path,
        "base_score": float(ss.get("base_score") or 0.0),
        "final_score": float(ss.get("final_score") or 0.0),
        "ts_ms": int(ss.get("ts_ms") or 0),
    }


def main() -> None:
    sites = iter_output_sites()
    rows: list[dict[str, Any]] = []

    for site in sorted(sites, key=lambda s: (s.model.lower(), s.site_id, str(s.output_dir))):
        score = resolve_score(site)
        score_path = score.get("score_path")
        if isinstance(score_path, Path):
            score_path = score_path.relative_to(ROOT).as_posix()

        row = {
            "model": site.model,
            "site_id": site.site_id,
            "output_dir": site.output_dir.relative_to(ROOT).as_posix(),
            "index_html": site.index_html().relative_to(ROOT).as_posix(),
            "index_html_exists": site.index_html().exists(),
            "run_id": score.get("run_id"),
            "base_score": score.get("base_score"),
            "final_score": score.get("final_score"),
            "ts_ms": score.get("ts_ms"),
            "score_path": score_path,
            "missing": score.get("missing"),
            "missing_reason": score.get("missing_reason"),
        }
        rows.append(row)

        per_site = {
            "model": row["model"],
            "site_id": row["site_id"],
            "run_id": row["run_id"],
            "base_score": row["base_score"],
            "final_score": row["final_score"],
            "ts_ms": row["ts_ms"],
            "source_site_score": row["score_path"],
            "missing": row["missing"],
            "missing_reason": row["missing_reason"],
        }
        dump_json(site.score_json(), per_site)

    fieldnames = [
        "model",
        "site_id",
        "output_dir",
        "index_html",
        "index_html_exists",
        "run_id",
        "base_score",
        "final_score",
        "ts_ms",
        "score_path",
        "missing",
        "missing_reason",
    ]

    outputs_rows = [r for r in rows if str(r["output_dir"]).startswith("outputs/")]
    outputs_by_model_rows = [r for r in rows if str(r["output_dir"]).startswith("outputs_by_model/")]

    # Global index files
    OUTPUTS_ROOT.mkdir(parents=True, exist_ok=True)
    dump_json(OUTPUTS_ROOT / "score_index.json", outputs_rows)
    with (OUTPUTS_ROOT / "score_index.csv").open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(outputs_rows)

    if OUTPUTS_BY_MODEL_ROOT.exists():
        dump_json(OUTPUTS_BY_MODEL_ROOT / "score_index.json", outputs_by_model_rows)
        with (OUTPUTS_BY_MODEL_ROOT / "score_index.csv").open("w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames)
            w.writeheader()
            w.writerows(outputs_by_model_rows)

    missing = sum(1 for r in rows if r.get("missing"))
    print(f"[OK] wrote {len(rows)} entries; missing scores: {missing}")
    print(f"[OK] {OUTPUTS_ROOT / 'score_index.json'}")
    print(f"[OK] {OUTPUTS_ROOT / 'score_index.csv'}")
    if OUTPUTS_BY_MODEL_ROOT.exists():
        print(f"[OK] {OUTPUTS_BY_MODEL_ROOT / 'score_index.json'}")
        print(f"[OK] {OUTPUTS_BY_MODEL_ROOT / 'score_index.csv'}")


if __name__ == "__main__":
    main()
