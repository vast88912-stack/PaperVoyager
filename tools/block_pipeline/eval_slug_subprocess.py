"""
eval_slug_subprocess.py — Run Qwen3-VL evaluation for one slug in isolation.

Called by pipeline.py when --slug-workers > 1 to isolate CUDA context per slug.
Each subprocess gets a fresh GPU context; a CUDA assert in one slug cannot
affect any other slug.

Usage:
  python tools/block_pipeline/eval_slug_subprocess.py \\
    --slug Algorithm_Dynamic_Programming \\
    --out-base outputs/block_pipeline \\
    --num-variants 5 \\
    --qwen-model Qwen/Qwen2.5-VL-3B-Instruct \\
    --result-file /tmp/eval_result_Algorithm_Dynamic_Programming.json
"""

from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_REPO_ROOT))

from tools.block_pipeline.evaluator import evaluate_block_variants, unload_model


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", required=True)
    parser.add_argument("--out-base", required=True)
    parser.add_argument("--num-variants", type=int, default=5)
    parser.add_argument("--qwen-model", default="Qwen/Qwen2.5-VL-3B-Instruct")
    parser.add_argument("--result-file", required=True)
    args = parser.parse_args()

    out_base = Path(args.out_base)
    slug_dir = out_base / args.slug
    blocks_json = slug_dir / "blocks.json"

    if not blocks_json.exists():
        json.dump({"error": f"blocks.json not found: {blocks_json}"}, open(args.result_file, "w"))
        sys.exit(1)

    blocks_data = json.loads(blocks_json.read_text())
    results = []

    for block in blocks_data:
        block_idx = block["index"]
        block_name = block["name"]
        block_title = block["title"]
        block_desc = block.get("description", "")

        block_dir = slug_dir / f"block_{block_idx}_{block_name}"
        variant_dirs = [block_dir / f"variant_{j}" for j in range(args.num_variants)]
        variant_dirs = [d for d in variant_dirs if d.exists()]

        try:
            best_idx, eval_results = evaluate_block_variants(
                block_index=block_idx,
                block_title=block_title,
                block_description=block_desc,
                variant_dirs=variant_dirs,
                model_id=args.qwen_model,
                skip_if_exists=True,
            )
            best_json = {
                "winner": best_idx,
                "yes_prob": eval_results[best_idx].get("yes_prob", 0.0) if eval_results else 0.0,
                "all_evals": eval_results,
            }
            (block_dir / "best_variant.json").write_text(json.dumps(best_json, indent=2), encoding="utf-8")
            print(f"  Block {block_idx} '{block_title}': best={best_idx} yes_prob={best_json['yes_prob']:.3f}")
            results.append({"index": block_idx, "title": block_title, "best_variant": best_idx, "error": None})
        except Exception as e:
            print(f"  Block {block_idx} '{block_title}': ERROR — {e}", file=sys.stderr)
            results.append({"index": block_idx, "title": block_title, "best_variant": 0, "error": str(e)})

    try:
        unload_model()
    except Exception:
        pass

    json.dump({"blocks": results, "error": None}, open(args.result_file, "w"), indent=2)
    print(f"✅ Eval complete for {args.slug}, result saved to {args.result_file}")


if __name__ == "__main__":
    main()
