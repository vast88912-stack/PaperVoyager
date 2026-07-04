#!/usr/bin/env python3
"""
Reorganize all outputs by model into outputs_by_model/<model>/.
Includes baseline, WebVoyager (PaperVoyager), and each model's tsx outputs.
"""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT_BASE = ROOT / "outputs_by_model"

# Model name -> source path (tsx projects)
MODELS = {
    "baseline": ROOT / "outputs" / "tsx",
    "WebVoyager": ROOT / "outputs" / "models" / "PaperVoyager" / "tsx",
    "chatgpt-5.2": ROOT / "outputs" / "models" / "chatgpt-5.2" / "tsx",
    "gemini-3-pro": ROOT / "outputs" / "models" / "gemini-3-pro" / "tsx",
    "kimi": ROOT / "outputs" / "models" / "kimi" / "tsx",
    "qwen": ROOT / "outputs" / "models" / "qwen" / "tsx",
    "minimax": ROOT / "outputs" / "models" / "minimax" / "tsx",
}


def is_project(p: Path) -> bool:
    return (
        p.is_dir()
        and (p / "package.json").exists()
        and (p / "src" / "main.tsx").exists()
        and (p / "index.html").exists()
    )


def main():
    OUT_BASE.mkdir(parents=True, exist_ok=True)
    for model_name, src in MODELS.items():
        if not src.exists():
            print(f"[SKIP] {model_name}: {src} not found")
            continue
        dst = OUT_BASE / model_name
        dst.mkdir(parents=True, exist_ok=True)
        projects = [p for p in sorted(src.iterdir()) if is_project(p)]
        copied = 0
        for proj in projects:
            target = dst / proj.name
            if target.exists():
                shutil.rmtree(target)
            shutil.copytree(proj, target, ignore=shutil.ignore_patterns("node_modules", ".build.*"))
            copied += 1
        print(f"[OK] {model_name}: {copied} projects -> {dst}")
    print(f"Done. Outputs in {OUT_BASE}")


if __name__ == "__main__":
    main()
