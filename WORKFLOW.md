# PaperVoyager Workflow

This workflow follows the paper framing: transform a static research paper or topic-conditioned prompt into an executable interactive WebPaper.

## 1. Configure Model Access

```bash
cp .env.example .env
# edit .env with your provider, model, and API key
```

Supported paths:

- Gemini / Google GenAI via `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- OpenAI-compatible APIs via `CODEGEN_BASE_URL`, `CODEGEN_API_KEY`, and `CODEGEN_MODEL`

## 2. Generate Baseline WebPapers

`generate_apps.py` turns prompt specifications in `prompts/` into Vite + React + TypeScript apps.

```bash
python generate_apps.py --provider gemini --model gemini-2.0-flash-exp
```

Generated projects are written under `outputs/`.

## 3. Run the PaperVoyager Block Pipeline

The block pipeline follows the paper's structured generation path: split into modules, generate candidates, render, score, and merge.

```bash
python tools/block_pipeline/pipeline.py \
  --prompts Algorithm_Dynamic_Programming,ML_Gradient_Descent,Sys_Virtual_Memory \
  --gen-env-file .env \
  --merge-env-file .env \
  --out-base outputs/block_pipeline \
  --headless
```

Important outputs per topic:

- `blocks.json`: module-level structured plan
- `variant_*/code.tsx`: generated candidate blocks
- `variant_*/screenshot.png`: rendered candidate observations
- `scores.json`: visual candidate scoring results
- `merged_App.tsx`: final merged WebPaper source

## 4. Build and Browse Results

```bash
python tools/build_portal.py
python -m http.server 8000
```

Open:

```text
http://localhost:8000/index.html
```

## 5. Evaluate

The benchmark utilities support:

- checklist-style matching for required modules and interactions
- browser-based interaction probing
- aggregation into per-topic and overall scores

See `benchmark/README.md` and `docs/PAPER_SUMMARY.md` for the paper-aligned evaluation description.
