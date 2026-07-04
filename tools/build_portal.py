from __future__ import annotations

from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]

# Lower number = higher in the portal order.
MODEL_PRIORITY = {
    "chatgpt-5.1": 0,
    "gemini-3-pro": 1,
}


def friendly_label(model_id: str) -> str:
    custom = {
        "chatgpt-5.1": "ChatGPT-5.1 (current)",
        "gemini-3-pro": "Gemini 3.0 Pro (archived)",
    }
    if model_id in custom:
        return custom[model_id]
    return model_id.replace("-", " ").title()


def discover_models() -> list[dict]:
    models: list[dict] = []

    def add(mid: str, out_dir: Path):
        models.append(
            {
                "id": mid,
                "label": friendly_label(mid),
                "out_dir": out_dir,
                "prompt_dir": ROOT / "prompts" / "models" / mid,
            }
        )

    # Active model (ChatGPT) lives directly under outputs/tsx.
    add("chatgpt-5.1", ROOT / "outputs" / "tsx")

    # Archived / alternative models live under outputs/models/<id>/tsx.
    models_root = ROOT / "outputs" / "models"
    if models_root.exists():
        for sub in sorted(models_root.iterdir()):
            out_dir = sub / "tsx"
            if out_dir.exists():
                add(sub.name, out_dir)

    models.sort(key=lambda m: (MODEL_PRIORITY.get(m["id"], 99), m["label"].lower()))
    return models


def is_project_dir(p: Path) -> bool:
    return (
        p.is_dir()
        and (p / "package.json").exists()
        and (p / "index.html").exists()
        and (p / "src" / "main.tsx").exists()
    )


def collect_projects(model: dict) -> list[dict]:
    projects: list[dict] = []
    out_dir: Path = model["out_dir"]
    if not out_dir.exists():
        return projects

    prompt_dir: Path | None = model.get("prompt_dir")

    for proj in sorted(out_dir.iterdir()):
        if not is_project_dir(proj):
            continue
        slug = proj.name
        dev_href = f"{proj.relative_to(ROOT).as_posix()}/index.html"
        dist_html = proj / "dist" / "index.html"
        dist_href = dist_html.relative_to(ROOT).as_posix() if dist_html.exists() else None

        prompt_href = None
        if prompt_dir and (prompt_dir / f"{slug}.txt").exists():
            prompt_href = (prompt_dir / f"{slug}.txt").relative_to(ROOT).as_posix()

        status = "dist" if dist_href else "vite (needs dev/build)"
        projects.append(
            {
                "slug": slug,
                "model_id": model["id"],
                "model_label": model["label"],
                "dev_href": dev_href,
                "dist_href": dist_href,
                "prompt_href": prompt_href,
                "status": status,
            }
        )
    return projects


def discover_static_sites() -> list[dict]:
    # Optional legacy static outputs under site/.
    site_root = ROOT / "site"
    index_html = site_root / "index.html"
    if index_html.exists():
        return [
            {
                "title": "site/index.html",
                "href": index_html.relative_to(ROOT).as_posix(),
                "note": "Static library index",
            }
        ]
    return []


def render_model_section(model: dict, items: list[dict]) -> str:
    prompt_dir = model.get("prompt_dir")
    prompt_note = (
        f"Prompts: {prompt_dir.relative_to(ROOT).as_posix()}" if prompt_dir and prompt_dir.exists() else "Prompts: n/a"
    )
    lines = [
        "<section>",
        "  <div class=\"section-head\">",
        f"    <h2>{model['label']}</h2>",
        f"    <span class=\"chip\">{len(items)} apps</span>",
        f"    <span class=\"chip muted\">{model['id']}</span>",
        "  </div>",
        f"  <div class=\"meta\">{prompt_note}</div>",
        "  <ul class=\"portal-list\">",
    ]

    for item in items:
        dist_link = f"<a href=\"{item['dist_href']}\" target=\"_blank\" rel=\"noopener\">dist</a>" if item["dist_href"] else ""
        prompt_link = (
            f"<a href=\"{item['prompt_href']}\" target=\"_blank\" rel=\"noopener\">prompt</a>"
            if item["prompt_href"]
            else ""
        )
        links = " | ".join(
            x for x in [f"<a href=\"{item['dev_href']}\" target=\"_blank\" rel=\"noopener\">vite dev</a>", dist_link, prompt_link] if x
        )
        lines.extend(
            [
                f"    <li data-model=\"{item['model_id']}\" data-slug=\"{item['slug']}\">",
                f"      <div class=\"title\">{item['slug']}</div>",
                f"      <div class=\"meta\">{item['status']} 路 {links}</div>",
                "    </li>",
            ]
        )

    lines.append("  </ul>")
    lines.append("</section>")
    return "\n".join(lines)


def render_portal(*, model_sections: Iterable[str], static_sites: list[dict]) -> str:
    model_html = "\n".join(model_sections)

    static_html = ""
    if static_sites:
        items = "\n".join(
            f"<li><a href=\"{s['href']}\" target=\"_blank\" rel=\"noopener\">{s['title']}</a> <span class=\"meta\">{s['note']}</span></li>"
            for s in static_sites
        )
        static_html = f"""
    <section>
      <div class=\"section-head\">
        <h2>Static Visualizations</h2>
        <span class=\"chip\">{len(static_sites)} items</span>
      </div>
      <ul>
        {items}
      </ul>
    </section>
"""

    return f"""<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>PaperVoyager Portal</title>
  <style>
    :root {{
      --bg: #0f172a;
      --panel: #111827;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --accent: #38bdf8;
      --border: #1e293b;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: 'Inter', 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); padding: 32px; line-height: 1.6; }}
    header {{ margin-bottom: 24px; }}
    h1 {{ font-size: 28px; margin-bottom: 8px; }}
    .sub {{ color: var(--muted); }}
    .row {{ display: flex; gap: 12px; align-items: center; margin: 16px 0; flex-wrap: wrap; }}
    input#q {{ padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: #0b1222; color: var(--text); min-width: 260px; }}
    section {{ background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 16px; margin-bottom: 16px; }}
    .section-head {{ display: flex; gap: 10px; align-items: center; margin-bottom: 4px; }}
    h2 {{ font-size: 18px; }}
    ul {{ list-style: none; margin-top: 8px; }}
    li {{ padding: 10px 8px; border-bottom: 1px solid var(--border); }}
    li:last-child {{ border-bottom: none; }}
    .title {{ font-weight: 600; }}
    .meta {{ color: var(--muted); font-size: 13px; margin-top: 2px; }}
    .chip {{ display: inline-flex; align-items: center; padding: 4px 8px; border-radius: 999px; background: #0b1222; color: var(--text); border: 1px solid var(--border); font-size: 12px; }}
    .chip.muted {{ color: var(--muted); }}
    a {{ color: var(--accent); text-decoration: none; }}
    a:hover {{ text-decoration: underline; }}
    code {{ background: #0b1222; padding: 2px 6px; border-radius: 6px; }}
    .hint {{ color: var(--muted); font-size: 13px; margin-top: 8px; }}
  </style>
</head>
<body>
  <header>
    <h1>PaperVoyager Portal</h1>
    <div class=\"sub\">Auto-indexed builds by model. Serve with <code>python -m http.server</code> from repo root.</div>
  </header>
  <main>
    <div class=\"row\">
      <input id=\"q\" placeholder=\"Filter by title or model...\" />
      <span class=\"chip\" id=\"count\"></span>
      <span class=\"chip\">PaperVoyager WebPaper Gallery</span>
    </div>
    <section>
      <h2>Task Notes</h2>
      <ul>
        <li>This portal indexes generated WebPaper builds for local browsing.</li>
        <li>Place new model builds under <code>outputs/models/&lt;model&gt;/tsx/</code> and add prompts in <code>prompts/models/&lt;model&gt;/</code>.</li>
        <li>To batch build generated apps: <code>python tools/build_all_tsx.py --install</code>.</li>
        <li>Serve from the repository root so relative links resolve correctly.</li>
      </ul>
    </section>
    {static_html}
    {model_html}
  </main>
  <script>
    const q = document.getElementById('q');
    const count = document.getElementById('count');
    const lists = Array.from(document.querySelectorAll('.portal-list'));

    function update() {{
      const needle = (q.value || '').toLowerCase().trim();
      let visible = 0;
      lists.forEach((ul) => {{
        ul.querySelectorAll('li').forEach((li) => {{
          const text = (li.textContent || '').toLowerCase();
          const ok = !needle || text.includes(needle);
          li.style.display = ok ? '' : 'none';
          if (ok) visible++;
        }});
      }});
      count.textContent = visible + ' items';
    }}
    q.addEventListener('input', update);
    update();
  </script>
</body>
</html>
"""


def main():
    models = discover_models()
    model_sections = []
    for model in models:
        projects = collect_projects(model)
        model_sections.append(render_model_section(model, projects))

    html = render_portal(model_sections=model_sections, static_sites=discover_static_sites())
    out_path = ROOT / "index.html"
    out_path.write_text(html, encoding="utf-8", newline="\n")
    print(f"[OK] wrote portal to {out_path}")


if __name__ == "__main__":
    main()

