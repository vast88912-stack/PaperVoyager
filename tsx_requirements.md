# TSX generation requirements (edit me)

Add your "hard requirements" for TSX generation here.
This file is automatically appended to `src/run_tsx_batch.py` system instruction via `--requirements-file`.

Suggested examples (keep only what you need):
- Language: UI text must be Chinese (简体中文).
- Must include: a top-level navigation list linking to 4-6 modules, each module has its own interactive panel.
- Must include: a “Sources / Paper mapping” panel that maps each visualization to the paper section/figure/equation.
- Must include: error boundaries + a small in-app log panel.
- Performance: avoid rendering > 2k SVG nodes; use Canvas when needed.
- Accessibility: keyboard navigation, aria-labels on interactive controls.
- No network calls, no API keys, no telemetry.
- Code style: no `any`, no `// @ts-ignore`, TypeScript `strict` compatible.

