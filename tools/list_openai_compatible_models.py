#!/usr/bin/env python3
"""List model ids from an OpenAI-compatible endpoint.

Usage:
  CODEGEN_API_KEY=... CODEGEN_BASE_URL=... python tools/list_openai_compatible_models.py
  python tools/list_openai_compatible_models.py --base-url https://.../v1 --api-key sk-... 

Note: Some vendors disable /v1/models; in that case, ask the vendor console for the exact model id.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import json
from typing import Any


def try_load_dotenv(env_file: str) -> None:
    if not env_file:
        return
    try:
        from dotenv import load_dotenv  # type: ignore
    except ImportError:
        raise SystemExit("Missing dependency: python-dotenv. Install: pip install python-dotenv")
    p = Path(env_file)
    if not p.is_absolute() and not p.exists():
        # Resolve relative to repo root (tools/..)
        repo_root = Path(__file__).resolve().parents[1]
        candidate = repo_root / p
        if candidate.exists():
            p = candidate
    load_dotenv(str(p), override=True)


def getenv_str(key: str) -> str:
    return (os.getenv(key) or "").strip()


def getenv_json_dict(key: str) -> dict[str, Any]:
    raw = getenv_str(key)
    if not raw:
        return {}
    try:
        v = json.loads(raw)
    except Exception as e:
        raise SystemExit(f"Invalid {key} JSON: {e}")
    if not isinstance(v, dict):
        raise SystemExit(f"Invalid {key}: expected a JSON object")
    return v


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--env-file", default="", help="Load a dotenv file (e.g. .env.minimax) without sourcing")
    ap.add_argument("--base-url", default="", help="e.g. https://api.moonshot.cn/v1")
    ap.add_argument("--api-key", default="", help="API key")
    ap.add_argument("--ping-model", default="", help="If set, verify by calling the model once (works even when /v1/models is unsupported)")
    ap.add_argument("--use-responses", action="store_true", help="Use Responses API for ping (otherwise Chat Completions)")
    args = ap.parse_args()

    # Allow Windows users to load .env without `source`.
    if args.env_file:
        try_load_dotenv(args.env_file)

    api_key = (
        args.api_key
        or getenv_str("CODEGEN_API_KEY")
        or getenv_str("OPENAI_API_KEY")
        or getenv_str("MOONSHOT_API_KEY")
        or getenv_str("DASHSCOPE_API_KEY")
    ).strip()
    base_url = (args.base_url or getenv_str("CODEGEN_BASE_URL") or getenv_str("OPENAI_BASE_URL")).strip()

    if not api_key:
        raise SystemExit("Missing api key: set CODEGEN_API_KEY or OPENAI_API_KEY (or pass --api-key)")

    try:
        from openai import OpenAI  # type: ignore
    except ImportError:
        raise SystemExit("Missing dependency: openai. Install: pip install openai")

    kwargs = {"api_key": api_key}
    if base_url:
        kwargs["base_url"] = base_url
    client = OpenAI(**kwargs)

    # If /v1/models is disabled, use ping mode instead.
    if args.ping_model:
        extra_body = getenv_json_dict("CODEGEN_EXTRA_BODY")
        use_responses = args.use_responses or (getenv_str("CODEGEN_USE_RESPONSES").lower() in ("1", "true", "yes"))
        try:
            if use_responses and hasattr(client, "responses"):
                resp = client.responses.create(
                    model=args.ping_model,
                    input="ping",
                    extra_body=(extra_body or None),
                )
                _ = getattr(resp, "output_text", "")
            else:
                resp = client.chat.completions.create(
                    model=args.ping_model,
                    messages=[{"role": "user", "content": "ping"}],
                    extra_body=(extra_body or None),
                )
                _ = resp.choices[0].message.content
        except Exception as e:
            hint = ""
            e_str = str(e)
            if base_url and "moonshot.ai" in base_url and ("401" in e_str or "Invalid Authentication" in e_str):
                hint = "\nHint: If you get 401 on api.moonshot.ai, try base_url=https://api.moonshot.cn/v1 (some accounts use the CN endpoint)."
            raise SystemExit(
                f"Ping failed. model={args.ping_model} base_url={base_url or '(default)'} error={e}{hint}"
            )
        print(f"OK: {args.ping_model}")
        return

    try:
        models = client.models.list()
    except Exception as e:
        raise SystemExit(
            "Failed to list models from endpoint (many vendors disable /v1/models). "
            f"base_url={base_url or '(default)'} error={e}\n"
            "Try ping mode instead, e.g. --ping-model <model-id>"
        )

    data = getattr(models, "data", None) or []
    ids = sorted({getattr(m, "id", "") for m in data if getattr(m, "id", "")})
    for mid in ids:
        print(mid)


if __name__ == "__main__":
    main()
