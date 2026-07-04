#!/usr/bin/env bash
set -euo pipefail

# End-to-end deterministic "codegen quality" benchmark:
# - Module Probe: per site, auto-discover module buttons and run fixed interaction probes
# - Scorer: deterministic weighted scoring + prompt-based soft constraints
# - Aggregation: benchmark markdown table
#
# IMPORTANT: This benchmark assumes you have already started an HTTP server in repo root:
#   cd <repo-root> && python -m http.server 8000
#
# Output:
#   benchmark/generated/codegen_score_table.md
#   benchmark/results/codegen_score_v1/<site>/<run_id>/site_score.json

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BENCH="$ROOT/benchmark"
WEBSITES="$BENCH/inputs/websites/tsx_20.json"
RESULTS_ROOT="$BENCH/results"
RUN_ID="${RUN_ID:-run_001}"
PROMPTS_DIR="${PROMPTS_DIR:-$ROOT/prompts}"
ONLY_SITE="${ONLY_SITE:-}"
IGNORE_MODULE_REGEX="${IGNORE_MODULE_REGEX:-}"

# Setup control:
# - SETUP=1 : pip install requirements + playwright install chromium
# - SETUP=0 : skip installs and just run (default)
SETUP="${SETUP:-0}"

# Flow control:
# - SKIP_PROBE=1 : do not re-run module probe (reuse existing results/)
# - SKIP_SCORE=1 : skip scoring/table generation
# - SKIP_OPENAI=1: skip OpenAI VLM judge even if key exists
# - SKIP_GEMINI=1: skip Gemini VLM judge even if key exists
SKIP_PROBE="${SKIP_PROBE:-0}"
SKIP_SCORE="${SKIP_SCORE:-0}"
SKIP_OPENAI="${SKIP_OPENAI:-0}"
SKIP_GEMINI="${SKIP_GEMINI:-0}"

HEADLESS="${HEADLESS:-1}"
VIEWPORT_W="${VIEWPORT_W:-1024}"
VIEWPORT_H="${VIEWPORT_H:-768}"
MAX_MODULES="${MAX_MODULES:-12}"
LIMIT="${LIMIT:-0}"

log() { echo "[$(date -Is)] $*"; }

log "==> Preflight: http.server 8000 must be running (repo root)"
# Some environments export HTTP(S)_PROXY which can break localhost requests; force no-proxy for 127.0.0.1.
export NO_PROXY="127.0.0.1,localhost"
export no_proxy="127.0.0.1,localhost"
if ! curl --noproxy '*' -sf "http://127.0.0.1:8000/outputs/tsx/Algorithm_Dynamic_Programming/dist/index.html" >/dev/null; then
  echo "ERROR: cannot reach http://127.0.0.1:8000/... Please run:" >&2
  echo "  cd $(pwd) && python -m http.server 8000" >&2
  exit 1
fi

PY="${PYTHON:-python}"
log "==> Using python: $PY"

cd "$ROOT"
export PYTHONPATH="$ROOT:${PYTHONPATH:-}"

# Load .env for keys (not required for this deterministic scorer, but keep consistent with other scripts)
ENV_FILE="${ENV_FILE:-$ROOT/.env}"
if [[ -f "$ENV_FILE" ]]; then
  log "==> Loading env file: $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  log "==> No .env found at $ENV_FILE (OK)"
fi

if [[ "$SETUP" == "1" ]]; then
  log "==> Install Python deps (idempotent)"
  "$PY" -m pip install -r "$BENCH/requirements.txt"
  log "==> Ensure Playwright browser installed (idempotent)"
  "$PY" -m playwright install chromium
else
  log "==> SETUP=0: skip pip/playwright installs and run directly"
fi

if [[ "$SKIP_PROBE" == "1" ]]; then
  log "==> SKIP_PROBE=1: skip module probe runner (reuse existing results)"
else
  log "==> Run Module Probe suite -> $RESULTS_ROOT/codegen_score_v1/*/$RUN_ID"
  ARGS=(
    --websites "$WEBSITES"
    --results_root "$RESULTS_ROOT"
    --run_id "$RUN_ID"
    --viewport_width "$VIEWPORT_W"
    --viewport_height "$VIEWPORT_H"
    --max_modules "$MAX_MODULES"
    --limit "$LIMIT"
  )
  if [[ -n "${ONLY_SITE:-}" ]]; then
    ARGS+=(--only_site "$ONLY_SITE")
  fi
  if [[ -n "${IGNORE_MODULE_REGEX:-}" ]]; then
    # support comma-separated patterns
    IFS=',' read -r -a _pats <<< "$IGNORE_MODULE_REGEX"
    for p in "${_pats[@]}"; do
      [[ -n "$p" ]] && ARGS+=(--ignore_module_regex "$p")
    done
  fi
  if [[ "$HEADLESS" == "1" ]]; then
    ARGS+=(--headless)
  fi
  "$PY" -m benchmark.runner.run_module_probe_suite "${ARGS[@]}"
fi

# Optional: LLM judge on probe evidence (WebVoyager-style auto evaluation)
OPENAI_VLM_MODEL="${OPENAI_VLM_MODEL:-gpt-4.1}"
OPENAI_VLM_TRIALS="${OPENAI_VLM_TRIALS:-3}"
OPENAI_VLM_LAST_K_PER_MODULE="${OPENAI_VLM_LAST_K_PER_MODULE:-4}"
# Gemini model (you can override via GEMINI_VLM_MODEL). Your environment uses gemini-3-pro-preview.
GEMINI_VLM_MODEL="${GEMINI_VLM_MODEL:-gemini-3-pro-preview}"
GEMINI_VLM_TRIALS="${GEMINI_VLM_TRIALS:-1}"
GEMINI_VLM_LAST_K_PER_MODULE="${GEMINI_VLM_LAST_K_PER_MODULE:-4}"

if [[ "$SKIP_OPENAI" == "1" ]]; then
  log "==> SKIP_OPENAI=1: skip OpenAI VLM judge"
elif [[ -n "${OPENAI_API_KEY:-}" ]]; then
  log "==> OpenAI VLM judge model=$OPENAI_VLM_MODEL trials=$OPENAI_VLM_TRIALS last_k_per_module=$OPENAI_VLM_LAST_K_PER_MODULE"
  if [[ -n "${ONLY_SITE:-}" ]]; then
    "$PY" -m benchmark.evaluation.evaluate_codegen_llm \
      --run_dir "$RESULTS_ROOT/codegen_score_v1/$ONLY_SITE/$RUN_ID" \
      --site_id "$ONLY_SITE" \
      --prompts_dir "$PROMPTS_DIR" \
      --model "$OPENAI_VLM_MODEL" \
      --trials "$OPENAI_VLM_TRIALS" \
      --last_k_per_module "$OPENAI_VLM_LAST_K_PER_MODULE" \
      --out_prefix openai_gpt4v >/dev/null
  else
    for site in "$RESULTS_ROOT/codegen_score_v1"/*; do
      [[ -d "$site" ]] || continue
      sid="$(basename "$site")"
      "$PY" -m benchmark.evaluation.evaluate_codegen_llm \
        --run_dir "$site/$RUN_ID" \
        --site_id "$sid" \
        --prompts_dir "$PROMPTS_DIR" \
        --model "$OPENAI_VLM_MODEL" \
        --trials "$OPENAI_VLM_TRIALS" \
        --last_k_per_module "$OPENAI_VLM_LAST_K_PER_MODULE" \
        --out_prefix openai_gpt4v >/dev/null
    done
  fi
else
  log "==> OPENAI_API_KEY not set; skip OpenAI VLM judge"
fi

if [[ "$SKIP_GEMINI" == "1" ]]; then
  log "==> SKIP_GEMINI=1: skip Gemini VLM judge"
elif [[ -n "${GEMINI_API_KEY:-}" || -n "${GOOGLE_API_KEY:-}" ]]; then
  log "==> Gemini VLM judge model=$GEMINI_VLM_MODEL trials=$GEMINI_VLM_TRIALS last_k_per_module=$GEMINI_VLM_LAST_K_PER_MODULE"
  if [[ -n "${ONLY_SITE:-}" ]]; then
    "$PY" -m benchmark.evaluation.evaluate_codegen_gemini \
      --run_dir "$RESULTS_ROOT/codegen_score_v1/$ONLY_SITE/$RUN_ID" \
      --site_id "$ONLY_SITE" \
      --prompts_dir "$PROMPTS_DIR" \
      --model "$GEMINI_VLM_MODEL" \
      --trials "$GEMINI_VLM_TRIALS" \
      --last_k_per_module "$GEMINI_VLM_LAST_K_PER_MODULE" \
      --out_prefix gemini_flash >/dev/null
  else
    for site in "$RESULTS_ROOT/codegen_score_v1"/*; do
      [[ -d "$site" ]] || continue
      sid="$(basename "$site")"
      "$PY" -m benchmark.evaluation.evaluate_codegen_gemini \
        --run_dir "$site/$RUN_ID" \
        --site_id "$sid" \
        --prompts_dir "$PROMPTS_DIR" \
        --model "$GEMINI_VLM_MODEL" \
        --trials "$GEMINI_VLM_TRIALS" \
        --last_k_per_module "$GEMINI_VLM_LAST_K_PER_MODULE" \
        --out_prefix gemini_flash >/dev/null || true
    done
  fi
else
  log "==> GEMINI_API_KEY/GOOGLE_API_KEY not set; skip Gemini VLM judge"
fi

OUT_TABLE="$BENCH/generated/codegen_score_table.md"
if [[ "$SKIP_SCORE" == "1" ]]; then
  log "==> SKIP_SCORE=1: skip scoring/table generation"
else
  if [[ -n "${ONLY_SITE:-}" && -z "${OUT_TABLE_OVERRIDE:-}" ]]; then
    OUT_TABLE="$BENCH/generated/codegen_score_table_${ONLY_SITE}.md"
  fi
  log "==> Score + aggregate table -> $OUT_TABLE"
  "$PY" -m benchmark.evaluation.codegen_scorer \
    --websites "$WEBSITES" \
    --results_root "$RESULTS_ROOT" \
    --run_id "$RUN_ID" \
    --prompts_dir "$PROMPTS_DIR" \
    --out_table "$OUT_TABLE" \
    ${ONLY_SITE:+--only_site "$ONLY_SITE"}
fi

log "DONE. Table at: $OUT_TABLE"



