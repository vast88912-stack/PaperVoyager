"""
pipeline.py — Orchestrator for block-level generation + Qwen3-VL evaluation.

Usage:
  python tools/block_pipeline/pipeline.py \\
    --prompts Algorithm_Dynamic_Programming,Math_Chaos_Lorenz,ML_Gradient_Descent,Physics_Gravity_Orbits,Sys_Virtual_Memory \\
    --gen-env-file .env.qwen \\
    --merge-env-file .env \\
    --out-base outputs/block_pipeline \\
    --qwen-model Qwen/Qwen2.5-VL-3B-Instruct \\
    --headless

Stages per prompt slug:
  1. split       — parse prompt → BlockSpec list → blocks.json
  2. generate    — 5 TSX variants per block via LLM
  3. render      — build + screenshot each variant
  4. evaluate    — Qwen3-VL Yes/No logit scoring
  5. merge       — LLM merges best variants into final App.tsx
  6. score       — (optional) run GPT-4V benchmark judge
"""

from __future__ import annotations
import argparse
import json
import os
import subprocess
import sys
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_REPO_ROOT))

from generate_apps import load_codegen_config, setup_project_structure
from tools.block_pipeline.splitter import split_prompt, BlockSpec
from tools.block_pipeline.generator import generate_variants
from tools.block_pipeline.renderer import render_variant
from tools.block_pipeline.evaluator import evaluate_block_variants, unload_model
from tools.block_pipeline.merger import merge_blocks, MergeFailedError

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _load_env(env_file: str) -> None:
    if load_dotenv is None:
        return
    load_dotenv(_REPO_ROOT / ".env")
    load_dotenv()
    if env_file:
        path = Path(env_file)
        if not path.is_absolute():
            candidate = _REPO_ROOT / path
            path = candidate if candidate.exists() else path
        load_dotenv(path, override=True)


def _find_prompt_file(slug: str) -> Path:
    """Find prompt file for a slug (CamelCase or kebab-case)."""
    prompts_dir = _REPO_ROOT / "prompts"
    # Try direct match
    direct = prompts_dir / f"{slug}.txt"
    if direct.exists():
        return direct
    # Try case-insensitive match
    for f in prompts_dir.glob("*.txt"):
        if f.stem.lower() == slug.lower():
            return f
    raise FileNotFoundError(f"Prompt file not found for slug: {slug} in {prompts_dir}")


def _build_merged_app(merged_tsx_path: Path, out_app_dir: Path) -> tuple[bool, str]:
    """Scaffold and build the merged App.tsx into a Vite project."""
    from generate_apps import setup_project_structure

    code = merged_tsx_path.read_text(encoding="utf-8")
    setup_project_structure(str(out_app_dir))
    app_tsx = out_app_dir / "src" / "App.tsx"
    app_tsx.write_text(code, encoding="utf-8")

    from tools.block_pipeline.renderer import build_variant
    return build_variant(out_app_dir)


# ─────────────────────────────────────────────────────────────
# Per-slug pipeline
# ─────────────────────────────────────────────────────────────

def run_pipeline_for_slug(
    slug: str,
    gen_env_file: str,
    merge_env_file: str,
    out_base: Path,
    qwen_model: str,
    headless: bool,
    num_variants: int,
    skip_generate: bool,
    skip_render: bool,
    skip_eval: bool,
    skip_merge: bool,
    gpu_lock=None,          # threading.Lock — held only during Qwen eval
) -> dict:
    print(f"\n{'='*60}")
    print(f"  SLUG: {slug}")
    print(f"{'='*60}")

    slug_dir = out_base / slug
    slug_dir.mkdir(parents=True, exist_ok=True)

    result = {"slug": slug, "blocks": [], "merged": False, "error": None}

    # ── Stage 1: Split ──────────────────────────────────────
    print(f"\n[1/5] Splitting prompt → blocks...")
    try:
        prompt_path = _find_prompt_file(slug)
    except FileNotFoundError as e:
        result["error"] = str(e)
        print(f"  ❌ {e}")
        return result

    blocks = split_prompt(prompt_path)
    blocks_json_path = slug_dir / "blocks.json"
    blocks_data = [
        {
            "index": b.index,
            "name": b.name,
            "title": b.title,
            "description": b.description,
        }
        for b in blocks
    ]
    blocks_json_path.write_text(json.dumps(blocks_data, indent=2), encoding="utf-8")
    print(f"  ✅ {len(blocks)} blocks → {blocks_json_path}")
    for b in blocks:
        print(f"     [{b.index}] {b.title}")

    # ── Stage 2: Generate variants (called externally in batch mode) ──
    # Generation is now handled by run_batch_generation() which iterates
    # iter → slug → block to spread API load evenly across all slugs.
    if skip_generate:
        print(f"\n[2/5] Skipping generation (--skip-generate)")

    # ── Stage 3: Render variants ────────────────────────────
    if not skip_render:
        print(f"\n[3/5] Rendering variants (build + screenshot)...")
        for block in blocks:
            block_dir = slug_dir / f"block_{block.index}_{block.name}"
            for j in range(num_variants):
                variant_dir = block_dir / f"variant_{j}"
                if not variant_dir.exists():
                    print(f"    [block {block.index} variant {j}] Not found, skipping")
                    continue
                code_path = variant_dir / "code.tsx"
                if not code_path.exists():
                    print(f"    [block {block.index} variant {j}] No code.tsx, skipping")
                    continue
                print(f"    [block {block.index} variant {j}] Rendering...")
                render_variant(
                    code_tsx_path=code_path,
                    variant_dir=variant_dir,
                    headless=headless,
                    skip_if_exists=True,
                )
    else:
        print(f"\n[3/5] Skipping render (--skip-render)")

    # ── Stage 4: Evaluate variants ──────────────────────────
    best_variant_indices: list[int] = []
    best_codes: list[str] = []

    if not skip_eval:
        print(f"\n[4/5] Evaluating variants with Qwen3-VL...")

        # When slug_workers > 1, run eval in a subprocess to isolate CUDA context.
        # A CUDA device-side assert in one slug will NOT corrupt others this way.
        use_subprocess_eval = (gpu_lock is not None)

        if use_subprocess_eval:
            import tempfile
            result_file = tempfile.mktemp(suffix=f"_eval_{slug}.json")
            eval_script = _REPO_ROOT / "tools" / "block_pipeline" / "eval_slug_subprocess.py"
            cmd = [
                sys.executable, str(eval_script),
                "--slug", slug,
                "--out-base", str(slug_dir.parent),
                "--num-variants", str(num_variants),
                "--qwen-model", qwen_model,
                "--result-file", result_file,
            ]
            print(f"  [{slug}] Running eval subprocess (isolated CUDA)...")
            if gpu_lock is not None:
                print(f"  [{slug}] Waiting for GPU lock...")
                gpu_lock.acquire()
                print(f"  [{slug}] GPU lock acquired.")
            try:
                proc = subprocess.run(cmd, capture_output=False, text=True)
                if proc.returncode != 0:
                    raise RuntimeError(f"Eval subprocess exited with code {proc.returncode}")
                sub_result = json.loads(Path(result_file).read_text())
                if sub_result.get("error"):
                    raise RuntimeError(sub_result["error"])
                for br in sub_result.get("blocks", []):
                    best_variant_indices.append(br["best_variant"])
                result["blocks"] = sub_result.get("blocks", [])
            finally:
                if gpu_lock is not None:
                    gpu_lock.release()
                    print(f"  [{slug}] GPU lock released.")
                try:
                    Path(result_file).unlink(missing_ok=True)
                except Exception:
                    pass

            # Load best codes from saved best_variant.json
            for block in blocks:
                block_dir = slug_dir / f"block_{block.index}_{block.name}"
                bvj = block_dir / "best_variant.json"
                best_idx = json.loads(bvj.read_text()).get("winner", 0) if bvj.exists() else 0
                best_code_path = block_dir / f"variant_{best_idx}" / "code.tsx"
                if best_code_path.exists():
                    best_codes.append(best_code_path.read_text(encoding="utf-8"))
                else:
                    best_codes.append(f"// Missing code for block {block.index}\nexport default function App() {{ return <div>Block {block.index}</div>; }}")

        else:
            # Single-worker path: run in-process
            try:
              for block in blocks:
                block_dir = slug_dir / f"block_{block.index}_{block.name}"
                variant_dirs = [block_dir / f"variant_{j}" for j in range(num_variants)]
                variant_dirs = [d for d in variant_dirs if d.exists()]

                best_idx, eval_results = evaluate_block_variants(
                    block_index=block.index,
                    block_title=block.title,
                    block_description=block.description,
                    variant_dirs=variant_dirs,
                    model_id=qwen_model,
                    skip_if_exists=True,
                )
                best_variant_indices.append(best_idx)

                best_json = {
                    "winner": best_idx,
                    "yes_prob": eval_results[best_idx].get("yes_prob", 0.0) if eval_results else 0.0,
                    "all_evals": eval_results,
                }
                (block_dir / "best_variant.json").write_text(json.dumps(best_json, indent=2), encoding="utf-8")
                print(f"  Block {block.index} '{block.title}': best variant={best_idx} (yes_prob={best_json['yes_prob']:.3f})")

                best_code_path = block_dir / f"variant_{best_idx}" / "code.tsx"
                if best_code_path.exists():
                    best_codes.append(best_code_path.read_text(encoding="utf-8"))
                else:
                    best_codes.append(f"// Missing code for block {block.index}\nexport default function App() {{ return <div>Block {block.index}</div>; }}")

              unload_model()
              result["blocks"] = [
                  {"index": b.index, "title": b.title, "best_variant": best_variant_indices[i] if i < len(best_variant_indices) else 0}
                  for i, b in enumerate(blocks)
              ]
            except Exception as e:
                raise
    else:
        print(f"\n[4/5] Skipping evaluation (--skip-eval)")
        # Load best variant codes from existing best_variant.json
        for block in blocks:
            block_dir = slug_dir / f"block_{block.index}_{block.name}"
            best_json_path = block_dir / "best_variant.json"
            if best_json_path.exists():
                best_json = json.loads(best_json_path.read_text())
                best_idx = best_json.get("winner", 0)
            else:
                best_idx = 0
            best_variant_indices.append(best_idx)
            best_code_path = block_dir / f"variant_{best_idx}" / "code.tsx"
            if best_code_path.exists():
                best_codes.append(best_code_path.read_text(encoding="utf-8"))
            else:
                best_codes.append(f"// Missing\nexport default function App() {{ return <div/>; }}")

    # ── Stage 5: Merge ──────────────────────────────────────
    if not skip_merge and best_codes:
        print(f"\n[5/5] Merging {len(blocks)} best blocks into final App.tsx...")
        _load_env(merge_env_file)

        class _Args:
            provider = ""
            model = ""
            base_url = ""
            api_key = ""

        import dataclasses as _dc
        merge_cfg = _dc.replace(load_codegen_config(_Args()), max_output_tokens=65536)

        try:
            merged_path = merge_blocks(
                slug=slug,
                blocks=blocks,
                best_codes=best_codes,
                merge_cfg=merge_cfg,
                out_dir=slug_dir,
                skip_if_exists=True,
            )
        except MergeFailedError as e:
            print(f"\n  ❌ MERGE FAILED for '{slug}'")
            print("  " + "\n  ".join(str(e).splitlines()))
            result["error"] = f"MergeFailedError: {e}"
            return result

        # Build merged app
        merged_app_dir = slug_dir / "_merged_app"
        print(f"  Building merged app...")
        build_ok, build_log = _build_merged_app(merged_path, merged_app_dir)
        result["merged"] = build_ok
        (slug_dir / "merged_build.log").write_text(build_log[-5000:], encoding="utf-8")
        if build_ok:
            print(f"  ✅ Merged app built successfully!")
        else:
            print(
                f"  ❌ Merged app build failed.\n"
                f"  Log: {slug_dir / 'merged_build.log'}\n"
                f"  To fix:\n"
                f"    1. Edit {merged_path} to resolve TypeScript/import errors\n"
                f"    2. Rebuild: cd {merged_app_dir} && npm run build\n"
                f"    3. Or re-run merge stage: python tools/block_pipeline/pipeline.py \\\n"
                f"         --prompts {slug} --skip-generate --skip-render --skip-eval"
            )
    else:
        print(f"\n[5/5] Skipping merge (--skip-merge or no codes)")

    return result


# ─────────────────────────────────────────────────────────────
# Batch generation: iter → slug → block
# ─────────────────────────────────────────────────────────────

def run_batch_generation(
    slugs: list[str],
    slug_blocks: dict[str, list],   # slug → List[BlockSpec]
    out_base: Path,
    gen_env_file: str,
    num_variants: int,
    workers: int = 1,
) -> None:
    """
    Generate variants across all slugs in round-robin order:
      for variant_index in range(num_variants):          <- outer loop
        for slug in slugs:                               <- middle
          for block in blocks[slug]:                     <- inner

    With workers > 1, up to `workers` API calls run concurrently via
    ThreadPoolExecutor (safe: each task writes to a unique path).
    """
    _load_env(gen_env_file)

    class _Args:
        provider = ""
        model = ""
        base_url = ""
        api_key = ""

    gen_cfg = load_codegen_config(_Args())

    import dataclasses
    from tools.block_pipeline.generator import _build_block_prompt, VARIANT_TEMPERATURES as VT
    from generate_apps import call_codegen_llm, clean_code_fence, ensure_export_default

    # Pre-create block dirs and spec files
    for slug, blocks in slug_blocks.items():
        slug_dir = out_base / slug
        for block in blocks:
            block_dir = slug_dir / f"block_{block.index}_{block.name}"
            block_dir.mkdir(parents=True, exist_ok=True)
            spec_path = block_dir / "spec.md"
            if not spec_path.exists():
                spec_path.write_text(
                    f"# Block {block.index}: {block.title}\n\n{block.description}\n",
                    encoding="utf-8",
                )

    # Build task list in round-robin order
    tasks = []
    for variant_idx in range(num_variants):
        for slug in slugs:
            for block in slug_blocks.get(slug, []):
                tasks.append((variant_idx, slug, block))

    total_calls = len(tasks)
    counter_lock = threading.Lock()
    done_count = [0]

    def _run_one(task):
        variant_idx, slug, block = task
        slug_dir = out_base / slug
        block_dir = slug_dir / f"block_{block.index}_{block.name}"
        variant_dir = block_dir / f"variant_{variant_idx}"
        variant_dir.mkdir(parents=True, exist_ok=True)
        code_path = variant_dir / "code.tsx"

        with counter_lock:
            done_count[0] += 1
            seq = done_count[0]

        if code_path.exists():
            print(f"  [{seq}/{total_calls}] {slug}/block{block.index}/v{variant_idx} — already exists, skip")
            return

        print(f"  [{seq}/{total_calls}] {slug} | {block.title} | variant {variant_idx}")

        temp = VT[variant_idx] if variant_idx < len(VT) else 0.8
        if gen_cfg.provider == "gemini":
            temp = min(temp, 1.0)
        cfg_v = dataclasses.replace(gen_cfg, temperature=temp)
        prompt = _build_block_prompt(block, variant_idx)

        max_retries = 5
        text = None
        for attempt in range(1, max_retries + 1):
            try:
                text = call_codegen_llm(cfg=cfg_v, prompt=prompt)
                if text.strip():
                    break
                print(f"    [{slug}/block{block.index}/v{variant_idx}] Empty response (attempt {attempt}/{max_retries}), retrying...")
            except Exception as e:
                wait = 2 ** attempt
                print(f"    [{slug}/block{block.index}/v{variant_idx}] API error (attempt {attempt}/{max_retries}): {e}")
                if attempt < max_retries:
                    print(f"    Retrying in {wait}s...")
                    time.sleep(wait)
                else:
                    print(f"    [{slug}/block{block.index}/v{variant_idx}] All retries failed, writing placeholder.")
                    code_path.write_text(
                        f"// Error after {max_retries} attempts: {e}\nexport default function App() {{ return <div>Error</div>; }}",
                        encoding="utf-8",
                    )
                text = None

        if text and text.strip():
            code = clean_code_fence(text)
            code, fixed = ensure_export_default(code)
            if fixed:
                print(f"    [{slug}/block{block.index}/v{variant_idx}] Auto-fixed export default")
            code_path.write_text(code, encoding="utf-8")
            print(f"    [{slug}/block{block.index}/v{variant_idx}] Saved variant {variant_idx}")
        elif not code_path.exists():
            code_path.write_text(
                "// Empty response\nexport default function App() { return <div>Empty</div>; }",
                encoding="utf-8",
            )

    effective_workers = max(1, workers)
    print(f"\n  Workers: {effective_workers}  |  Total tasks: {total_calls}")

    if effective_workers == 1:
        for task in tasks:
            _run_one(task)
    else:
        with ThreadPoolExecutor(max_workers=effective_workers) as executor:
            futures = {executor.submit(_run_one, task): task for task in tasks}
            for future in as_completed(futures):
                exc = future.exception()
                if exc:
                    task = futures[future]
                    print(f"  [ERROR] task {task[1]}/block{task[2].index}/v{task[0]}: {exc}")

    print(f"\nBatch generation complete ({total_calls} total calls)")


# ─────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Block-level generation + Qwen3-VL evaluation pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--prompts",
        default="Algorithm_Dynamic_Programming,Math_Chaos_Lorenz,ML_Gradient_Descent,Physics_Gravity_Orbits,Sys_Virtual_Memory",
        help="Comma-separated list of prompt slugs (CamelCase, must match prompts/*.txt)",
    )
    parser.add_argument("--gen-env-file", default=".env.qwen", help="Dotenv file for code generation LLM")
    parser.add_argument("--merge-env-file", default=".env", help="Dotenv file for merge LLM (ideally higher quality)")
    parser.add_argument("--out-base", default="outputs/block_pipeline", help="Base output directory")
    parser.add_argument("--qwen-model", default="Qwen/Qwen2.5-VL-3B-Instruct", help="Qwen VL model for evaluation")
    parser.add_argument("--headless", action="store_true", default=True, help="Run Playwright headless (default)")
    parser.add_argument("--no-headless", dest="headless", action="store_false", help="Run Playwright with GUI")
    parser.add_argument("--num-variants", type=int, default=5, help="Number of variants per block (default 5)")
    parser.add_argument("--skip-generate", action="store_true", help="Skip LLM generation stage")
    parser.add_argument("--skip-render", action="store_true", help="Skip build+screenshot stage")
    parser.add_argument("--skip-eval", action="store_true", help="Skip Qwen VL evaluation stage")
    parser.add_argument("--skip-merge", action="store_true", help="Skip LLM merge stage")
    parser.add_argument("--only-slugs", default="", help="Comma-sep list to restrict to specific slugs")
    parser.add_argument("--gen-workers", type=int, default=1, help="Concurrent API workers for generation (default 1)")
    parser.add_argument("--slug-workers", type=int, default=1, help="Concurrent slug workers for render+eval+merge (default 1, GPU eval serialized)")
    args = parser.parse_args()

    slugs = [s.strip() for s in args.prompts.split(",") if s.strip()]
    if args.only_slugs:
        only = {s.strip() for s in args.only_slugs.split(",") if s.strip()}
        slugs = [s for s in slugs if s in only]

    out_base = Path(args.out_base)
    if not out_base.is_absolute():
        out_base = _REPO_ROOT / out_base
    out_base.mkdir(parents=True, exist_ok=True)

    print(f"🚀 Block Pipeline starting")
    print(f"   Slugs: {slugs}")
    print(f"   Out:   {out_base}")
    print(f"   Variants per block: {args.num_variants}")
    print(f"   Headless: {args.headless}")

    start = time.time()

    # ── Phase 1: Split all slugs ──────────────────────────────
    print(f"\n{'='*60}")
    print(f"  PHASE 1: Splitting all prompts")
    print(f"{'='*60}")
    slug_blocks: dict[str, list] = {}
    for slug in slugs:
        try:
            prompt_path = _find_prompt_file(slug)
        except FileNotFoundError as e:
            print(f"  ❌ {slug}: {e}")
            continue
        blocks = split_prompt(prompt_path)
        slug_dir = out_base / slug
        slug_dir.mkdir(parents=True, exist_ok=True)
        blocks_data = [{"index": b.index, "name": b.name, "title": b.title, "description": b.description} for b in blocks]
        (slug_dir / "blocks.json").write_text(json.dumps(blocks_data, indent=2), encoding="utf-8")
        slug_blocks[slug] = blocks
        print(f"  {slug}: {len(blocks)} blocks — {[b.title for b in blocks]}")

    # ── Phase 2: Batch generation (iter → slug → block) ──────
    if not args.skip_generate:
        print(f"\n{'='*60}")
        print(f"  PHASE 2: Batch generation ({args.num_variants} iters × {len(slug_blocks)} slugs)")
        print(f"{'='*60}")
        run_batch_generation(
            slugs=[s for s in slugs if s in slug_blocks],
            slug_blocks=slug_blocks,
            out_base=out_base,
            gen_env_file=args.gen_env_file,
            num_variants=args.num_variants,
            workers=args.gen_workers,
        )
    else:
        print(f"\n[Phase 2] Skipping generation (--skip-generate)")

    # ── Phase 3–5: Render / Eval / Merge per slug ─────────────
    print(f"\n{'='*60}")
    slug_workers = getattr(args, "slug_workers", 1)
    print(f"  PHASE 3-5: Render → Eval → Merge  (slug_workers={slug_workers})")
    print(f"{'='*60}")

    # GPU lock: only one slug may run Qwen eval at a time
    gpu_lock = threading.Lock() if slug_workers > 1 else None

    all_results = []

    def _run_slug(slug):
        if slug not in slug_blocks:
            return {"slug": slug, "error": "split failed"}
        return run_pipeline_for_slug(
            slug=slug,
            gen_env_file=args.gen_env_file,
            merge_env_file=args.merge_env_file,
            out_base=out_base,
            qwen_model=args.qwen_model,
            headless=args.headless,
            num_variants=args.num_variants,
            skip_generate=True,
            skip_render=args.skip_render,
            skip_eval=args.skip_eval,
            skip_merge=args.skip_merge,
            gpu_lock=gpu_lock,
        )

    if slug_workers <= 1:
        for slug in slugs:
            all_results.append(_run_slug(slug))
    else:
        with ThreadPoolExecutor(max_workers=slug_workers) as ex:
            futures = {ex.submit(_run_slug, slug): slug for slug in slugs}
            for future in as_completed(futures):
                exc = future.exception()
                if exc:
                    all_results.append({"slug": futures[future], "error": str(exc)})
                else:
                    all_results.append(future.result())

    elapsed = time.time() - start

    # Save summary
    summary = {
        "elapsed_seconds": elapsed,
        "slugs": slugs,
        "results": all_results,
    }
    summary_path = out_base / "pipeline_summary.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(f"\n{'='*60}")
    print(f"✅ Pipeline complete in {elapsed:.1f}s")
    print(f"   Summary: {summary_path}")
    for r in all_results:
        status = "✅" if r.get("merged") else ("❌" if r.get("error") else "⚠️")
        print(f"   {status} {r['slug']}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
