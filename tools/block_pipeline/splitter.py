"""
splitter.py — Parse prompt txt files into BlockSpec lists.

Each BlockSpec represents one module/section of the app that will be
generated independently (5 variants), evaluated by Qwen3-VL, and merged.
"""

from __future__ import annotations
import re
from dataclasses import dataclass
from pathlib import Path


@dataclass
class BlockSpec:
    index: int          # 0-based block index
    name: str           # Slug-safe name, e.g. "fibonacci_panel"
    title: str          # Human-readable title, e.g. "Fibonacci Panel"
    description: str    # Short description from prompt
    full_prompt: str    # Complete original prompt (for context)


def _slugify(text: str) -> str:
    """Convert a title to a slug-safe name."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s]", "", text)
    text = re.sub(r"\s+", "_", text)
    return text[:40]


def _parse_module_plan(prompt_text: str) -> list[tuple[str, str]]:
    """
    Extract numbered items from a 'Module Plan:' section.
    Returns list of (title, description) tuples.
    """
    # Find Module Plan section
    module_section_match = re.search(
        r"Module Plan:\s*\n(.*?)(?:\n[A-Z][^:]*:|$)",
        prompt_text,
        re.DOTALL | re.IGNORECASE,
    )
    if module_section_match:
        section = module_section_match.group(1)
    else:
        section = prompt_text

    # Match numbered items like: "1) Title: description" or "1. Title: description"
    pattern = re.compile(
        r"^\s*\d+[.)]\s*(.+?)(?:\n|$)",
        re.MULTILINE,
    )
    items = pattern.findall(section)

    results = []
    for item in items:
        item = item.strip()
        # Split on first colon to get title vs description
        if ":" in item:
            title, _, desc = item.partition(":")
            results.append((title.strip(), desc.strip()))
        else:
            results.append((item, item))

    return results


def _parse_semicolon_sections(prompt_text: str) -> list[tuple[str, str]]:
    """
    Parse semicolon-delimited items from 'Sections:' or 'Features:' lines.
    e.g. 'Sections: hero; 3D canvas; sliders; ...'
    Returns list of (title, description) tuples.
    """
    results = []
    for keyword in ("Sections", "Features", "Modules", "Components"):
        match = re.search(
            rf"{keyword}:\s*(.+?)(?:\n[A-Z]|$)",
            prompt_text,
            re.DOTALL | re.IGNORECASE,
        )
        if match:
            raw = match.group(1).strip().replace("\n", " ")
            parts = [p.strip() for p in raw.split(";") if p.strip()]
            if len(parts) >= 3:
                for part in parts:
                    # First few words become the title
                    words = part.split()
                    title_words = words[:4]
                    title = " ".join(title_words).rstrip(",.:").title()
                    results.append((title, part))
                return results
    return results


def split_prompt(prompt_path: str | Path) -> list[BlockSpec]:
    """
    Parse a prompt file and return a list of BlockSpec objects.

    Strategy:
    1. Look for 'Module Plan:' section with numbered items
    2. Fall back to finding any numbered list in the prompt
    3. If no structure found, create 5 generic blocks from the full prompt
    """
    path = Path(prompt_path)
    prompt_text = path.read_text(encoding="utf-8")

    items = _parse_module_plan(prompt_text)

    if not items:
        # Fallback 1: semicolon-separated sections/features line
        items = _parse_semicolon_sections(prompt_text)

    if not items:
        # Fallback 2: find any numbered list anywhere in the text
        pattern = re.compile(r"^\s*\d+[.)]\s*(.+?)(?:\n|$)", re.MULTILINE)
        raw_items = pattern.findall(prompt_text)
        for item in raw_items:
            item = item.strip()
            if len(item) > 10:  # ignore very short matches
                if ":" in item:
                    title, _, desc = item.partition(":")
                    items.append((title.strip(), desc.strip()))
                else:
                    items.append((item, item))

    if not items:
        # Final fallback: 5 generic blocks
        project_line = prompt_text.split("\n")[0].strip()
        items = [
            ("Hero Introduction", f"Landing hero for: {project_line}"),
            ("Core Visualization", f"Main interactive visualization for: {project_line}"),
            ("Controls & Parameters", f"User controls and parameter sliders for: {project_line}"),
            ("Analysis & Output", f"Analysis panel and output display for: {project_line}"),
            ("Theory & Reference", f"Theory explanation and reference material for: {project_line}"),
        ]

    blocks = []
    for i, (title, description) in enumerate(items):
        blocks.append(
            BlockSpec(
                index=i,
                name=_slugify(title),
                title=title,
                description=description,
                full_prompt=prompt_text,
            )
        )

    return blocks


if __name__ == "__main__":
    import sys
    import json

    if len(sys.argv) < 2:
        print("Usage: python splitter.py <prompt_path>")
        sys.exit(1)

    blocks = split_prompt(sys.argv[1])
    for b in blocks:
        print(f"Block {b.index}: {b.title}")
        print(f"  name: {b.name}")
        print(f"  desc: {b.description[:80]}")
    print(f"\nTotal blocks: {len(blocks)}")
