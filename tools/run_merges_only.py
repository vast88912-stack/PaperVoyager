#!/usr/bin/env python3
"""Run only the LLM merge step for all (slug, k) pairs that need rebuilding.
No Node.js builds. Just merges. Run this while WSL2 netlink issue persists."""
import sys, json, dataclasses
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / '.env', override=True)

from generate_apps import load_codegen_config
from tools.block_pipeline.splitter import split_prompt
from tools.block_pipeline.merger import merge_blocks, MergeFailedError
from tools.block_pipeline.pipeline import _find_prompt_file

BP_ROOT = Path(__file__).resolve().parents[1] / 'outputs' / 'block_pipeline'

REBUILD_MAP = {
    1: ['Algorithm_Sorting_Race','DataStructure_Balanced_Trees','DataStructure_Hash_Map',
        'Distributed_Raft_Consensus','Genetic_Algorithm_Sandbox','ML_Neural_Network_Viz',
        'Math_Fourier_Transform','Math_Linear_Algebra_Eigen','Math_Monte_Carlo_Estimation',
        'Physics_Fluid_CFD','Physics_Thermodynamics','Sys_Virtual_Memory'],
    2: ['Algorithm_Sorting_Race','DataStructure_Balanced_Trees','DataStructure_Hash_Map',
        'ML_Neural_Network_Viz','Math_Fourier_Transform','Math_Linear_Algebra_Eigen',
        'Math_Monte_Carlo_Estimation','Physics_Fluid_CFD','Sys_Virtual_Memory'],
    3: ['Algorithm_Sorting_Race','DataStructure_Balanced_Trees','DataStructure_Hash_Map','ML_Neural_Network_Viz'],
    4: ['DataStructure_Hash_Map','ML_Neural_Network_Viz'],
}

def pick_winner_k(variants, k):
    best_prob, best_idx = -1.0, 0
    for i in range(min(k, len(variants))):
        p = variants[i] if variants[i] is not None else -999.0
        if p > best_prob:
            best_prob, best_idx = p, i
    return best_idx

def load_block_evals(slug_dir):
    block_dirs = sorted([d for d in slug_dir.iterdir() if d.is_dir() and d.name.startswith("block_")])
    result = []
    for bd in block_dirs:
        variants = []
        for v in range(5):
            ev = bd / f"variant_{v}" / "eval.json"
            if ev.exists():
                variants.append(json.loads(ev.read_text()).get("yes_prob", 0.0))
            else:
                variants.append(None)
        result.append(variants)
    return result

class _Args:
    provider = ''; model = ''; base_url = ''; api_key = ''

merge_cfg = dataclasses.replace(load_codegen_config(_Args()), max_output_tokens=65536)
print(f"Merge model: {merge_cfg.model}")

tasks = []
for k, slugs in sorted(REBUILD_MAP.items()):
    for slug in slugs:
        slug_dir = BP_ROOT / slug
        merged_tsx = slug_dir / f"_k{k}_work" / "merged_App.tsx"
        if merged_tsx.exists():
            print(f"SKIP (exists): {slug} k={k}")
            continue
        evals = load_block_evals(slug_dir)
        block_winners = [pick_winner_k(b, k) for b in evals]
        tasks.append((k, slug, block_winners))

print(f"\nPending merges: {len(tasks)}")
if not tasks:
    print("All merges already done!")
    sys.exit(0)

for i, (k, slug, block_winners) in enumerate(tasks):
    slug_dir = BP_ROOT / slug
    k_work_dir = slug_dir / f"_k{k}_work"
    k_work_dir.mkdir(parents=True, exist_ok=True)

    blocks = split_prompt(_find_prompt_file(slug))
    best_codes = []
    for bi, block in enumerate(blocks):
        block_dir = slug_dir / f"block_{block.index}_{block.name}"
        winner_idx = block_winners[bi] if bi < len(block_winners) else 0
        code_path = block_dir / f"variant_{winner_idx}" / "code.tsx"
        best_codes.append(
            code_path.read_text(encoding="utf-8") if code_path.exists()
            else f"export default function App() {{ return <div>Block {block.index}</div>; }}"
        )

    print(f"\n[{i+1}/{len(tasks)}] {slug} k={k} winners={block_winners}")
    sys.stdout.flush()
    try:
        merge_blocks(slug=slug, blocks=blocks, best_codes=best_codes,
                     merge_cfg=merge_cfg, out_dir=k_work_dir, skip_if_exists=False)
        print(f"  ✅ Merged: {slug} k={k}")
    except MergeFailedError as e:
        print(f"  ❌ FAILED: {slug} k={k}: {str(e)[:200]}")
    sys.stdout.flush()

print("\nAll merges complete!")
