# Outputs layout

- `outputs/tsx/` is reserved for builds generated with ChatGPT-5.1 prompts (current active model). Start new npm builds here.
- `outputs/models/gemini-3-pro/tsx/` archives the earlier Gemini 3.0 Pro builds (kept intact with logs).

## Environment notes

This repo supports generating TSX apps via:
- Gemini (`google-genai`): set `GEMINI_API_KEY` (or `GOOGLE_API_KEY`)
- OpenAI-compatible endpoints (Minimax/Qwen/Kimi/OpenRouter etc): set `CODEGEN_PROVIDER=openai_compatible` plus `CODEGEN_API_KEY`, `CODEGEN_BASE_URL`, `CODEGEN_MODEL`

See `.env.example` for a safe template.

Notes:
- Batch scripts like `python tools/build_all_tsx.py` still target `outputs/tsx/`. Point them to archived builds manually if needed.
- When adding another model, create `outputs/models/<model>/tsx/` and update the portal generator so it is indexed.
