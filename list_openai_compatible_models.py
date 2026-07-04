#!/usr/bin/env python3
"""Convenience wrapper.

Allows running from repo root:
  python list_openai_compatible_models.py --env-file .env.minimax

Actual implementation lives in tools/list_openai_compatible_models.py.
"""

from __future__ import annotations

import runpy
from pathlib import Path


def main() -> None:
    target = Path(__file__).resolve().parent / "tools" / "list_openai_compatible_models.py"
    runpy.run_path(str(target), run_name="__main__")


if __name__ == "__main__":
    main()
