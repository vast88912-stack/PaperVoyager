#!/usr/bin/env python3
"""
run_k_ablation.py — Ablation study: how does performance vary with k variants per block?

Strategy (minimize builds):
  - k=5: reuse existing run_papervoyager_bp_001 scores (no rebuild)
  - k=1..4: for each slug, compute which variant would win with only k candidates
      - If same winners as k=5 → reuse k=5 score (no rebuild)
      - If different → re-merge + build + probe + score
  - k=6,7: generate 2 new variants per block, run Qwen VL eval
      - If any block gets a better variant → re-merge + rebuild + re-benchmark
      - Otherwise → same score as k=5 (no rebuild)

Output: table printed to stdout + written to benchmark/generated/k_ablation_table.md
        LaTeX table at benchmark/generated/k_ablation_table.tex

Usage:
  python tools/run_k_ablation.py [--k 1,2,3,4,5,6,7] [--skip-generate67]
                                  [--only SLUG1,SLUG2] [--force-rebuild]
                                  [--gen-env-file .env.qwen] [--merge-env-file .env]
"""

from __future__ import annotations
import argparse
import dataclasses
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

_REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_REPO))

try:
    from dotenv import load_dotenv
    load_dotenv(_REPO / ".env")
except ImportError:
    pass

# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────

BP_ROOT = _REPO / "outputs" / "block_pipeline"
RESULTS_ROOT = _REPO / "benchmark" / "results" / "codegen_score_v1"
WEBSITES_DIR = _REPO / "benchmark" / "generated" / "model_websites"
GEN_DIR = _REPO / "benchmark" / "generated"

K5_RUN_ID = "run_papervoyager_bp_001"   # existing k=5 benchmark run

# Variant temperatures for k=6,7
EXTRA_TEMPERATURES = [1.4, 1.6]

# Category groupings for the table
PREFIX_GROUPS = {
    "Alg":  ["Algorithm"],
    "DS":   ["DataStructure"],
    "Dist": ["Distributed"],
    "Math": ["Math"],
    "ML":   ["ML"],
    "Phys": ["Physics"],
    "Sys":  ["Sys"],
}

def get_group(slug: str) -> str:
    for g, prefixes in PREFIX_GROUPS.items():
        for p in prefixes:
            if slug.startswith(p):
                return g
    return "Other"


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def load_json(p: Path) -> Any:
    return json.loads(p.read_text(encoding="utf-8"))

def dump_json(p: Path, obj: Any) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def pick_winner_k(variant_probs: list, k: int) -> int:
    """Return index of best variant among first k (ties → lower index)."""
    best_prob = -1.0
    best_idx = 0
    for i in range(min(k, len(variant_probs))):
        p = variant_probs[i] if variant_probs[i] is not None else -999.0
        if p > best_prob:
            best_prob = p
            best_idx = i
    return best_idx


def load_block_evals(slug_dir: Path, num_variants: int = 5) -> list[list[float | None]]:
    """Load yes_prob for each block's variants. Returns list[block][variant]."""
    block_dirs = sorted([d for d in slug_dir.iterdir() if d.is_dir() and d.name.startswith("block_")])
    blocks = []
    for bd in block_dirs:
        variants = []
        for v in range(num_variants):
            ev = bd / f"variant_{v}" / "eval.json"
            if ev.exists():
                d = load_json(ev)
                variants.append(d.get("yes_prob", 0.0))
            else:
                variants.append(None)
        blocks.append(variants)
    return blocks


def get_k5_winners(block_evals: list[list]) -> list[int]:
    return [pick_winner_k(b, 5) for b in block_evals]


def get_k_winners(block_evals: list[list], k: int) -> list[int]:
    return [pick_winner_k(b, k) for b in block_evals]


def winners_same(w_a: list[int], w_b: list[int]) -> bool:
    return w_a == w_b


def get_k5_score(slug: str) -> float | None:
    sf = RESULTS_ROOT / slug / K5_RUN_ID / "site_score.json"
    if not sf.exists():
        return None
    d = load_json(sf)
    return d.get("final_score")


def run_subprocess(cmd: list[str], cwd: Path | None = None) -> tuple[int, str]:
    """Run a subprocess, return (returncode, combined output)."""
    result = subprocess.run(
        cmd, cwd=cwd, capture_output=True, text=True, env=os.environ.copy()
    )
    output = result.stdout + result.stderr
    return result.returncode, output


# ─────────────────────────────────────────────────────────────
# Build a merged app for a specific variant selection
# ─────────────────────────────────────────────────────────────

def _build_with_vite(app_dir: Path, timeout: int = 120) -> tuple[bool, str]:
    """Run vite build directly (node_modules must already be present)."""
    import os as _os
    vite_bin = app_dir / "node_modules" / ".bin" / "vite"
    if not vite_bin.exists():
        return False, "vite binary not found in node_modules"
    try:
        result = subprocess.run(
            [str(vite_bin), "build"],
            cwd=str(app_dir),
            capture_output=True,
            text=True,
            timeout=timeout,
            env={**_os.environ, "SKIP_PREFLIGHT_CHECK": "true"},
        )
        log = result.stdout + result.stderr
        if result.returncode != 0:
            return False, f"vite build failed:\n{log}"
        return True, log
    except subprocess.TimeoutExpired:
        return False, "vite build timed out"
    except Exception as e:
        return False, f"vite build error: {e}"


def build_merged_app_for_k(
    slug: str,
    k: int,
    block_winners: list[int],
    merge_env_file: str,
    force_rebuild: bool = False,
) -> tuple[bool, Path]:
    """
    Re-merge + build for a specific k-variant selection.
    Returns (success, merged_app_dir).
    """
    from tools.block_pipeline.splitter import split_prompt, BlockSpec
    from tools.block_pipeline.merger import merge_blocks, MergeFailedError
    from generate_apps import load_codegen_config, setup_project_structure
    from tools.block_pipeline.renderer import build_variant

    slug_dir = BP_ROOT / slug
    merged_app_dir = slug_dir / f"_merged_app_k{k}"
    # Use a k-specific work directory so we don't clobber merged_App.tsx
    k_work_dir = slug_dir / f"_k{k}_work"
    k_work_dir.mkdir(parents=True, exist_ok=True)
    merged_tsx_path = k_work_dir / "merged_App.tsx"

    # If already built, skip unless forced
    if not force_rebuild and (merged_app_dir / "dist" / "index.html").exists():
        print(f"    [{slug} k={k}] Already built, skipping.")
        return True, merged_app_dir

    # Load block specs
    try:
        from tools.block_pipeline.pipeline import _find_prompt_file
        prompt_path = _find_prompt_file(slug)
    except FileNotFoundError as e:
        print(f"    [{slug} k={k}] Prompt not found: {e}")
        return False, merged_app_dir

    blocks = split_prompt(prompt_path)

    # Collect best codes for the k-selection
    best_codes = []
    for i, block in enumerate(blocks):
        block_dir = slug_dir / f"block_{block.index}_{block.name}"
        winner_idx = block_winners[i] if i < len(block_winners) else 0
        code_path = block_dir / f"variant_{winner_idx}" / "code.tsx"
        if code_path.exists():
            best_codes.append(code_path.read_text(encoding="utf-8"))
        else:
            best_codes.append(
                f"// Missing code for block {block.index}\n"
                f"export default function App() {{ return <div>Block {block.index}</div>; }}"
            )

    # Load merge env
    try:
        from dotenv import load_dotenv as _lde
        lde = _lde
    except ImportError:
        lde = None
    if lde:
        _REPO_ENV = _REPO / ".env"
        if _REPO_ENV.exists():
            lde(_REPO_ENV)
        env_path = Path(merge_env_file)
        if not env_path.is_absolute():
            env_path = _REPO / env_path
        if env_path.exists():
            lde(env_path, override=True)

    class _Args:
        provider = ""
        model = ""
        base_url = ""
        api_key = ""

    merge_cfg = dataclasses.replace(
        load_codegen_config(_Args()), max_output_tokens=65536
    )

    # Skip merge if tsx already exists in k_work_dir
    if not force_rebuild and merged_tsx_path.exists():
        print(f"    [{slug} k={k}] merged_App.tsx (k{k}) exists, skipping merge.")
    else:
        print(f"    [{slug} k={k}] Merging {len(blocks)} blocks (winners={block_winners})...")
        try:
            merge_blocks(
                slug=slug,
                blocks=blocks,
                best_codes=best_codes,
                merge_cfg=merge_cfg,
                out_dir=k_work_dir,
                skip_if_exists=False,
            )
        except MergeFailedError as e:
            print(f"    [{slug} k={k}] Merge failed: {e}")
            return False, merged_app_dir

    if not merged_tsx_path.exists():
        print(f"    [{slug} k={k}] merged_App.tsx missing after merge")
        return False, merged_app_dir

    # Build
    print(f"    [{slug} k={k}] Building...")
    code = merged_tsx_path.read_text(encoding="utf-8")
    setup_project_structure(str(merged_app_dir))
    app_tsx = merged_app_dir / "src" / "App.tsx"
    app_tsx.write_text(code, encoding="utf-8")

    # Symlink node_modules from existing _merged_app to skip npm install
    nm_link = merged_app_dir / "node_modules"
    if not nm_link.exists():
        src_nm = slug_dir / "_merged_app" / "node_modules"
        if not src_nm.exists():
            # Try other slugs that have node_modules
            for other in BP_ROOT.iterdir():
                candidate = other / "_merged_app" / "node_modules"
                if candidate.exists():
                    src_nm = candidate
                    break
        if src_nm.exists():
            nm_link.symlink_to(src_nm)
            print(f"    [{slug} k={k}] Symlinked node_modules from {src_nm}")

    # If node_modules is already present (symlinked), skip npm install and run vite directly
    if nm_link.exists():
        ok, log = _build_with_vite(merged_app_dir)
    else:
        ok, log = build_variant(merged_app_dir)
    (slug_dir / f"merged_build_k{k}.log").write_text(log[-5000:], encoding="utf-8")
    if ok:
        print(f"    [{slug} k={k}] Build OK ✅")
    else:
        print(f"    [{slug} k={k}] Build FAILED ❌")
    return ok, merged_app_dir


# ─────────────────────────────────────────────────────────────
# Run benchmark (module probe + deterministic scorer)
# ─────────────────────────────────────────────────────────────

def run_probe_and_score(
    websites_json: Path,
    run_id: str,
    only_site: str = "",
    headless: bool = True,
) -> None:
    """Run module probe + codegen_scorer for a websites JSON."""
    cmd_probe = [
        sys.executable, "-m", "benchmark.runner.run_module_probe_suite",
        "--websites", str(websites_json),
        "--results_root", str(RESULTS_ROOT.parent),
        "--run_id", run_id,
    ]
    if headless:
        cmd_probe.append("--headless")
    if only_site:
        cmd_probe += ["--only_site", only_site]

    print(f"    Running module probe (run_id={run_id}, site={only_site or 'all'})...")
    rc, out = run_subprocess(cmd_probe, cwd=_REPO)
    if rc != 0:
        print(f"    [WARNING] Module probe exited {rc}")
    if out:
        print("    " + "\n    ".join(out[-2000:].splitlines()[-20:]))

    cmd_score = [
        sys.executable, "-m", "benchmark.evaluation.codegen_scorer",
        "--websites", str(websites_json),
        "--results_root", str(RESULTS_ROOT.parent),
        "--run_id", run_id,
        "--llm_missing_zero",
    ]
    print(f"    Running scorer (run_id={run_id})...")
    rc2, out2 = run_subprocess(cmd_score, cwd=_REPO)
    if rc2 != 0:
        print(f"    [WARNING] Scorer exited {rc2}")


def get_run_score(slug: str, run_id: str) -> float | None:
    sf = RESULTS_ROOT / slug / run_id / "site_score.json"
    if not sf.exists():
        return None
    d = load_json(sf)
    return d.get("final_score")


# ─────────────────────────────────────────────────────────────
# Generate + eval k=6,7 variants
# ─────────────────────────────────────────────────────────────

def generate_extra_variants(
    slugs: list[str],
    gen_env_file: str,
    force: bool = False,
) -> None:
    """Generate variant_5 and variant_6 for all blocks of given slugs."""
    from tools.block_pipeline.pipeline import _find_prompt_file, run_batch_generation
    from tools.block_pipeline.splitter import split_prompt

    slug_blocks: dict[str, list] = {}
    for slug in slugs:
        try:
            prompt_path = _find_prompt_file(slug)
        except FileNotFoundError:
            continue
        blocks = split_prompt(prompt_path)
        slug_blocks[slug] = blocks

    # For variant 5 and 6, call generator with a custom temperature list
    # We extend VARIANT_TEMPERATURES temporarily
    import tools.block_pipeline.generator as _gen_mod
    orig_temps = _gen_mod.VARIANT_TEMPERATURES[:]

    from generate_apps import load_codegen_config, call_codegen_llm, clean_code_fence, ensure_export_default
    import dataclasses as _dc
    from tools.block_pipeline.generator import _build_block_prompt

    try:
        from dotenv import load_dotenv as _lde
        _lde(_REPO / ".env")
        env_path = Path(gen_env_file)
        if not env_path.is_absolute():
            env_path = _REPO / env_path
        if env_path.exists():
            _lde(env_path, override=True)
    except ImportError:
        pass

    class _Args:
        provider = ""
        model = ""
        base_url = ""
        api_key = ""

    gen_cfg = load_codegen_config(_Args())

    for variant_idx, temp in [(5, 1.4), (6, 1.6)]:
        print(f"\n  Generating variant_{variant_idx} (temp={temp}) for {len(slug_blocks)} slugs...")
        for slug, blocks in slug_blocks.items():
            slug_dir = BP_ROOT / slug
            for block in blocks:
                block_dir = slug_dir / f"block_{block.index}_{block.name}"
                block_dir.mkdir(parents=True, exist_ok=True)
                variant_dir = block_dir / f"variant_{variant_idx}"
                variant_dir.mkdir(parents=True, exist_ok=True)
                code_path = variant_dir / "code.tsx"
                if not force and code_path.exists():
                    continue

                print(f"    {slug} | {block.title} | variant {variant_idx}")
                cfg_v = _dc.replace(gen_cfg, temperature=min(temp, 1.0) if gen_cfg.provider == "gemini" else temp)
                prompt = _build_block_prompt(block, variant_idx)

                max_retries = 3
                text = None
                for attempt in range(1, max_retries + 1):
                    try:
                        text = call_codegen_llm(cfg=cfg_v, prompt=prompt)
                        if text and text.strip():
                            break
                    except Exception as e:
                        wait = 2 ** attempt
                        print(f"      API error attempt {attempt}: {e}")
                        if attempt < max_retries:
                            time.sleep(wait)
                        text = None

                if text and text.strip():
                    code = clean_code_fence(text)
                    code, _ = ensure_export_default(code)
                    code_path.write_text(code, encoding="utf-8")
                else:
                    code_path.write_text(
                        "// Empty response\nexport default function App() { return <div>Empty</div>; }",
                        encoding="utf-8",
                    )


def render_extra_variants(slugs: list[str], headless: bool = True) -> None:
    """Build + screenshot variant_5 and variant_6 for all blocks."""
    from tools.block_pipeline.renderer import render_variant
    for slug in slugs:
        slug_dir = BP_ROOT / slug
        block_dirs = sorted([d for d in slug_dir.iterdir() if d.is_dir() and d.name.startswith("block_")])
        for bd in block_dirs:
            for v in [5, 6]:
                variant_dir = bd / f"variant_{v}"
                code_path = variant_dir / "code.tsx"
                if not code_path.exists():
                    continue
                print(f"  Rendering {slug}/{bd.name}/variant_{v}...")
                render_variant(
                    code_tsx_path=code_path,
                    variant_dir=variant_dir,
                    headless=headless,
                    skip_if_exists=True,
                )


def eval_extra_variants(slugs: list[str], qwen_model: str) -> None:
    """Run Qwen VL eval on variant_5 and variant_6."""
    from tools.block_pipeline.evaluator import evaluate_block_variants, unload_model
    from tools.block_pipeline.splitter import split_prompt
    from tools.block_pipeline.pipeline import _find_prompt_file

    for slug in slugs:
        slug_dir = BP_ROOT / slug
        try:
            prompt_path = _find_prompt_file(slug)
            blocks = split_prompt(prompt_path)
        except Exception:
            continue

        print(f"  Evaluating extra variants for {slug}...")
        for block in blocks:
            block_dir = slug_dir / f"block_{block.index}_{block.name}"
            # Collect variant dirs that have screenshots but no eval yet
            variant_dirs = []
            for v in [5, 6]:
                vd = block_dir / f"variant_{v}"
                if (vd / "screenshot.png").exists():
                    variant_dirs.append(vd)
            if not variant_dirs:
                continue
            # evaluate_block_variants writes eval.json into each variant dir
            evaluate_block_variants(
                block_index=block.index,
                block_title=block.title,
                block_description=block.description,
                variant_dirs=variant_dirs,
                model_id=qwen_model,
                skip_if_exists=True,
            )

    unload_model()


# ─────────────────────────────────────────────────────────────
# Main ablation logic
# ─────────────────────────────────────────────────────────────

def make_websites_json(slug_to_url: dict[str, str], suite_id: str) -> dict:
    return {
        "suite_id": suite_id,
        "websites": [{"id": sid, "start_url": url} for sid, url in slug_to_url.items()],
    }


def run_ablation(args: argparse.Namespace) -> None:
    # Discover all slugs
    all_slugs = sorted([
        d.name for d in BP_ROOT.iterdir()
        if d.is_dir() and (d / "blocks.json").exists() and "_" in d.name
    ])
    if args.only:
        only_set = set(args.only.split(","))
        all_slugs = [s for s in all_slugs if s in only_set]

    k_list = [int(x) for x in args.k.split(",")]
    print(f"Slugs ({len(all_slugs)}): {all_slugs}")
    print(f"K values: {k_list}")

    # Load existing k=5 scores
    k5_scores: dict[str, float | None] = {s: get_k5_score(s) for s in all_slugs}
    print(f"\nExisting k=5 scores loaded: {sum(1 for v in k5_scores.values() if v is not None)}/{len(all_slugs)}")

    # Load block evals (5 variants each)
    block_evals: dict[str, list[list]] = {}
    for slug in all_slugs:
        block_evals[slug] = load_block_evals(BP_ROOT / slug, num_variants=5)

    # ── k = 6, 7: generate + eval extra variants ───────────────
    if any(k in k_list for k in [6, 7]) and not args.skip_generate67:
        print(f"\n{'='*60}")
        print("  GENERATING EXTRA VARIANTS (k=6,7)")
        print(f"{'='*60}")
        generate_extra_variants(all_slugs, gen_env_file=args.gen_env_file, force=args.force_rebuild)

        print("\n  Rendering extra variants...")
        render_extra_variants(all_slugs, headless=args.headless)

        print("\n  Evaluating extra variants with Qwen VL...")
        eval_extra_variants(all_slugs, qwen_model=args.qwen_model)

        # Reload block evals with 7 variants
        for slug in all_slugs:
            block_evals[slug] = load_block_evals(BP_ROOT / slug, num_variants=7)
        print("  Extra variant evals loaded.")

    # ── Process each k ────────────────────────────────────────
    all_scores: dict[int, dict[str, float | None]] = {}

    for k in k_list:

        print(f"\n{'='*60}")
        print(f"  PROCESSING k={k}")
        print(f"{'='*60}")

        # Determine which slugs need rebuild
        rebuild_needed = []
        reuse_k5 = []
        for slug in all_slugs:
            evals = block_evals[slug]
            w_k = get_k_winners(evals, k)
            w_5 = get_k5_winners(evals)
            # k=5: always rebuild all slugs (use new merger for fair comparison)
            if k != 5 and winners_same(w_k, w_5):
                reuse_k5.append(slug)
            else:
                rebuild_needed.append((slug, w_k))

        print(f"  Reuse k=5 scores: {len(reuse_k5)} slugs")
        print(f"  Need rebuild: {len(rebuild_needed)} slugs: {[s for s, _ in rebuild_needed]}")

        # Start with k=5 scores for reused slugs
        k_scores: dict[str, float | None] = {}
        for slug in reuse_k5:
            k_scores[slug] = k5_scores.get(slug)

        if not rebuild_needed:
            all_scores[k] = k_scores
            continue

        # Build new merged apps for changed slugs
        # Create websites JSON for this k
        run_id = f"run_papervoyager_bp_k{k}_001"

        slug_to_url: dict[str, str] = {}
        build_succeeded: list[str] = []

        for slug, block_winners in rebuild_needed:
            print(f"\n  [{slug}] k={k}, winners={block_winners}")
            ok, merged_app_dir = build_merged_app_for_k(
                slug=slug,
                k=k,
                block_winners=block_winners,
                merge_env_file=args.merge_env_file,
                force_rebuild=args.force_rebuild,
            )
            if ok:
                url = f"http://127.0.0.1:8000/outputs/block_pipeline/{slug}/_merged_app_k{k}/dist/index.html"
                slug_to_url[slug] = url
                build_succeeded.append(slug)
            else:
                print(f"    [{slug} k={k}] Build failed, using k=5 score as fallback")
                k_scores[slug] = k5_scores.get(slug)  # fallback to k=5

        if slug_to_url:
            websites_path = WEBSITES_DIR / f"websites_bp_k{k}.json"
            dump_json(websites_path, make_websites_json(slug_to_url, f"bp_k{k}"))

            print(f"\n  Running probe+score for k={k} ({len(slug_to_url)} sites)...")
            run_probe_and_score(websites_path, run_id=run_id, headless=args.headless)

            # Collect scores
            for slug in build_succeeded:
                score = get_run_score(slug, run_id)
                if score is not None:
                    k_scores[slug] = score
                else:
                    print(f"    [{slug} k={k}] No score found after probe, fallback to k=5")
                    k_scores[slug] = k5_scores.get(slug)

        all_scores[k] = k_scores

    # ── Print table ───────────────────────────────────────────
    print_table(all_scores, all_slugs, k_list)
    write_table(all_scores, all_slugs, k_list)


# ─────────────────────────────────────────────────────────────
# Table printing
# ─────────────────────────────────────────────────────────────

GROUPS_ORDER = ["Alg", "DS", "Dist", "Math", "ML", "Phys", "Sys"]


def compute_group_avgs(scores: dict[str, float | None], all_slugs: list[str]) -> dict[str, float]:
    """Compute per-group averages (excludes 'Other' group)."""
    group_vals: dict[str, list[float]] = {}
    for slug in all_slugs:
        g = get_group(slug)
        if g == "Other":
            continue
        v = scores.get(slug)
        if v is not None:
            group_vals.setdefault(g, []).append(v)
    return {g: (sum(vals) / len(vals) if vals else 0.0) for g, vals in group_vals.items()}


def compute_overall(scores: dict[str, float | None], all_slugs: list[str]) -> float:
    """Overall mean across all slugs with scores, excluding 'Other' group."""
    vals = [scores[s] for s in all_slugs if get_group(s) != "Other" and scores.get(s) is not None]
    return sum(vals) / len(vals) if vals else 0.0


def print_table(all_scores: dict[int, dict], all_slugs: list[str], k_list: list[int]) -> None:
    print(f"\n{'='*80}")
    print("  K-ABLATION TABLE (k = number of variants per block)")
    print(f"{'='*80}")

    header = f"{'k':>6} | " + " | ".join(f"{g:>6}" for g in GROUPS_ORDER) + f" | {'Overall':>7}"
    print(header)
    print("-" * len(header))

    for k in sorted(k_list):
        scores = all_scores.get(k, {})
        avgs = compute_group_avgs(scores, all_slugs)
        overall = compute_overall(scores, all_slugs)

        label = f"k={k}" + (" (Ours)" if k == 5 else "")
        row = f"{label:>6} | " + " | ".join(
            f"{avgs.get(g, 0)*100:>6.1f}" for g in GROUPS_ORDER
        ) + f" | {overall*100:>7.1f}"
        print(row)

    print(f"{'='*80}")


def write_table(all_scores: dict[int, dict], all_slugs: list[str], k_list: list[int]) -> None:
    GEN_DIR.mkdir(parents=True, exist_ok=True)
    lines = ["# K-Ablation Table\n",
             "| k | " + " | ".join(GROUPS_ORDER) + " | Overall |",
             "| --- | " + " | ".join(["---"] * len(GROUPS_ORDER)) + " | --- |"]
    for k in sorted(k_list):
        scores = all_scores.get(k, {})
        avgs = compute_group_avgs(scores, all_slugs)
        overall = compute_overall(scores, all_slugs)
        label = f"k={k}" + (" (Ours)" if k == 5 else "")
        row = f"| {label} | " + " | ".join(f"{avgs.get(g,0)*100:.1f}" for g in GROUPS_ORDER) + f" | {overall*100:.1f} |"
        lines.append(row)
    md_path = GEN_DIR / "k_ablation_table.md"
    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nMarkdown table → {md_path}")

    # LaTeX
    latex_lines = [
        r"\begin{table}[t]",
        r"\centering",
        r"\setlength{\tabcolsep}{2.2mm}",
        r"\resizebox{\columnwidth}{!}{%",
        r"\begin{tabular}{@{}c" + "c" * len(GROUPS_ORDER) + r"c@{}}",
        r"\toprule",
        "Metric & " + " & ".join(GROUPS_ORDER) + r" & Overall \\",
        r"\midrule",
    ]
    for k in sorted(k_list):
        scores = all_scores.get(k, {})
        avgs = compute_group_avgs(scores, all_slugs)
        overall = compute_overall(scores, all_slugs)
        is_ours = (k == 5)
        vals = " & ".join(
            (r"\textbf{" if is_ours else "") + f"{avgs.get(g,0)*100:.1f}" + (r"}" if is_ours else "")
            for g in GROUPS_ORDER
        )
        ov_str = (r"\textbf{" if is_ours else "") + f"{overall*100:.1f}" + (r"}" if is_ours else "")
        prefix = r"\midrule" + "\n" if is_ours else ""
        latex_lines.append(prefix + f"$k={k}$ & {vals} & {ov_str} \\\\")
    latex_lines += [
        r"\bottomrule",
        r"\end{tabular}%",
        r"}",
        r"\caption{",
        r"    Task success rates after averaging tasks with the same prefix.",
        r"    Prefix groups include " + ", ".join(GROUPS_ORDER) + r".",
        r"    Overall is the mean across all topics.",
        r"}",
        r"\label{tab:task_breakdown_k_ablation}",
        r"\end{table}",
    ]
    tex_path = GEN_DIR / "k_ablation_table.tex"
    tex_path.write_text("\n".join(latex_lines) + "\n", encoding="utf-8")
    print(f"LaTeX table       → {tex_path}")

    # Also dump raw scores JSON for debugging
    raw = {str(k): {s: (v * 100 if v is not None else None) for s, v in sc.items()}
           for k, sc in all_scores.items()}
    dump_json(GEN_DIR / "k_ablation_raw_scores.json", raw)
    print(f"Raw scores JSON   → {GEN_DIR / 'k_ablation_raw_scores.json'}")


# ─────────────────────────────────────────────────────────────
# Dry-run: just print what would be built
# ─────────────────────────────────────────────────────────────

def dry_run(args: argparse.Namespace) -> None:
    all_slugs = sorted([
        d.name for d in BP_ROOT.iterdir()
        if d.is_dir() and (d / "blocks.json").exists() and "_" in d.name
    ])
    if args.only:
        only_set = set(args.only.split(","))
        all_slugs = [s for s in all_slugs if s in only_set]

    k_list = [int(x) for x in args.k.split(",")]
    block_evals = {s: load_block_evals(BP_ROOT / s, num_variants=5) for s in all_slugs}
    k5_scores = {s: get_k5_score(s) for s in all_slugs}

    # Precompute group averages for k=5
    avgs5 = compute_group_avgs(k5_scores, all_slugs)
    overall5 = compute_overall(k5_scores, all_slugs)

    print("DRY RUN — what would be built:\n")
    total_rebuilds = 0
    for k in sorted(k_list):
        if k == 5:
            print(f"k=5: no build (reuse existing)")
            continue
        rebuild = []
        for slug in all_slugs:
            evals = block_evals[slug]
            if not winners_same(get_k_winners(evals, k), get_k5_winners(evals)):
                rebuild.append(slug)
        print(f"k={k}: {len(rebuild)} rebuilds: {rebuild}")
        total_rebuilds += len(rebuild)

    if any(k >= 6 for k in k_list):
        total_blocks = sum(len(block_evals[s]) for s in all_slugs)
        print(f"\nk=6,7: need to generate 2×{total_blocks} = {2*total_blocks} new variant code files")
        print(f"       then render (Playwright build+screenshot) all of them")
        print(f"       then Qwen VL eval, then conditionally re-merge+rebuild")

    print(f"\nTotal (topic, k) pairs to re-merge+build+benchmark: {total_rebuilds}")
    print(f"\nk=5 group averages (baseline):")
    for g in GROUPS_ORDER:
        print(f"  {g}: {avgs5.get(g, 0)*100:.1f}%")
    print(f"  Overall: {overall5*100:.1f}%")


# ─────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--k", default="1,2,3,4,5", help="Comma-sep k values to compute (default: 1,2,3,4,5)")
    ap.add_argument("--only", default="", help="Comma-sep list of slugs to restrict to")
    ap.add_argument("--gen-env-file", default=".env.qwen", help="Dotenv for generation LLM (k=6,7)")
    ap.add_argument("--merge-env-file", default=".env", help="Dotenv for merge LLM")
    ap.add_argument("--qwen-model", default="Qwen/Qwen2.5-VL-3B-Instruct", help="Qwen VL model for eval")
    ap.add_argument("--headless", action="store_true", default=True, help="Playwright headless")
    ap.add_argument("--no-headless", dest="headless", action="store_false")
    ap.add_argument("--skip-generate67", action="store_true", help="Skip generating k=6,7 variants")
    ap.add_argument("--force-rebuild", action="store_true", help="Force rebuild even if already exists")
    ap.add_argument("--dry-run", action="store_true", help="Print what would be built, don't execute")
    args = ap.parse_args()

    if args.dry_run:
        dry_run(args)
    else:
        run_ablation(args)


if __name__ == "__main__":
    main()
