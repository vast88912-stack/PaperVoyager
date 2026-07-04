"""
merger.py — Merge N best-variant TSX blocks into a single App.tsx via LLM.

Collects the best TSX code from each block, builds a merge prompt,
calls the LLM (ideally a higher-quality model like Gemini Pro),
and cleans the output.

On any failure, raises MergeFailedError with actionable instructions
rather than silently degrading to a placeholder.
"""

from __future__ import annotations
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_REPO_ROOT))

from generate_apps import CodegenConfig, call_codegen_llm, clean_code_fence, ensure_export_default
from tools.block_pipeline.splitter import BlockSpec


class MergeFailedError(RuntimeError):
    """Raised when LLM merge fails. Includes path to saved prompt for manual retry."""
    pass


MERGE_SYSTEM_INSTRUCTION = """\
You are merging multiple React component blocks into one monolithic App.tsx.
Return ONLY valid TSX code — no markdown fences, no explanations.
The merged file must:
- Have one unified imports section at the top
- Have one root App() default export function
- Deduplicate all state and helper functions
- Render all blocks in a sidebar-navigated layout (similar to the original prompt's design)
- Use Tailwind CSS for styling
- Be fully self-contained in a single file
"""


def _build_merge_prompt(
    slug: str,
    blocks: list[BlockSpec],
    best_codes: list[str],
    original_prompt: str,
) -> str:
    """Build the merge prompt from block codes."""
    block_sections = []
    for i, (block, code) in enumerate(zip(blocks, best_codes)):
        block_sections.append(
            f"=== BLOCK {i + 1}: {block.title} ===\n"
            f"Description: {block.description}\n\n"
            f"{code}\n"
        )

    blocks_text = "\n\n".join(block_sections)

    return f"""{MERGE_SYSTEM_INSTRUCTION}

---
ORIGINAL APP SPECIFICATION:
{original_prompt}

---
You have {len(blocks)} block implementations to merge.
Each block is a standalone React component that implements one module.
Your task: combine them into a single polished App.tsx.

Design requirements:
- Left sidebar with navigation tabs for each module
- Main content area that shows the active module
- Unified dark theme (slate-950 background, slate-100 text)
- Keep all interactive features from each block intact
- Merge duplicate imports and state declarations

{blocks_text}

---
Return ONLY the complete src/App.tsx code with export default function App().
"""


def merge_blocks(
    slug: str,
    blocks: list[BlockSpec],
    best_codes: list[str],
    merge_cfg: CodegenConfig,
    out_dir: Path,
    skip_if_exists: bool = True,
) -> Path:
    """
    Merge best block variants into a final App.tsx.
    Returns path to merged_App.tsx.

    Raises MergeFailedError (with actionable message) on any failure
    instead of silently degrading to a placeholder.
    """
    merged_path = out_dir / "merged_App.tsx"
    prompt_path = out_dir / "merge_prompt.txt"
    raw_response_path = out_dir / "merge_raw_response.txt"

    if skip_if_exists and merged_path.exists():
        print(f"  [merger] Already exists: {merged_path}")
        return merged_path

    if not blocks or not best_codes:
        raise ValueError("No blocks or codes to merge")

    original_prompt = blocks[0].full_prompt
    prompt = _build_merge_prompt(slug, blocks, best_codes, original_prompt)

    # Always save the prompt so the user can inspect or manually rerun it
    prompt_path.write_text(prompt, encoding="utf-8")
    print(f"  [merger] Merge prompt saved: {prompt_path}")

    print(f"  [merger] Calling LLM to merge {len(blocks)} blocks (model={merge_cfg.model})...")
    try:
        text = call_codegen_llm(cfg=merge_cfg, prompt=prompt)
    except Exception as e:
        raise MergeFailedError(
            f"LLM API call failed: {e}\n\n"
            f"To retry manually:\n"
            f"  1. Check your API key / network\n"
            f"  2. Run the merge stage again:\n"
            f"       python tools/block_pipeline/pipeline.py --prompts {slug} \\\n"
            f"         --skip-generate --skip-render --skip-eval\n"
            f"  3. Or send the prompt file directly to the LLM and save the result as:\n"
            f"       {merged_path}\n"
            f"  Prompt file: {prompt_path}"
        ) from e

    if not text.strip():
        raise MergeFailedError(
            f"LLM returned an empty response.\n\n"
            f"To retry:\n"
            f"  python tools/block_pipeline/pipeline.py --prompts {slug} \\\n"
            f"    --skip-generate --skip-render --skip-eval\n"
            f"  Prompt file: {prompt_path}"
        )

    # Save raw response for debugging
    raw_response_path.write_text(text, encoding="utf-8")

    code = clean_code_fence(text)
    code, changed = ensure_export_default(code)
    if changed:
        print("  [merger] 🩹 Auto-fixed missing export default")

    if "export default" not in code:
        # Save what the LLM produced so the user can inspect and fix it
        failed_path = out_dir / "merged_App.tsx.failed"
        failed_path.write_text(code, encoding="utf-8")
        raise MergeFailedError(
            f"LLM output is missing 'export default' — the code is not valid as App.tsx.\n\n"
            f"Files saved for inspection:\n"
            f"  Raw LLM response : {raw_response_path}\n"
            f"  Cleaned code     : {failed_path}\n"
            f"  Merge prompt     : {prompt_path}\n\n"
            f"To fix:\n"
            f"  1. Open {failed_path} and add 'export default function App()' manually\n"
            f"  2. Save it as {merged_path}\n"
            f"  3. Then continue with the build:\n"
            f"       cd {out_dir}/_merged_app && npm run build"
        )

    merged_path.write_text(code, encoding="utf-8")
    print(f"  [merger] ✅ Saved merged App.tsx: {merged_path}")
    return merged_path
