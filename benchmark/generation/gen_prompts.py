import os
from pathlib import Path

# --- Knowledge Base: App Definitions ---
# Each entry represents the core "knowledge" needed to generate a prompt.

APP_SPECS = [
    {
        "id": "Algorithm_Dynamic_Programming",
        "project": "Dynamic Programming Lab (ChatGPT Edition)",
        "role": "Staff Frontend + Algo educator.",
        "objective": "Build a single-file React+TS app that teaches DP patterns (memoization, tabulation, path counting) with side-by-side visual traces.",
        "design": "University algorithms class; crisp light theme with accent color for states.",
        "sections": {
            "Module Plan": [
                "1) Warmup Hero: what DP optimizes; short text + CTA to start.",
                "2) Fibonacci Panel: slider for n, buttons for naive/ memo / tabulation; visualize call tree collapsing into table.",
                "3) Grid Paths: 2D grid with obstacles; animate subproblem reuse; allow user to toggle memoization.",
                "4) Knapsack 0/1: items list editor; show table fill order; highlight chosen cells.",
                "5) Pattern Library: cards summarizing common DP shapes (line, grid, subsequence, interval) with mini diagrams."
            ],
            "Interactions": [
                "- Step/run controls per module; speed slider.",
                "- Tooltips explaining transitions."
            ],
            "Technical Notes": [
                "- Use canvas or SVG for visuals; prefer reusable hooks for stepping logic.",
                "- Keep state small; no backend."
            ],
            "Output Requirements": [
                "- Return ONLY src/App.tsx (no markdown fences).",
                "- Must export default function App().",
                "- If extra deps needed, list at end as: Runtime deps: <package>@version."
            ]
        }
    },
    {
        "id": "Algorithm_Sorting_Race",
        "project": "Sorting Race 2.0 (ChatGPT Edition)",
        "role": "Frontend engineer + pedagogy.",
        "objective": "Compare sorting algorithms (bubble, insertion, merge, quick, heap, radix) on arrays and nearly-sorted data.",
        "design": "Split view with race track lanes; light theme with high contrast colors.",
        "sections": {
            "Features": [
                "- Dataset presets: random, nearly sorted, reversed, few uniques.",
                "- Controls: array size slider, speed slider, shuffle button.",
                "- Visuals: bar chart per lane with live swaps/highlights; show operation counts.",
                "- Stability toggle and explanation card.",
                "- Post-run summary table with time steps and swap counts."
            ],
            "Technical": "keep algorithms in pure functions; allow async stepping via requestAnimationFrame.",
            "Output": "only src/App.tsx, default export; optional deps declared at end."
        }
    },
    {
        "id": "Physics_Gravity_Orbits",
        "project": "Orbit Playground (ChatGPT Edition)",
        "role": "Physics-friendly UI engineer.",
        "objective": "Simulate N-body gravity with presets (two-body, three-body, many-body swirls).",
        "design": "starfield dark background; trails with color per body.",
        "sections": {
            "Features": "add/remove bodies; mass/velocity sliders; show energy/momentum totals; integrator choice (Euler, Verlet); collision merge toggle; export initial conditions as JSON.",
            "Output": "only src/App.tsx; default export; runtime deps listed if used."
        }
    },
    {
        "id": "ML_Neural_Network_Viz",
        "project": "Neural Net Forward/Backward Viewer (ChatGPT Edition)",
        "role": "Interactive ML educator.",
        "objective": "Single hidden-layer MLP toy with live forward + backprop visualization.",
        "design": "neon lines on dark; node activations glow.",
        "sections": {
            "Panels": "architecture editor (neurons, activation), dataset picker (spiral, xor, blobs), forward pass animation, gradient flow display, loss curve chart, ablation toggle to freeze a neuron.",
            "Technical": "small tensors in plain JS; no heavy ML libs; use canvas/SVG.",
            "Output": "only src/App.tsx; default export; runtime deps noted if needed."
        }
    },
    {
        "id": "Genetic_Algorithm_Sandbox",
        "project": "Genetic Algorithm Sandbox (ChatGPT Edition)",
        "role": "AI/Bio-inspired computing educator.",
        "objective": "Visualize evolutionary process (selection, crossover, mutation) solving optimization problems (knapsack, travelling salesman, function maximization).",
        "design": "organic/biological theme (greens, blues); population grid or scatter plot.",
        "sections": {
            "Features": [
                "- Problem Selector: Knapsack, TSP, Function Max.",
                "- Parameters: Population Size, Mutation Rate, Elitism Count, Generations.",
                "- Visualization: Live graph of best fitness vs generation; real-time view of population diversity.",
                "- Interaction: Pause/Resume, Step-by-step evolution.",
                "- Code View: Snippets showing crossover/mutation logic."
            ],
            "Technical": "Use pure JS for GA logic; avoid heavy libs; Canvas for visualization.",
            "Output": "only src/App.tsx; default export; runtime deps listed if used."
        }
    }
]

def generate_prompts(output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    
    for spec in APP_SPECS:
        lines = []
        
        # Standard headers
        lines.append(f"Project: {spec['project']}")
        lines.append(f"Role: {spec['role']}")
        lines.append(f"Objective: {spec['objective']}")
        
        if "design" in spec:
            lines.append(f"Design: {spec['design']}")
        elif "tone_design" in spec:
             lines.append(f"Tone & Audience: {spec['tone_design']}")
            
        # Sections
        # Sort sections to maintain deterministic order if needed, but dict preservation in Py3.7+ is usually fine.
        # We rely on the order in the dictionary.
        for section_title, content in spec.get("sections", {}).items():
            if isinstance(content, list):
                lines.append(f"{section_title}:")
                for item in content:
                    lines.append(item)
            else:
                # Inline content
                lines.append(f"{section_title}: {content}")
        
        # Trailing newlines
        lines.append("\n")
        
        # Write to file
        filename = f"{spec['id']}.txt"
        filepath = output_dir / filename
        filepath.write_text("\n".join(lines), encoding="utf-8")
        print(f"Generated {filepath}")

if __name__ == "__main__":
    # Assuming this script is run from repo root
    prompts_dir = Path("prompts")
    generate_prompts(prompts_dir)
