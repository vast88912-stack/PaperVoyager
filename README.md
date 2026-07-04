# PaperVoyager

**Building Interactive Web with Visual Language Models**

[![arXiv](https://img.shields.io/badge/arXiv-2603.22999-b31b1b.svg)](https://arxiv.org/abs/2603.22999)
[![Task](https://img.shields.io/badge/task-Paper--to--Interactive--System-blue)](#pipeline)
[![Stack](https://img.shields.io/badge/stack-React%20%7C%20TypeScript%20%7C%20Playwright-green)](#setup)

PaperVoyager turns static research papers into executable **WebPapers**: interactive web systems where readers can manipulate inputs, observe state transitions, and explore the mechanisms described in a paper.

<p align="center">
  <img src="assets/papervoyager_pipeline.png" alt="PaperVoyager pipeline" width="900">
</p>

## Pipeline

PaperVoyager follows the paper's structured generation path:

```text
PDF paper -> mechanism extraction -> structured specification
          -> block-level React/TypeScript generation
          -> VLM candidate filtering -> merged executable WebPaper
```

This public repo keeps only the minimal code needed for generation and evaluation:

```text
generate_apps.py        baseline prompt-to-WebPaper generation
tools/block_pipeline/   split, generate, render, score, and merge blocks
benchmark/              browser probing and checklist/interaction evaluation
prompts/                19 benchmark topic prompts
```

Generated apps, screenshots, raw model responses, and result tables are intentionally ignored.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -r benchmark/requirements.txt
python -m playwright install chromium
cp .env.example .env
```

Fill `.env` with your model provider key.

## Run PaperVoyager

```bash
python tools/block_pipeline/pipeline.py \
  --prompts Algorithm_Dynamic_Programming,ML_Gradient_Descent,Sys_Virtual_Memory \
  --gen-env-file .env \
  --merge-env-file .env \
  --out-base outputs/block_pipeline \
  --headless
```

Baseline prompt-to-app generation:

```bash
python generate_apps.py --provider gemini --model gemini-2.0-flash-exp
```

## Evaluate

Serve generated outputs:

```bash
python -m http.server 8000
```

Run either evaluation path:

```bash
bash benchmark/run_all_codegen_score.sh
bash benchmark/run_all_site_exec.sh
```

The paper evaluates WebPapers with two complementary signals:

- checklist matching for required modules and interactions
- browser-based interaction probing for visible functional changes

The main result table in the paper reports PaperVoyager as the top-performing method across the 19-task benchmark.

## Citation

```bibtex
@misc{dai2026papervoyager,
  title={PaperVoyager: Building Interactive Web with Visual Language Models},
  author={Dai, Dasen and Wu, Biao and Fang, Meng and Wang, Wenhao},
  year={2026},
  eprint={2603.22999},
  archivePrefix={arXiv},
  primaryClass={cs.CL},
  url={https://arxiv.org/abs/2603.22999}
}
```
