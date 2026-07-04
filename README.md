# PaperVoyager

Minimal public code for **PaperVoyager: Building Interactive Web with Visual Language Models**.

This repo keeps only what is needed to run the generation pipeline and benchmark/evaluation utilities:

- `generate_apps.py`: baseline prompt-to-React/TypeScript generation
- `tools/block_pipeline/`: block-level generation, rendering, VLM scoring, and merging
- `benchmark/`: browser probing and checklist/interaction evaluation code
- `prompts/`: topic prompts used by the pipeline

Generated apps, screenshots, raw model responses, and benchmark result tables are intentionally not committed.

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

## Run Pipeline

```bash
python tools/block_pipeline/pipeline.py \
  --prompts Algorithm_Dynamic_Programming,ML_Gradient_Descent,Sys_Virtual_Memory \
  --gen-env-file .env \
  --merge-env-file .env \
  --out-base outputs/block_pipeline \
  --headless
```

## Run Baseline Generation

```bash
python generate_apps.py --provider gemini --model gemini-2.0-flash-exp
```

## Run Evaluation

Serve generated outputs first:

```bash
python -m http.server 8000
```

Then run one of:

```bash
bash benchmark/run_all_codegen_score.sh
bash benchmark/run_all_site_exec.sh
```

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
