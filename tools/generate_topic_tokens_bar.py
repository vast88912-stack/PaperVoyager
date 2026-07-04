#!/usr/bin/env python3
"""
Generate a bar chart of merged token count by topic, grouped by domain.
Data is hardcoded (not read from CSV).
Bars are grouped by domain/category (not globally sorted).
Supports interactive editing: drag text to adjust positions, press 's' to save PDF.
Color palette extracted from interactive_vs_tokens reference figure.
"""

import matplotlib.pyplot as plt
from matplotlib.patches import Patch
from pathlib import Path


# Hardcoded mapping: (abbrev, full_topic_name, token_count, domain)
TOPIC_DATA = [
    ("Alg-DP", "Algorithm_Dynamic_Programming", 17173, "Algorithms"),
    ("Alg-GP", "Algorithm_Graph_Pathfinding", 12046, "Algorithms"),
    ("Alg-SR", "Algorithm_Sorting_Race", 15876, "Algorithms"),
    ("DS-BT", "DataStructure_Balanced_Trees", 13483, "Data Structures"),
    ("DS-HM", "DataStructure_Hash_Map", 17339, "Data Structures"),
    ("Dist-Raft", "Distributed_Raft_Consensus", 9784, "Distributed Sys."),
    ("Math-Lorenz", "Math_Chaos_Lorenz", 14917, "Mathematics"),
    ("Math-FFT", "Math_Fourier_Transform", 16862, "Mathematics"),
    ("Math-Eig", "Math_Linear_Algebra_Eigen", 17283, "Mathematics"),
    ("Math-MC", "Math_Monte_Carlo_Estimation", 17858, "Mathematics"),
    ("ML-GD", "ML_Gradient_Descent", 18976, "Machine Learning"),
    ("ML-KM", "ML_KMeans_Clustering", 16583, "Machine Learning"),
    ("ML-NNV", "ML_Neural_Network_Viz", 14944, "Machine Learning"),
    ("Phys-CFD", "Physics_Fluid_CFD", 8575, "Physics"),
    ("Phys-Orbit", "Physics_Gravity_Orbits", 9209, "Physics"),
    ("Phys-Opt", "Physics_Optics_Lab", 15859, "Physics"),
    ("Phys-Therm", "Physics_Thermodynamics", 17639, "Physics"),
    ("Sys-Sched", "Sys_CPU_Scheduler", 17030, "Systems"),
    ("Sys-VM", "Sys_Virtual_Memory", 22960, "Systems"),
]

# Domain order (for consistent layout)
DOMAIN_ORDER = [
    "Systems",
    "Algorithms",
    "Data Structures",
    "Distributed Sys.",
    "Mathematics",
    "Machine Learning",
    "Physics",
]

# Domain-to-color mapping (ColorBrewer palette, extracted from interactive_vs_tokens reference)
DOMAIN_COLORS = {
    "Algorithms": "#0571B0",           # blue
    "Data Structures": "#7B3294",      # purple
    "Distributed Sys.": "#E08214",     # orange
    "Mathematics": "#CA0020",          # red
    "Machine Learning": "#2166AC",     # deep blue
    "Physics": "#4dac26",              # green (from reference image)
    "Systems": "#d01c8b",              # magenta/pink (from reference image)
}


class InteractiveChartEditor:
    """Interactive editor for chart text positioning."""
    
    def __init__(self, fig, ax, output_dir, movable_texts=None):
        self.fig = fig
        self.ax = ax
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.movable_texts = movable_texts or []
        
        self.selected_text = None
        self.press_axes = None
        self.start_pos = None
        
        # Connect events
        self.fig.canvas.mpl_connect('pick_event', self.on_pick)
        self.fig.canvas.mpl_connect('motion_notify_event', self.on_motion)
        self.fig.canvas.mpl_connect('button_release_event', self.on_release)
        self.fig.canvas.mpl_connect('key_press_event', self.on_key_press)

        # Built-in draggable legend support
        legend = self.ax.get_legend()
        if legend is not None:
            legend.set_draggable(True, use_blit=True, update='bbox')
        
        # Info text
        info = (
            "Instructions:\n"
            "  • Drag text labels to move them\n"
            "  • Press 's' to save PDF\n"
            "  • Press 'q' to quit without saving"
        )
        self.ax.text(
            0.99, -0.15, info,
            transform=self.ax.transAxes,
            fontsize=9,
            ha='right',
            va='top',
            bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8),
            family='monospace'
        )
    
    def on_pick(self, event):
        if event.artist in self.movable_texts:
            self.selected_text = event.artist
            self.start_pos = self.selected_text.get_position()
            self.press_axes = self._mouse_to_axes(event.mouseevent)
    
    def _mouse_to_axes(self, mouse_event):
        if mouse_event is None:
            return None
        if mouse_event.x is None or mouse_event.y is None:
            return None
        return self.ax.transAxes.inverted().transform((mouse_event.x, mouse_event.y))
    
    def on_motion(self, event):
        if self.selected_text is None or self.press_axes is None or self.start_pos is None:
            return

        cur_axes = self._mouse_to_axes(event)
        if cur_axes is None:
            return

        dx = cur_axes[0] - self.press_axes[0]
        dy = cur_axes[1] - self.press_axes[1]

        self.selected_text.set_position((self.start_pos[0] + dx, self.start_pos[1] + dy))
        self.fig.canvas.draw_idle()
    
    def on_release(self, event):
        self.selected_text = None
        self.press_axes = None
        self.start_pos = None
    
    def on_key_press(self, event):
        if event.key == 's':
            self.save_pdf()
        elif event.key == 'q':
            plt.close(self.fig)
    
    def save_pdf(self):
        png_path = self.output_dir / 'topic_tokens_bar.png'
        pdf_path = self.output_dir / 'topic_tokens_bar.pdf'
        
        self.fig.savefig(png_path, bbox_inches='tight', dpi=200)
        self.fig.savefig(pdf_path, bbox_inches='tight', dpi=200)
        
        print(f"\n✓ Saved: {png_path}")
        print(f"✓ Saved: {pdf_path}")
        plt.close(self.fig)


def generate_chart(
    output_dir: str = "benchmark/generated",
    dpi: int = 200,
    figsize: tuple = (16, 7),
    interactive: bool = True,
):
    """
    Generate the topic token bar chart grouped by domain (not globally sorted).
    Hardcoded data, no CSV dependency.
    
    Args:
        output_dir: Directory to save PNG/PDF/caption files
        dpi: Resolution for PNG output
        figsize: Figure size (width, height)
        interactive: If True, show interactive window for adjusting positions
    """
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # Group by domain and sort within each domain
    grouped = {domain: [] for domain in DOMAIN_ORDER}
    for item in TOPIC_DATA:
        domain = item[3]
        if domain in grouped:
            grouped[domain].append(item)
    
    # Sort within each domain by token count (descending)
    for domain in grouped:
        grouped[domain].sort(key=lambda x: x[2], reverse=True)
    
    # Flatten in domain order
    ordered_data = []
    for domain in DOMAIN_ORDER:
        ordered_data.extend(grouped[domain])
    
    abbrevs = [item[0] for item in ordered_data]
    tokens = [item[2] for item in ordered_data]
    domains = [item[3] for item in ordered_data]
    colors = [DOMAIN_COLORS[d] for d in domains]
    
    # Create figure
    plt.rcParams.update({
        'font.size': 12,
        'axes.labelsize': 14,
    })
    
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)
    
    # Bar chart with slim bars
    bars = ax.bar(
        abbrevs,
        tokens,
        color=colors,
        edgecolor='#333333',
        linewidth=0.55,
        width=0.62,
    )
    
    # Add light vertical separators between domains
    prev_idx = 0
    for domain in DOMAIN_ORDER:
        if domain in grouped:
            prev_idx += len(grouped[domain])
            if prev_idx < len(abbrevs):
                ax.axvline(x=prev_idx - 0.5, color='#cccccc', linestyle=':', linewidth=0.8, alpha=0.5)
    
    # No title (per user request)
    ax.set_xlabel('Topic Abbreviation', fontsize=14)
    ax.set_ylabel('Merged Token Count', fontsize=14)
    ax.grid(axis='y', linestyle='--', alpha=0.3, color='#9e9e9e')
    ax.set_axisbelow(True)
    
    # Legend grouped by domain (in order)
    legend_handles = [
        Patch(facecolor=DOMAIN_COLORS[d], edgecolor='#333333', label=d)
        for d in DOMAIN_ORDER if d in grouped and len(grouped[d]) > 0
    ]
    ax.legend(
        handles=legend_handles,
        title='Domain',
        ncol=min(4, len(legend_handles)),
        frameon=False,
        loc='upper right',
        fontsize=12,
        title_fontsize=12,
    )
    
    plt.xticks(rotation=45, ha='right', fontsize=12)
    plt.yticks(fontsize=12)
    plt.tight_layout()
    
    # Save caption and mapping
    caption_text = (
        "Merged token count for each benchmark topic, grouped by domain and sorted "
        "by token count within each domain. Topics are color-coded by domain category: "
        "Algorithms (blue), Data Structures (purple), Distributed Systems (orange), "
        "Mathematics (red), Machine Learning (deep blue), Physics (green), and Systems (magenta). "
        "Color palette is extracted from the interactive_vs_tokens reference figure."
    )
    caption_path = out_dir / 'topic_tokens_bar_caption.txt'
    caption_path.write_text(caption_text + '\n', encoding='utf-8')
    print(f"✓ Generated: {caption_path}")
    
    # Abbreviation mapping (for reference)
    mapping_text = (
        "Topic Abbreviation Mapping\n"
        "==========================\n\n"
    )
    for abbrev, topic, tokens_val, domain in ordered_data:
        mapping_text += f"{abbrev:15s} | {topic:40s} | {domain:20s} | {tokens_val:5d} tokens\n"
    
    mapping_path = out_dir / 'topic_tokens_bar_abbrev_map.txt'
    mapping_path.write_text(mapping_text, encoding='utf-8')
    print(f"✓ Generated: {mapping_path}")
    
    # Interactive mode
    if interactive:
        print("\n" + "="*60)
        print("INTERACTIVE MODE")
        print("="*60)
        print("Instructions:")
        print("  • Drag axis labels or legend to reposition")
        print("  • Press 's' to SAVE PDF/PNG")
        print("  • Press 'q' to QUIT without saving")
        print("="*60 + "\n")

        # Replace default axis labels with movable text in axes coordinates.
        ax.set_xlabel("")
        ax.set_ylabel("")
        xlabel_text = ax.text(
            0.5,
            -0.12,
            'Topic Abbreviation',
            transform=ax.transAxes,
            ha='center',
            va='top',
            fontsize=14,
            picker=5,
        )
        ylabel_text = ax.text(
            -0.08,
            0.5,
            'Merged Token Count',
            transform=ax.transAxes,
            rotation=90,
            ha='right',
            va='center',
            fontsize=14,
            picker=5,
        )

        editor = InteractiveChartEditor(fig, ax, out_dir, movable_texts=[xlabel_text, ylabel_text])
        plt.show()
    else:
        # Non-interactive: just save
        png_path = out_dir / 'topic_tokens_bar.png'
        pdf_path = out_dir / 'topic_tokens_bar.pdf'
        fig.savefig(png_path, bbox_inches='tight')
        fig.savefig(pdf_path, bbox_inches='tight')
        plt.close(fig)
        print(f"✓ Generated: {png_path}")
        print(f"✓ Generated: {pdf_path}")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Generate topic tokens bar chart')
    parser.add_argument('--no-interactive', action='store_true', help='Skip interactive mode (just save)')
    parser.add_argument('--output-dir', type=str, default='benchmark/generated', help='Output directory')
    args = parser.parse_args()
    
    generate_chart(output_dir=args.output_dir, interactive=not args.no_interactive)
