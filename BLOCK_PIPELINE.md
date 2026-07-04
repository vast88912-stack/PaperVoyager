# Block-Level Generation + Qwen3-VL Evaluation Pipeline

## Overview

Instead of generating an entire `App.tsx` in a single LLM call, this pipeline:

1. **Splits** each prompt into module-level blocks (using the "Module Plan:" section or auto-detected sections)
2. **Generates** 5 TSX variant implementations per block via the LLM API (with temperature variation)
3. **Renders** each variant: builds the Vite app, takes a Playwright screenshot
4. **Evaluates** each screenshot with Qwen2.5-VL-3B (local GPU inference), extracting Yes/No logits
5. **Merges** the best-scoring variant per block into a final App.tsx via another LLM call
6. **Scores** the merged result with the existing GPT-4V benchmark

## Directory Layout

```
outputs/block_pipeline/
  <Slug>/
    blocks.json                      # Block definitions (name, title, description)
    block_<i>_<name>/
      spec.md                        # Block description sent to LLM
      variant_<j>/
        code.tsx                     # Generated TSX for this block+variant
        _app/                        # Vite project scaffolded for build+screenshot
        screenshot.png               # Playwright screenshot
        render.json                  # {build_success, screenshot_success, logs}
        eval.json                    # {yes_logit, no_logit, yes_prob, no_prob}
      best_variant.json              # {winner: j, yes_prob: 0.87, all_evals: [...]}
    merged_App.tsx                   # LLM-merged final result
    merged_build.log                 # Build log for merged app
    _merged_app/                     # Vite project for final merged app
  pipeline_summary.json              # Run metadata and per-slug results
```

## Quick Start

### 5-Prompt Pilot Run

```bash
python tools/block_pipeline/pipeline.py \
  --prompts Algorithm_Dynamic_Programming,Math_Chaos_Lorenz,ML_Gradient_Descent,Physics_Gravity_Orbits,Theory_Cellular_Automata \
  --gen-env-file .env.qwen \
  --merge-env-file .env \
  --out-base outputs/block_pipeline \
  --qwen-model Qwen/Qwen2.5-VL-3B-Instruct \
  --headless
```

### Skip Individual Stages

```bash
# Only run generation (skip render/eval/merge)
python tools/block_pipeline/pipeline.py --prompts Algorithm_Dynamic_Programming \
  --skip-render --skip-eval --skip-merge

# Only run evaluation (blocks already generated and rendered)
python tools/block_pipeline/pipeline.py --prompts Algorithm_Dynamic_Programming \
  --skip-generate --skip-render

# Only run merge (evaluation already done)
python tools/block_pipeline/pipeline.py --prompts Algorithm_Dynamic_Programming \
  --skip-generate --skip-render --skip-eval
```

### All Options

```
--prompts           Comma-separated prompt slugs
--gen-env-file      Dotenv for code generation LLM (default: .env.qwen)
--merge-env-file    Dotenv for merge LLM (default: .env, ideally Gemini)
--out-base          Output directory (default: outputs/block_pipeline)
--qwen-model        Qwen VL model ID (default: Qwen/Qwen2.5-VL-3B-Instruct)
--headless          Playwright headless (default: True)
--no-headless       Playwright with GUI
--num-variants      Variants per block (default: 5)
--skip-generate     Skip LLM generation
--skip-render       Skip build+screenshot
--skip-eval         Skip Qwen VL evaluation
--skip-merge        Skip LLM merge
```

## Module Files

| File | Purpose |
|------|---------|
| `splitter.py` | Parse prompt → `List[BlockSpec]`. Handles Module Plan sections, semicolon-delimited Sections/Features lines, numbered lists, or generic 5-block fallback |
| `generator.py` | Generate 5 TSX variants per block at temperatures [0.3, 0.6, 0.8, 1.0, 1.2] |
| `renderer.py` | Scaffold Vite app, `npm install && npm run build`, Playwright screenshot |
| `evaluator.py` | Load Qwen2.5-VL-3B-Instruct on GPU (fp16), extract Yes/No logits for each screenshot |
| `merger.py` | Build merge prompt from N best blocks, call LLM, clean output, fallback to tab layout if LLM fails |
| `pipeline.py` | Orchestrator: CLI args, per-slug pipeline, summary JSON |

## Qwen3-VL Evaluation Details

- Model: `Qwen/Qwen2.5-VL-3B-Instruct` in fp16 (~6GB VRAM, fits on RTX 4060 8GB)
- Prompt: `"Does this screenshot show a functional, visually complete implementation of the '<title>' module? Answer with only 'Yes' or 'No'."`
- Logit extraction: `model.generate(..., max_new_tokens=1, output_scores=True)` → compare logit of token "Yes" vs "No"
- Score: `yes_prob = softmax([yes_logit, no_logit])[0]`
- Winner: variant with highest `yes_prob`

## Environment Requirements

```bash
# GPU inference
pip install bitsandbytes accelerate qwen-vl-utils

# Playwright (for screenshots)
playwright install chromium

# Existing deps
pip install google-genai openai python-dotenv tqdm
```

GPU: RTX 4060 8GB (or any CUDA GPU with ≥6GB VRAM).
Model downloads to HuggingFace cache on first run (~6GB).

## Comparison with Baseline

After generating the merged App.tsx, compare against PaperVoyager baseline:

```bash
# Copy merged App.tsx to benchmark outputs dir
cp outputs/block_pipeline/<Slug>/merged_App.tsx outputs/tsx/<Slug>/src/App.tsx
cd outputs/tsx/<Slug> && npm run build

# Run full evaluation
python tools/run_full_codegen_eval.py \
  --websites benchmark/generated/model_websites/websites_block_pilot.json \
  --results_root benchmark/results \
  --run_id run_block_pilot_001 \
  --headless --judge_workers 10 \
  --out_table benchmark/generated/codegen_score_table_block_pilot.md
```

## Key Design Decisions

- **Temperature variation**: 5 variants at [0.3, 0.6, 0.8, 1.0, 1.2] encourage diversity while keeping some low-temp reliable outputs
- **Model loaded once**: Qwen VL model is loaded once for all evaluations, then `unload_model()` frees GPU memory for merge step
- **Build failures**: If build fails → `yes_prob=0.0` → that variant never wins
- **Fallback merge**: If LLM merge fails → simple tab-navigated layout wrapping all blocks
- **Skip flags**: Each stage can be skipped independently for iterating on later stages
