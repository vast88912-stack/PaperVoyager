"""
generator.py — Generate 5 TSX variant files per BlockSpec via LLM API.

Reuses CodegenConfig and call_codegen_llm from generate_apps.py.
Each variant is generated with a different temperature to encourage diversity.
"""

from __future__ import annotations
import os
import sys
import time
import dataclasses
from pathlib import Path
from typing import Optional

# Add repo root to sys.path so we can import generate_apps
_REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_REPO_ROOT))

from generate_apps import CodegenConfig, call_codegen_llm, clean_code_fence, ensure_export_default
from tools.block_pipeline.splitter import BlockSpec

VARIANT_TEMPERATURES = [0.3, 0.6, 0.8, 1.0, 1.2]
NUM_VARIANTS = len(VARIANT_TEMPERATURES)

BLOCK_SYSTEM_INSTRUCTION = """\
You are an expert React/TypeScript developer.
Return ONLY valid TSX code — no markdown fences, no explanations.
The code must be a complete standalone React component.
It must include all necessary imports at the top.
It must export a default function named App.
Use Tailwind CSS for styling. Make it visually rich and interactive.
"""


def _build_block_prompt(block: BlockSpec, variant_index: int) -> str:
    """Build a focused sub-prompt for a single block variant."""
    return f"""{block.full_prompt}

---
FOCUS INSTRUCTION:
You are building ONLY the following module/section (block {block.index + 1}):

Title: {block.title}
Description: {block.description}

Build a complete, standalone React component that implements this specific module.
- Include all necessary React imports and any helper functions.
- Export as: export default function App()
- Use Tailwind CSS for styling.
- Make it fully interactive and visually engaging.
- This is variant #{variant_index + 1} — make it distinct and high-quality.

Return ONLY the TSX code for src/App.tsx.
"""


def generate_variants(
    cfg: CodegenConfig,
    block: BlockSpec,
    out_dir: Path,
    num_variants: int = NUM_VARIANTS,
    temperatures: Optional[list[float]] = None,
) -> list[Path]:
    """
    Generate `num_variants` TSX files for a single block.
    Returns list of paths to generated code.tsx files.
    """
    if temperatures is None:
        temperatures = VARIANT_TEMPERATURES[:num_variants]

    out_dir.mkdir(parents=True, exist_ok=True)
    result_paths: list[Path] = []

    for j in range(num_variants):
        variant_dir = out_dir / f"variant_{j}"
        variant_dir.mkdir(parents=True, exist_ok=True)
        code_path = variant_dir / "code.tsx"

        if code_path.exists():
            print(f"    [block {block.index} variant {j}] Already exists, skipping.")
            result_paths.append(code_path)
            continue

        # Build a config copy with modified temperature
        temp = temperatures[j] if j < len(temperatures) else 0.8
        # Clamp temperature for APIs that don't support > 1.0
        if cfg.provider == "gemini":
            temp = min(temp, 1.0)

        cfg_variant = dataclasses.replace(cfg, temperature=temp)

        prompt = _build_block_prompt(block, j)

        print(f"    [block {block.index} '{block.title}' variant {j}] Calling LLM (temp={temp:.1f})...")
        text = None
        max_retries = 5
        for attempt in range(1, max_retries + 1):
            try:
                text = call_codegen_llm(cfg=cfg_variant, prompt=prompt)
                if text.strip():
                    break
                print(f"    [block {block.index} variant {j}] ⚠️  Empty response (attempt {attempt}/{max_retries}), retrying...")
            except Exception as e:
                wait = 2 ** attempt  # exponential backoff: 2, 4, 8, 16, 32s
                print(f"    [block {block.index} variant {j}] ⚠️  API error (attempt {attempt}/{max_retries}): {e}")
                if attempt < max_retries:
                    print(f"    [block {block.index} variant {j}]    Retrying in {wait}s...")
                    time.sleep(wait)
                else:
                    print(f"    [block {block.index} variant {j}] ❌ All {max_retries} attempts failed, writing placeholder.")
                    code_path.write_text(
                        f"// Error after {max_retries} attempts: {e}\nexport default function App() {{ return <div>Error</div>; }}",
                        encoding="utf-8",
                    )
                    result_paths.append(code_path)
                text = None

        if text is None or not text.strip():
            if not code_path.exists():
                code_path.write_text("// Empty response\nexport default function App() { return <div>Empty</div>; }", encoding="utf-8")
                result_paths.append(code_path)
            continue

        code = clean_code_fence(text)
        code, changed = ensure_export_default(code)
        if changed:
            print(f"    [block {block.index} variant {j}] 🩹 Auto-fixed export default")

        code_path.write_text(code, encoding="utf-8")
        print(f"    [block {block.index} variant {j}] ✅ Saved {code_path}")
        result_paths.append(code_path)

        # Brief pause to avoid rate limiting
        if j < num_variants - 1:
            time.sleep(0.5)

    return result_paths
