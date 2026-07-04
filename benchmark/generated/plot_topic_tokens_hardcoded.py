from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import Patch


# Hardcoded topic-token data (no CSV dependency)
TOPIC_TOKENS = {
    "Algorithm_Dynamic_Programming": 17173,
    "Algorithm_Graph_Pathfinding": 12046,
    "Algorithm_Sorting_Race": 15876,
    "DataStructure_Balanced_Trees": 13483,
    "DataStructure_Hash_Map": 17339,
    "Distributed_Raft_Consensus": 9784,
    "Genetic_Algorithm_Sandbox": 16556,
    "ML_Gradient_Descent": 18976,
    "ML_KMeans_Clustering": 16583,
    "ML_Neural_Network_Viz": 14944,
    "Math_Chaos_Lorenz": 14917,
    "Math_Fourier_Transform": 16862,
    "Math_Linear_Algebra_Eigen": 17283,
    "Math_Monte_Carlo_Estimation": 17858,
    "Physics_Fluid_CFD": 8575,
    "Physics_Gravity_Orbits": 9209,
    "Physics_Optics_Lab": 15859,
    "Physics_Thermodynamics": 17639,
    "Sys_CPU_Scheduler": 17030,
    "Sys_Virtual_Memory": 22960,
    "Theory_Cellular_Automata": 16707,
}

# Palette aligned to interactive_vs_tokens reference figure style
BASE_PALETTE = [
    "#0571B0",  # blue
    "#7B3294",  # purple
    "#E08214",  # orange
    "#CA0020",  # red
    "#2166AC",  # deep blue
    "#008837",  # green
    "#762A83",  # dark purple
    "#B2182B",  # crimson
    "#F4A582",  # light salmon
]


def get_category(topic: str) -> str:
    return topic.split("_", 1)[0]


def build_chart(output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    out_png = output_dir / "topic_tokens_bar.png"
    out_pdf = output_dir / "topic_tokens_bar.pdf"
    out_caption = output_dir / "topic_tokens_bar_caption.txt"
    out_map = output_dir / "topic_tokens_bar_topic_map.txt"

    # Sort descending by token count
    items = sorted(TOPIC_TOKENS.items(), key=lambda x: x[1], reverse=True)

    categories = []
    for topic, _ in items:
        cat = get_category(topic)
        if cat not in categories:
            categories.append(cat)

    cat_to_color = {cat: BASE_PALETTE[i % len(BASE_PALETTE)] for i, cat in enumerate(categories)}

    labels = [f"T{i + 1:02d}" for i in range(len(items))]
    values = [v for _, v in items]
    colors = [cat_to_color[get_category(t)] for t, _ in items]

    plt.rcParams.update({"font.size": 10, "axes.labelsize": 11})

    fig, ax = plt.subplots(figsize=(16, 7), dpi=200)
    bars = ax.bar(
        labels,
        values,
        color=colors,
        edgecolor="#333333",
        linewidth=0.55,
        width=0.62,
    )

    # No chart title (requested)
    ax.set_xlabel("Topic ID")
    ax.set_ylabel("Merged Token Count")
    ax.grid(axis="y", linestyle="--", alpha=0.3, color="#9e9e9e")
    ax.set_axisbelow(True)

    offset = max(values) * 0.006
    for b, v in zip(bars, values):
        ax.text(
            b.get_x() + b.get_width() / 2,
            v + offset,
            f"{v}",
            ha="center",
            va="bottom",
            fontsize=8,
            rotation=90,
            color="#222222",
        )

    legend_handles = [
        Patch(facecolor=cat_to_color[c], edgecolor="#333333", label=c) for c in categories
    ]
    ax.legend(
        handles=legend_handles,
        title="Type",
        ncol=min(5, len(categories)),
        frameon=False,
        loc="upper right",
    )

    plt.tight_layout()
    fig.savefig(out_png, bbox_inches="tight")
    fig.savefig(out_pdf, bbox_inches="tight")
    plt.close(fig)

    with out_map.open("w", encoding="utf-8") as f:
        f.write("Topic ID Mapping (sorted by merged_token_count desc)\n")
        for i, (topic, value) in enumerate(items, start=1):
            cat = get_category(topic)
            f.write(f"T{i:02d}: {topic} | type={cat} | tokens={value}\n")

    caption = (
        "Merged token count for each topic. "
        "Each bar corresponds to one topic (T01--T21, sorted in descending token count), "
        "and colors indicate topic type categories (Algorithm, DataStructure, Distributed, "
        "Genetic, ML, Math, Physics, Sys, Theory). "
        "The color palette is aligned to the interactive_vs_tokens reference figure. "
        "Full Topic ID to topic-name mapping is provided in topic_tokens_bar_topic_map.txt."
    )
    out_caption.write_text(caption + "\n", encoding="utf-8")

    print(f"Generated: {out_png}")
    print(f"Generated: {out_pdf}")
    print(f"Generated: {out_caption}")
    print(f"Generated: {out_map}")


if __name__ == "__main__":
    build_chart(Path("benchmark/generated"))
