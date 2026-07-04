from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class ChecklistItem:
    id: str
    description: str
    action: str
    expected: str
    weight: float
    evidence: str
    auto_rule: dict[str, Any]


MODULE_META = {
    "GLOBAL": {"title": "Global App Checks"},
    "M0": {"title": "The Descent"},
    "M1": {"title": "The Loss Landscape"},
    "M2": {"title": "Steps & Learning Rate"},
    "M3": {"title": "Local Minima"},
    "M4": {"title": "Optimizers"},
    "M5": {"title": "Blind Climber"},
    "ROBUSTNESS": {"title": "Robustness"},
}


def load_tasks(tasks_path: Path) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
    for line in tasks_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        tasks.append(json.loads(line))
    return tasks


def to_item(task: dict[str, Any]) -> ChecklistItem:
    judge = task.get("judge", {})
    evidence = task.get("evidence", {})
    return ChecklistItem(
        id=task["task_id"],
        description=task["task"],
        action="按 runner 轨迹执行（或人工按描述操作）",
        expected=f"满足 judge 规则：{judge.get('type', 'unknown')}",
        weight=float(1.0 if task.get("difficulty", 1) == 1 else 1.5 if task.get("difficulty", 1) == 2 else 2.0),
        evidence=f"screens_min={evidence.get('screens_min')} trace_min_steps={evidence.get('trace_min_steps')}",
        auto_rule=judge,
    )


def render_txt(module: str, items: list[ChecklistItem]) -> str:
    meta = MODULE_META.get(module, {"title": module})
    total_weight = sum(i.weight for i in items) or 1.0
    lines: list[str] = []
    lines.append(f"### GradientLab Benchmark Checklist (v1)")
    lines.append(f"module: {module}")
    lines.append(f"title: {meta['title']}")
    lines.append(f"items: {len(items)}")
    lines.append(f"total_weight: {total_weight:.2f}")
    lines.append("")
    lines.append("#### Items")
    for it in items:
        lines.append(f"- id: {it.id}")
        lines.append(f"  weight: {it.weight}")
        lines.append(f"  description: {it.description}")
        lines.append(f"  action: {it.action}")
        lines.append(f"  expected: {it.expected}")
        lines.append(f"  evidence: {it.evidence}")
        lines.append(f"  auto_judge_rule: {json.dumps(it.auto_rule, ensure_ascii=False)}")
    lines.append("")
    lines.append("#### Scoring")
    lines.append("- 每项：pass=weight，fail=0。")
    lines.append("- 模块得分 = sum(pass_weights) / sum(weights)。")
    lines.append("- 全局/总体 Success Rate 以任务通过率（pass/total）统计。")
    lines.append("- 如启用 LLM/VLM 评测：同一任务可重复评测 3 次，输出 mean±std（对齐 WebVoyager Table 1 风格）。")
    return "\n".join(lines) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tasks", type=str, default=str(Path(__file__).parent / "tasks" / "gradientlab_v1.jsonl"))
    ap.add_argument("--out_dir", type=str, default=str(Path(__file__).parent / "checklists" / "v1"))
    args = ap.parse_args()

    tasks_path = Path(args.tasks)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    tasks = load_tasks(tasks_path)
    by_module: dict[str, list[ChecklistItem]] = {}
    for t in tasks:
        mod = t.get("module", "UNKNOWN")
        by_module.setdefault(mod, []).append(to_item(t))

    for mod, items in sorted(by_module.items(), key=lambda kv: kv[0]):
        (out_dir / f"{mod}_{MODULE_META.get(mod, {'title': mod})['title'].replace(' ', '_')}.txt").write_text(
            render_txt(mod, items),
            encoding="utf-8",
        )

    # Also write an index file
    index_lines = ["### GradientLab Benchmark Checklist Index (v1)", ""]
    for mod, items in sorted(by_module.items(), key=lambda kv: kv[0]):
        fname = f"{mod}_{MODULE_META.get(mod, {'title': mod})['title'].replace(' ', '_')}.txt"
        index_lines.append(f"- {mod}: {fname} ({len(items)} items)")
    (out_dir / "INDEX.txt").write_text("\n".join(index_lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()


