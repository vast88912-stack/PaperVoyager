#!/usr/bin/env python3
"""
Convert `env.txt` (lines like `Provider: <key>`) into dotenv files usable by scripts.

This script intentionally prints nothing sensitive.

Outputs (repo root):
  - .env.gemini
  - .env.openai
  - .env.minimax
  - .env.qwen
  - .env.kimi
  - .env.glm
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ENV_TXT = ROOT / "env.txt"


@dataclass(frozen=True)
class ProviderKey:
    name: str
    key: str


def parse_env_txt(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        name = k.strip().lower()
        key = v.strip()
        if not key:
            continue
        out[name] = key
    return out


def write_dotenv(path: Path, lines: list[str]) -> None:
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def main() -> None:
    if not ENV_TXT.exists():
        raise SystemExit(f"Missing {ENV_TXT}")

    mapping = parse_env_txt(ENV_TXT.read_text(encoding="utf-8", errors="ignore"))

    # Gemini
    if "gemini" in mapping:
        write_dotenv(
            ROOT / ".env.gemini",
            [
                f"GEMINI_API_KEY={mapping['gemini']}",
                "GEMINI_MODEL=gemini-3-pro-preview",
            ],
        )

    # OpenAI
    if "gpt" in mapping:
        write_dotenv(
            ROOT / ".env.openai",
            [
                "CODEGEN_PROVIDER=openai_compatible",
                f"OPENAI_API_KEY={mapping['gpt']}",
                "CODEGEN_MODEL=gpt-4.1",
            ],
        )

    # MiniMax (OpenAI-compatible)
    if "minimax" in mapping:
        write_dotenv(
            ROOT / ".env.minimax",
            [
                "CODEGEN_PROVIDER=openai_compatible",
                f"OPENAI_API_KEY={mapping['minimax']}",
                "OPENAI_BASE_URL=https://api.minimaxi.com/v1",
                "CODEGEN_MODEL=MiniMax-M2.5",
            ],
        )

    # Qwen (DashScope compatible-mode, Responses API)
    if "qwen" in mapping:
        write_dotenv(
            ROOT / ".env.qwen",
            [
                "CODEGEN_PROVIDER=openai_compatible",
                f"DASHSCOPE_API_KEY={mapping['qwen']}",
                "CODEGEN_USE_RESPONSES=1",
                # DashScope compatible-mode Responses API base_url (per repo README).
                "OPENAI_BASE_URL=https://dashscope.aliyuncs.com/api/v2/apps/protocols/compatible-mode/v1",
                "CODEGEN_MODEL=qwen3-max",
            ],
        )

    # Kimi (Moonshot OpenAI-compatible)
    if "kimi" in mapping:
        write_dotenv(
            ROOT / ".env.kimi",
            [
                "CODEGEN_PROVIDER=openai_compatible",
                f"MOONSHOT_API_KEY={mapping['kimi']}",
                "OPENAI_BASE_URL=https://api.moonshot.ai/v1",
                "CODEGEN_MODEL=kimi-k2.5",
            ],
        )

    # GLM-5 (Zhipu / ZAI)
    if "glm-5" in mapping or "glm5" in mapping or "zai" in mapping or "zhipu" in mapping:
        k = mapping.get("glm-5") or mapping.get("glm5") or mapping.get("zai") or mapping.get("zhipu")
        if k:
            write_dotenv(
                ROOT / ".env.glm",
                [
                    "CODEGEN_PROVIDER=zai",
                    f"ZAI_API_KEY={k}",
                    "CODEGEN_MODEL=glm-5",
                ],
            )

    # No printing of secrets.


if __name__ == "__main__":
    main()

