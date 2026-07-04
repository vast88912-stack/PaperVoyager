# Repository Guide

## Main Entry Points

- `generate_apps.py`  
  Baseline prompt-to-React/TypeScript generation from the prompt files in `prompts/`.

- `tools/block_pipeline/pipeline.py`  
  PaperVoyager-style block pipeline: split prompt into modules, generate candidate blocks, render them, evaluate candidate screenshots, and merge selected blocks.

- `tools/build_portal.py`  
  Builds `index.html`, a local portal for browsing generated WebPaper outputs after you regenerate them locally.

- `benchmark/`  
  Evaluation and aggregation utilities for checklist and interaction-based scoring.

- `prompts/`  
  Topic-conditioned specifications corresponding to the benchmark topics.

- `outputs/`  
  Runtime output directory. It is intentionally not committed in the public repository because it may contain generated WebPaper builds, screenshots, raw responses, and intermediate model artifacts.

## Secret Handling

Use `.env.example` as a template. Do not commit:

- `.env`
- `.env.*`
- provider API keys
- Hugging Face tokens
- local cache directories

## Releasing on GitHub

Before publishing:

1. Run a secret scan.
2. Confirm `.env` files are not present.
3. Confirm `.cache/`, `node_modules/`, `dist/`, and `__pycache__/` are excluded.
4. Confirm generated directories such as `outputs/`, `benchmark/generated/`, and `benchmark/results/` are excluded unless intentionally publishing a release artifact.
5. Update `CITATION.cff` with the final GitHub repository URL.
6. Add the final license chosen by the authors.
