#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
from collections import OrderedDict
from dataclasses import dataclass
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import Patch
from matplotlib.ticker import FuncFormatter


CSV_DEFAULT = Path("benchmark/generated/block_interactive_merged.csv")
OUT_DIR_DEFAULT = Path("benchmark/generated")

ABBREVIATIONS = {
    "Algorithm_Dynamic_Programming": "Alg-DP",
    "Algorithm_Graph_Pathfinding": "Alg-GP",
    "Algorithm_Sorting_Race": "Alg-SR",
    "DataStructure_Balanced_Trees": "DS-BT",
    "DataStructure_Hash_Map": "DS-HM",
    "Distributed_Raft_Consensus": "Dist-Raft",
    "ML_Gradient_Descent": "ML-GD",
    "ML_KMeans_Clustering": "ML-KM",
    "ML_Neural_Network_Viz": "ML-NNV",
    "Math_Chaos_Lorenz": "Math-Lorenz",
    "Math_Fourier_Transform": "Math-FFT",
    "Math_Linear_Algebra_Eigen": "Math-Eig",
    "Math_Monte_Carlo_Estimation": "Math-MC",
    "Physics_Fluid_CFD": "Phys-CFD",
    "Physics_Gravity_Orbits": "Phys-Orbit",
    "Physics_Optics_Lab": "Phys-Opt",
    "Physics_Thermodynamics": "Phys-Therm",
    "Sys_CPU_Scheduler": "Sys-Sched",
    "Sys_Virtual_Memory": "Sys-VM",
}

CATEGORY_ORDER = [
    "Algorithm",
    "DataStructure",
    "Distributed",
    "Genetic",
    "ML",
    "Math",
    "Physics",
    "Sys",
    "Theory",
]

CATEGORY_COLORS = {
    "Algorithm": "#0571B0",
    "DataStructure": "#7B3294",
    "Distributed": "#E08214",
    "Genetic": "#F1A340",
    "ML": "#2166AC",
    "Math": "#CA0020",
    "Physics": "#4DAC26",
    "Sys": "#D01C8B",
    "Theory": "#9D67B0",
}


@dataclass
class TopicPoint:
    topic: str
    abbr: str
    category: str
    x: int
    y: int


def topic_category(topic: str) -> str:
    if topic.startswith("Algorithm_"):
        return "Algorithm"
    if topic.startswith("DataStructure_"):
        return "DataStructure"
    if topic.startswith("Distributed_"):
        return "Distributed"
    if topic.startswith("Genetic_"):
        return "Genetic"
    if topic.startswith("ML_"):
        return "ML"
    if topic.startswith("Math_"):
        return "Math"
    if topic.startswith("Physics_"):
        return "Physics"
    if topic.startswith("Sys_"):
        return "Sys"
    if topic.startswith("Theory_"):
        return "Theory"
    raise ValueError(f"Unknown topic prefix: {topic}")


def load_topic_points(csv_path: Path) -> list[TopicPoint]:
    by_topic: OrderedDict[str, TopicPoint] = OrderedDict()
    with csv_path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            topic = row["topic"]
            if topic not in ABBREVIATIONS:
                continue
            if topic in by_topic:
                continue
            by_topic[topic] = TopicPoint(
                topic=topic,
                abbr=ABBREVIATIONS[topic],
                category=topic_category(topic),
                x=int(row["merged_total_elements"]),
                y=int(row["merged_token_count"]),
            )
    return list(by_topic.values())


def move_text_display(ax, text, dx_px: float, dy_px: float) -> None:
    x_data, y_data = text.get_position()
    x_px, y_px = ax.transData.transform((x_data, y_data))
    new_x, new_y = ax.transData.inverted().transform((x_px + dx_px, y_px + dy_px))
    text.set_position((new_x, new_y))


def auto_adjust_labels(fig, ax, texts, points: list[TopicPoint], iterations: int = 250) -> None:
    fig.canvas.draw()
    renderer = fig.canvas.get_renderer()
    point_pixels = [ax.transData.transform((point.x, point.y)) for point in points]

    for _ in range(iterations):
        moved = False
        boxes = [text.get_window_extent(renderer=renderer).expanded(1.06, 1.16) for text in texts]

        for index, text in enumerate(texts):
            bbox = boxes[index]
            point_x, point_y = point_pixels[index]
            if bbox.x0 <= point_x <= bbox.x1 and bbox.y0 <= point_y <= bbox.y1:
                center_x = (bbox.x0 + bbox.x1) / 2
                center_y = (bbox.y0 + bbox.y1) / 2
                dx = 8 if center_x <= point_x else -8
                dy = 8 if center_y <= point_y else -8
                move_text_display(ax, text, dx, dy)
                moved = True

        if moved:
            fig.canvas.draw()
            renderer = fig.canvas.get_renderer()
            boxes = [text.get_window_extent(renderer=renderer).expanded(1.06, 1.16) for text in texts]

        for left in range(len(texts)):
            for right in range(left + 1, len(texts)):
                a = boxes[left]
                b = boxes[right]
                overlap_x = min(a.x1, b.x1) - max(a.x0, b.x0)
                overlap_y = min(a.y1, b.y1) - max(a.y0, b.y0)
                if overlap_x <= 0 or overlap_y <= 0:
                    continue

                a_center_x = (a.x0 + a.x1) / 2
                b_center_x = (b.x0 + b.x1) / 2
                a_center_y = (a.y0 + a.y1) / 2
                b_center_y = (b.y0 + b.y1) / 2
                dir_x = -1 if a_center_x <= b_center_x else 1
                dir_y = -1 if a_center_y <= b_center_y else 1
                step_x = max(4.0, overlap_x / 2)
                step_y = max(3.0, overlap_y / 2)
                move_text_display(ax, texts[left], dir_x * step_x, dir_y * step_y)
                move_text_display(ax, texts[right], -dir_x * step_x, -dir_y * step_y)
                moved = True

        if not moved:
            break

        fig.canvas.draw()
        renderer = fig.canvas.get_renderer()


class InteractiveScatterEditor:
    def __init__(self, fig, ax, movable_texts, output_png: Path, output_pdf: Path):
        self.fig = fig
        self.ax = ax
        self.movable_texts = movable_texts
        self.output_png = output_png
        self.output_pdf = output_pdf
        self.selected = None
        self.start_mouse_display = None
        self.start_pos = None
        self.start_transform = None

        self.fig.canvas.mpl_connect("pick_event", self.on_pick)
        self.fig.canvas.mpl_connect("motion_notify_event", self.on_motion)
        self.fig.canvas.mpl_connect("button_release_event", self.on_release)
        self.fig.canvas.mpl_connect("key_press_event", self.on_key)

        legend = self.ax.get_legend()
        if legend is not None:
            legend.set_draggable(True, use_blit=True, update="bbox")

        self.ax.text(
            0.99,
            -0.16,
            "Drag labels/title/axes; drag legend directly; press 's' to save, 'q' to quit",
            transform=self.ax.transAxes,
            ha="right",
            va="top",
            fontsize=10,
            bbox=dict(boxstyle="round", facecolor="#f4e3b2", alpha=0.9),
        )

    def _mouse_display(self, mouse_event):
        if mouse_event is None or mouse_event.x is None or mouse_event.y is None:
            return None
        return (mouse_event.x, mouse_event.y)

    def on_pick(self, event):
        if event.artist not in self.movable_texts:
            return
        self.selected = event.artist
        self.start_pos = self.selected.get_position()
        self.start_transform = self.selected.get_transform()
        self.start_mouse_display = self._mouse_display(event.mouseevent)

    def on_motion(self, event):
        if (
            self.selected is None
            or self.start_mouse_display is None
            or self.start_pos is None
            or self.start_transform is None
        ):
            return
        current_display = self._mouse_display(event)
        if current_display is None:
            return

        dx = current_display[0] - self.start_mouse_display[0]
        dy = current_display[1] - self.start_mouse_display[1]

        start_disp = self.start_transform.transform(self.start_pos)
        target_disp = (start_disp[0] + dx, start_disp[1] + dy)
        new_pos = self.start_transform.inverted().transform(target_disp)
        self.selected.set_position((new_pos[0], new_pos[1]))
        self.fig.canvas.draw_idle()

    def on_release(self, event):
        self.selected = None
        self.start_mouse_display = None
        self.start_pos = None
        self.start_transform = None

    def on_key(self, event):
        if event.key == "s":
            self.fig.savefig(self.output_png, bbox_inches="tight", dpi=200)
            self.fig.savefig(self.output_pdf, bbox_inches="tight", dpi=200)
            print(f"Saved: {self.output_png}")
            print(f"Saved: {self.output_pdf}")
        elif event.key == "q":
            plt.close(self.fig)


def build_plot(points: list[TopicPoint], output_png: Path, output_pdf: Path, interactive: bool) -> None:
    plt.rcParams.update(
        {
            "font.family": "DejaVu Serif",
            "font.size": 14,
            "axes.labelsize": 17,
            "axes.titlesize": 20,
            "legend.fontsize": 13,
            "legend.title_fontsize": 14,
        }
    )

    fig, ax = plt.subplots(figsize=(12.4, 5.9), dpi=220)

    grouped: dict[str, list[TopicPoint]] = {category: [] for category in CATEGORY_ORDER}
    for point in points:
        grouped[point.category].append(point)

    # Slight vertical jitter makes nearby points less crowded while preserving trend.
    y_raw = [point.y for point in points]
    y_span_raw = max(y_raw) - min(y_raw)
    jitter_step = max(60.0, y_span_raw * 0.006)
    jitter_pattern = [-1.0, 0.0, 1.0, -0.5, 0.5]
    y_plot: dict[str, float] = {}
    for index, point in enumerate(points):
        y_plot[point.topic] = point.y + jitter_pattern[index % len(jitter_pattern)] * jitter_step

    # Hardcoded opposite offsets for the closest pair to keep a stable, mild separation.
    pair_gap = 150.0
    if "Algorithm_Dynamic_Programming" in y_plot and "Sys_CPU_Scheduler" in y_plot:
        y_plot["Algorithm_Dynamic_Programming"] += pair_gap
        y_plot["Sys_CPU_Scheduler"] -= pair_gap

    for category in CATEGORY_ORDER:
        entries = grouped[category]
        if not entries:
            continue
        ax.scatter(
            [entry.x for entry in entries],
            [y_plot[entry.topic] for entry in entries],
            s=136,
            color=CATEGORY_COLORS[category],
            edgecolors="white",
            linewidths=1.0,
            alpha=0.96,
            label=category,
            zorder=3,
        )

    x_values = [point.x for point in points]
    y_values = [y_plot[point.topic] for point in points]
    y_span = max(y_values) - min(y_values)

    # Point labels are intentionally hidden per user request.
    texts = []

    ax.set_xlim(min(x_values) - 1.0, max(x_values) + 3.8)
    ax.set_ylim(min(y_values) - y_span * 0.04, max(y_values) + y_span * 0.12)
    ax.grid(True, linestyle="--", color="#c7c7c7", alpha=0.55)
    ax.set_axisbelow(True)

    ax.set_xlabel("Number of Interactive Elements")
    ax.set_ylabel("Generated Code Size (k tokens)")
    ax.yaxis.set_major_formatter(FuncFormatter(lambda value, _: f"{value / 1000:.0f}k"))
    ax.tick_params(axis="both", labelsize=14)

    legend_handles = [
        Patch(facecolor=CATEGORY_COLORS[category], edgecolor="none", label=category)
        for category in CATEGORY_ORDER
        if grouped[category]
    ]
    ax.legend(
        handles=legend_handles,
        title="Category",
        loc="upper left",
        bbox_to_anchor=(1.01, 1.0),
        borderaxespad=0.0,
        frameon=False,
    )

    fig.tight_layout()
    if texts:
        auto_adjust_labels(fig, ax, texts, points)

    if interactive:
        editor = InteractiveScatterEditor(
            fig,
            ax,
            movable_texts=[],
            output_png=output_png,
            output_pdf=output_pdf,
        )
        _ = editor
        plt.show()
    else:
        fig.savefig(output_png, bbox_inches="tight", dpi=200)
        fig.savefig(output_pdf, bbox_inches="tight", dpi=200)
        plt.close(fig)
        print(f"Generated: {output_png}")
        print(f"Generated: {output_pdf}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate interactive complexity vs tokens scatter plot")
    parser.add_argument("--csv", type=str, default=str(CSV_DEFAULT), help="CSV data source")
    parser.add_argument("--output-dir", type=str, default=str(OUT_DIR_DEFAULT), help="Output directory")
    parser.add_argument("--no-interactive", action="store_true", help="Save directly without popup")
    args = parser.parse_args()

    csv_path = Path(args.csv)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    points = load_topic_points(csv_path)
    output_png = output_dir / "interactive_vs_tokens.png"
    output_pdf = output_dir / "interactive_vs_tokens.pdf"
    build_plot(points, output_png=output_png, output_pdf=output_pdf, interactive=not args.no_interactive)


if __name__ == "__main__":
    main()