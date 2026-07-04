#!/usr/bin/env bash
set -euo pipefail

# One-shot end-to-end runner:
# - runs benchmark suite runner (trajectory + screenshots)
# - runs rule-based evaluator
# - runs OpenAI evaluator (text-only + vision) if OPENAI_API_KEY exists
# - runs Gemini evaluator if GEMINI_API_KEY/GOOGLE_API_KEY exists
# - aggregates to a benchmark table
#
# Output:
#   benchmark/generated/site_exec_table.md

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BENCH="$ROOT/benchmark"
WEBSITES="$BENCH/inputs/websites/tsx_20.json"
TASKS="$BENCH/inputs/tasks/site_executability_v1.jsonl"
RESULTS_ROOT="$BENCH/results"
RUN_ID="${RUN_ID:-run_001}"

# Setup control:
# - SETUP=1 : pip install requirements + playwright install chromium
# - SETUP=0 : skip installs and just run (default, per your request)
SETUP="${SETUP:-0}"

# Flow control:
# - SKIP_RUNNER=1 : do not re-run trajectory/screenshot collection (reuse existing results/)
# - SKIP_RULE=1   : skip rule-based evaluator
# - SKIP_OPENAI=1 : skip OpenAI evaluators even if key exists
# - SKIP_GEMINI=1 : skip Gemini evaluator even if key exists
SKIP_RUNNER="${SKIP_RUNNER:-0}"
SKIP_RULE="${SKIP_RULE:-0}"
SKIP_OPENAI="${SKIP_OPENAI:-0}"
SKIP_GEMINI="${SKIP_GEMINI:-0}"

# Evaluator knobs (cost/time)
OPENAI_TEXT_MODEL="${OPENAI_TEXT_MODEL:-gpt-4.1-mini}"
OPENAI_VISION_MODEL="${OPENAI_VISION_MODEL:-gpt-4.1}"
OPENAI_TEXT_TRIALS="${OPENAI_TEXT_TRIALS:-1}"
OPENAI_VISION_TRIALS="${OPENAI_VISION_TRIALS:-3}"
OPENAI_VISION_LAST_K="${OPENAI_VISION_LAST_K:-8}"
GEMINI_MODEL="${GEMINI_MODEL:-gemini-3.0-flash}"
GEMINI_TRIALS="${GEMINI_TRIALS:-1}"
GEMINI_LAST_K="${GEMINI_LAST_K:-8}"

HEADLESS="${HEADLESS:-1}"
VIEWPORT_W="${VIEWPORT_W:-1024}"
VIEWPORT_H="${VIEWPORT_H:-768}"
SEED="${SEED:-42}"

log() { echo "[$(date -Is)] $*"; }

PY="${PYTHON:-python}"
log "==> Using python: $PY"

# Ensure repo root is on import path (so `python -m benchmark...` works even if launched from benchmark/ dir)
cd "$ROOT"
export PYTHONPATH="$ROOT:${PYTHONPATH:-}"

# Load .env if present so OPENAI_API_KEY / GEMINI_API_KEY are visible to this bash process.
# (Python evaluators also load .env, but the bash-level checks need env vars too.)
ENV_FILE="${ENV_FILE:-$ROOT/.env}"
if [[ -f "$ENV_FILE" ]]; then
  log "==> Loading env file: $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  log "==> No .env found at $ENV_FILE (OK, will rely on exported env vars)"
fi

if [[ "$SETUP" == "1" ]]; then
  log "==> Install Python deps (idempotent)"
  "$PY" -m pip install -r "$BENCH/requirements.txt"

  log "==> Ensure Playwright browser installed (idempotent)"
  "$PY" -m playwright install chromium
else
  log "==> SETUP=0: skip pip/playwright installs and run directly"
fi

if [[ "$SKIP_RUNNER" == "1" ]]; then
  log "==> SKIP_RUNNER=1: skip suite runner (reuse existing results)"
else
  log "==> Run 20-site suite runner (trajectory + screenshots)"
  RUNNER_ARGS=(
    --websites "$WEBSITES"
    --tasks "$TASKS"
    --results_root "$RESULTS_ROOT"
    --run_id "$RUN_ID"
    --viewport_width "$VIEWPORT_W"
    --viewport_height "$VIEWPORT_H"
    --seed "$SEED"
  )
  if [[ "$HEADLESS" == "1" ]]; then
    RUNNER_ARGS+=(--headless)
  fi
  "$PY" -m benchmark.runner.run_site_suite "${RUNNER_ARGS[@]}"
fi

if [[ "$SKIP_RULE" == "1" ]]; then
  log "==> SKIP_RULE=1: skip rule-based evaluation"
else
  log "==> Rule-based evaluation (all sites)"
  for site in "$RESULTS_ROOT/site_exec_v1"/*; do
    [[ -d "$site" ]] || continue
    "$PY" -m benchmark.evaluation.evaluate_rule \
      --run_dir "$site/$RUN_ID" \
      --tasks "$TASKS" >/dev/null
  done
fi

if [[ "$SKIP_OPENAI" == "1" ]]; then
  log "==> SKIP_OPENAI=1: skip OpenAI evaluators"
elif [[ -n "${OPENAI_API_KEY:-}" ]]; then
  log "==> OpenAI text-only eval (no screenshots) model=$OPENAI_TEXT_MODEL trials=$OPENAI_TEXT_TRIALS"
  for site in "$RESULTS_ROOT/site_exec_v1"/*; do
    [[ -d "$site" ]] || continue
    "$PY" -m benchmark.evaluation.evaluate_llm \
      --run_dir "$site/$RUN_ID" \
      --tasks "$TASKS" \
      --model "$OPENAI_TEXT_MODEL" \
      --trials "$OPENAI_TEXT_TRIALS" \
      --last_k 0 \
      --out_prefix openai_gpt >/dev/null
  done

  log "==> OpenAI vision eval (last-k screenshots) model=$OPENAI_VISION_MODEL trials=$OPENAI_VISION_TRIALS last_k=$OPENAI_VISION_LAST_K"
  for site in "$RESULTS_ROOT/site_exec_v1"/*; do
    [[ -d "$site" ]] || continue
    "$PY" -m benchmark.evaluation.evaluate_llm \
      --run_dir "$site/$RUN_ID" \
      --tasks "$TASKS" \
      --model "$OPENAI_VISION_MODEL" \
      --trials "$OPENAI_VISION_TRIALS" \
      --last_k "$OPENAI_VISION_LAST_K" \
      --out_prefix openai_gpt4v >/dev/null
  done
else
  log "==> OPENAI_API_KEY not set; skip OpenAI evaluators"
fi

if [[ "$SKIP_GEMINI" == "1" ]]; then
  log "==> SKIP_GEMINI=1: skip Gemini evaluator"
elif [[ -n "${GEMINI_API_KEY:-}" || -n "${GOOGLE_API_KEY:-}" ]]; then
  log "==> Gemini eval model=$GEMINI_MODEL trials=$GEMINI_TRIALS last_k=$GEMINI_LAST_K"
  for site in "$RESULTS_ROOT/site_exec_v1"/*; do
    [[ -d "$site" ]] || continue
    "$PY" -m benchmark.evaluation.evaluate_gemini \
      --run_dir "$site/$RUN_ID" \
      --tasks "$TASKS" \
      --model "$GEMINI_MODEL" \
      --trials "$GEMINI_TRIALS" \
      --last_k "$GEMINI_LAST_K" \
      --out_prefix gemini_flash >/dev/null
  done
else
  log "==> GEMINI_API_KEY/GOOGLE_API_KEY not set; skip Gemini evaluator"
fi

OUT_TABLE="$BENCH/generated/site_exec_table.md"
log "==> Aggregate website table -> $OUT_TABLE"
"$PY" -m benchmark.evaluation.aggregate_websites \
  --websites "$WEBSITES" \
  --tasks "$TASKS" \
  --results_root "$RESULTS_ROOT" \
  --out "$OUT_TABLE"

log "DONE. Table at: $OUT_TABLE"



