# PaperVoyager Benchmark Utilities

This directory contains scripts used to evaluate generated interactive WebPaper systems.

The paper defines two complementary evaluation branches:

1. **Checklist Matching Evaluation**  
   Measures whether the generated system implements the expected visualization modules and interactive elements for a topic.

2. **Interactive Exploration Evaluation**  
   Uses browser automation to interact with detected UI controls and checks whether the page responds with meaningful visible changes.

The paper reports final benchmark scores with a 60% checklist and 40% interaction weighting.

## Directory Overview

```text
benchmark/
├── generation/        # checklist generation helpers
├── runner/            # Playwright-based trajectory and screenshot collection
├── evaluation/        # rule, LLM, VLM, and aggregation evaluators
├── generated/         # generated tables and intermediate reports
├── aggregate.py       # aggregation entry point
├── run_benchmark.py   # benchmark runner
└── requirements.txt   # benchmark-specific Python dependencies
```

## Setup

From the repository root:

```bash
pip install -r benchmark/requirements.txt
python -m playwright install chromium
```

## Run Browser Probing

Serve a generated WebPaper first:

```bash
python -m http.server 8000
```

Then run the benchmark utilities for the configured task set:

```bash
bash benchmark/run_all_codegen_score.sh
```

or:

```bash
bash benchmark/run_all_site_exec.sh
```

## Notes

- Some evaluator paths call external VLM/LLM APIs. Set API keys through environment variables only.
- Generated trajectories, screenshots, and reports are written under `benchmark/results/` and `benchmark/generated/`.
- The scripts are research utilities; exact reproduction may require the same model endpoints, browser version, and viewport configuration described in the paper.
