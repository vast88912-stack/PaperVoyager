# Appendix: Qualitative Comparison — PaperVoyager vs. Gemini Single-Shot

This appendix provides side-by-side screenshot evidence comparing **PaperVoyager** (block pipeline output) against **Gemini-3.1-Pro single-shot** generation for two representative benchmark topics: *Algorithm — Dynamic Programming* and *Algorithm — Graph Pathfinding*. All screenshots are taken at 1280×800 px with a 4-second render wait via Playwright.

---

## A.1 Dynamic Programming Lab

### A.1.1 Gemini Single-Shot

Gemini's single-shot generation produces a single-page app that, within its token budget, focuses exclusively on the 0/1 Knapsack sub-problem. No landing hero, no sidebar navigation, and no other DP sub-topics (Fibonacci, Grid Paths, Pattern Library) are present.

**Gemini — Main Page (only page)**

![Gemini DP main](appendix_figures/gem_dp_main.png)

Observations:
- Covers only **one** of the five specified modules (0/1 Knapsack).
- DP table is static at load time and limited to capacity 0–4 (fixed columns).
- No step-by-step animation or explanation text; the only interaction is adding items.
- No navigation; a user cannot access Fibonacci memoization or Grid Paths at all.
- Large empty space in the lower half of the viewport.

---

### A.1.2 PaperVoyager (Block Pipeline)

PaperVoyager generates five dedicated blocks, each evaluated by Qwen3-VL and merged into a unified sidebar-navigated app.

**PaperVoyager — Landing / Hero Module**

![PaperVoyager DP landing](appendix_figures/pv_dp_landing.png)

- Structured entry point with a memorable headline and CTA navigating into Module 1.
- Below the fold: live preview of "The Power of Memoization" widget already rendering.

---

**PaperVoyager — Fibonacci Visualizer Module**

![PaperVoyager DP Fibonacci](appendix_figures/pv_dp_fibonacci.png)

- `n` slider (1–20) controls the problem size in real time.
- Three-way algorithm toggle: **Naive** / **Memoization** / **Tabulation**.
- Left panel: animated **Call Tree** showing recursive decomposition.
- Right panel: **Memo Table** filling cell-by-cell as execution proceeds.
- Playback controls: reset, step-back, step-forward, play.
- Tag badge: *DP Pattern: Line* — connects the visual to its DP category.

*Gemini has no equivalent of this module.*

---

**PaperVoyager — Grid Paths Module**

![PaperVoyager DP Grid Paths](appendix_figures/pv_dp_gridpaths.png)

- Interactive 6×6 grid; clicking any cell toggles an obstacle.
- **S** (start) top-left, **E** (end) bottom-right are fixed.
- **Algorithm Settings** panel: Memoization toggle with description.
- **Animation Speed** slider; Play / Step-forward / Reset controls.
- Color legend: Active / Memoized / Cache Hit / Obstacle.
- Status bar: *"Current Action — Click Play or Step to start the algorithm."*

*Gemini has no equivalent of this module.*

---

**PaperVoyager — 0/1 Knapsack Module**

![PaperVoyager DP Knapsack](appendix_figures/pv_dp_knapsack.png)

- **Capacity slider** (currently W=5) dynamically resizes the DP table columns.
- Item list with editable Weight and Value fields; items can be added or deleted.
- DP Table builds column-by-column; current step highlighted in the table header.
- Step indicator: *"Step 1 of 21: INIT — Initialize the DP table."* — full narrative.
- Playback controls identical to Fibonacci module (consistent UX across blocks).

Compare with Gemini: PaperVoyager's Knapsack module has a capacity slider, editable items, step-by-step narrative, and 21 discrete steps; Gemini's version has a fixed 4-column table with no animation.

---

### A.1.3 Module Coverage Summary — Dynamic Programming

| Module | Gemini Single-Shot | PaperVoyager |
|---|---|---|
| Landing / Hero | — | ✓ |
| Fibonacci (Naive / Memo / Tab) | — | ✓ animated call tree + memo table |
| Grid Paths (obstacle toggle, animation) | — | ✓ |
| 0/1 Knapsack | ✓ static table only | ✓ animated, 21-step narrative |
| Pattern Library | — | ✓ |
| **Total interactive modules** | **1 / 5** | **5 / 5** |

---

## A.2 Graph Pathfinding Playground

### A.2.1 Gemini Single-Shot

**Gemini — Main Page**

![Gemini GP main](appendix_figures/gem_gp_main.png)

- Implements **Dijkstra only** — no BFS, A*, or Bidirectional.
- No sidebar; entire UI is a single grid with two buttons at the top.
- Minimal color legend (4 colored squares, unlabeled).
- No tool panel for wall drawing modes (the grid claims "click and drag to draw walls" but offers no eraser, weight, or move-start tools).

**Gemini — After clicking "Visualize Dijkstra's Algorithm"**

![Gemini GP after click](appendix_figures/gem_gp_dijkstra.png)

- Grid turns mostly gray-blue (explored cells) with a light-blue path.
- No metrics reported (no visited node count, no path cost, no time).
- No heuristic controls or complexity analysis.

---

### A.2.2 PaperVoyager (Block Pipeline)

**PaperVoyager — Landing / Initialization Module**

![PaperVoyager GP landing](appendix_figures/pv_gp_landing.png)

- Terminal-aesthetic neon-on-dark theme with animated grid background.
- Status indicator: `SYS.STATUS: ONLINE`, random `SEED` displayed.
- Mission statement explicitly names BFS, Dijkstra, A*, and Bidirectional.
- Five modules accessible via sidebar: Initialization / Grid Editor / Algorithm Run / Heuristics / Complexity.

---

**PaperVoyager — Grid Editor Module**

![PaperVoyager GP Grid Editor](appendix_figures/pv_gp_grideditor.png)

- **Active Tool** panel with five distinct tools:
  - Draw Wall, Add Weight, Eraser, Move Start, Move Goal.
- **Actions** panel: Random Walls (generates random maze), Clear Grid.
- Green (start) and pink (goal) markers visible on the grid.
- Tool selection is persistent; the user can switch between drawing modes.

*Gemini offers none of these tool modes.*

---

**PaperVoyager — Algorithm Run Module**

![PaperVoyager GP Algorithm Run](appendix_figures/pv_gp_algrun.png)

- Algorithm dropdown (currently showing **A* Search**) — includes BFS, Dijkstra, A*, Bidirectional.
- Run and Reset buttons with icons.
- Grid state carries over from the Grid Editor (same start/goal positions).
- The algorithm selector enables direct algorithm comparison on the same graph.

*Gemini hardcodes Dijkstra with no alternative.*

---

**PaperVoyager — Complexity Metrics Module**

![PaperVoyager GP Complexity](appendix_figures/pv_gp_complexity.png)

- Live dashboard with four metric cards:
  - **Visited Nodes**, **Frontier Size**, **Path Cost**, **Time (ms)**.
- Status badge: `IDLE` (becomes active during simulation).
- SEED display for reproducibility.
- **SIMULATE** button runs the algorithm and populates all metrics in real time.

*Gemini has no complexity analysis or metrics module.*

---

### A.2.3 Module Coverage Summary — Graph Pathfinding

| Module | Gemini Single-Shot | PaperVoyager |
|---|---|---|
| Landing / Hero | — | ✓ |
| Grid Editor (multi-tool) | — | ✓ 5 tools + random maze |
| Algorithm Run (multi-algo) | ✓ Dijkstra only | ✓ BFS / Dijkstra / A* / Bidirectional |
| Heuristics Inspector | — | ✓ |
| Complexity Metrics Dashboard | — | ✓ 4 live metrics |
| **Total interactive modules** | **1 / 5** | **5 / 5** |

---

## A.3 Root Cause Analysis

The quality gap is structural, not incidental. A single LLM call faces a hard token budget for its output. When generating a complete multi-module interactive app in one shot, the model must choose between:

1. **Breadth**: implement all five modules shallowly, or
2. **Depth**: implement one module well, leaving the rest absent.

Gemini single-shot consistently chooses (2) — it produces one functional module while omitting the others entirely.

PaperVoyager's block pipeline sidesteps this constraint. Each block is generated independently with its own full token budget, evaluated visually by Qwen3-VL to select the best of five variants, and merged into a unified app by a second LLM call. The result is five modules each at full depth, assembled into a coherent single-page application.

| Factor | Gemini Single-Shot | PaperVoyager |
|---|---|---|
| Output token budget per module | ~1,600 (shared across all) | ~8,000 (dedicated per block) |
| Number of generation attempts | 1 | 5 per block |
| Visual quality filtering | None | Qwen3-VL Yes/No probe |
| Module coverage (avg. across 19 topics) | ~1–2 / 5 | 5 / 5 |
| Multi-algorithm support | Rarely | Consistent |
| Step-by-step narrative | Rarely | Standard |
| Live complexity metrics | Never | Standard in relevant topics |
