import json
import os
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUTS_DIR = ROOT / "outputs"
SITE_DIR = ROOT / "site"          # 所有生成的网页工程放这里
PROJECTS_DIR = SITE_DIR / "projects"
INDEX_PATH = SITE_DIR / "index.html"


def safe_slug(s: str) -> str:
    s = (s or "").strip().lower()
    out = []
    for ch in s:
        if ch.isalnum() or ch in "-_":
            out.append(ch)
        elif ch.isspace():
            out.append("-")
    slug = "".join(out).strip("-")
    return slug or "paper"


def write_file(base: Path, rel_path: str, content: str):
    p = base / rel_path
    p.parent.mkdir(parents=True, exist_ok=True)
    # Always use UTF-8 for text artifacts
    p.write_text(content, encoding="utf-8", newline="\n")


def build_library_index(entries):
    # A simple library index that links to each generated project
    links = "\n".join(
        f'<li><a href="./projects/{e["folder"]}/src/index.html" target="_blank" rel="noopener">{e["title"]}</a>'
        f' <small>({e["year"]}, {e["venue"]})</small></li>'
        for e in entries
    )

    html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Paper Visualization Library</title>
  <style>
    body {{ font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; }}
    h1 {{ margin: 0 0 12px; }}
    .meta {{ color: #555; margin-bottom: 18px; }}
    ul {{ line-height: 1.7; }}
    a {{ text-decoration: none; }}
    a:hover {{ text-decoration: underline; }}
    small {{ color: #666; }}
    code {{ background: #f3f3f3; padding: 2px 6px; border-radius: 6px; }}
  </style>
</head>
<body>
  <h1>Paper Visualization Library</h1>
  <div class="meta">
    Open <code>./projects/&lt;paper&gt;/src/index.html</code> for a standalone visualization.
  </div>
  <ul>
    {links}
  </ul>
</body>
</html>
"""
    return html


def main():
    if not OUTPUTS_DIR.exists():
        raise FileNotFoundError(f"Missing outputs dir: {OUTPUTS_DIR}")

    SITE_DIR.mkdir(parents=True, exist_ok=True)
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)

    entries = []

    json_files = sorted(OUTPUTS_DIR.glob("*.json"))
    if not json_files:
        raise FileNotFoundError(f"No .json found in {OUTPUTS_DIR}")

    for jf in json_files:
        data = json.loads(jf.read_text(encoding="utf-8"))

        meta = data.get("metadata", {}) or {}
        paper_id = safe_slug(meta.get("paper_id") or jf.stem)
        title = meta.get("paper_title") or paper_id
        year = meta.get("year") or "Unknown"
        venue = meta.get("venue") or "Unknown"

        proj = data.get("project_structure", {}) or {}
        root_dir_name = proj.get("root_dir") or f"paper_{paper_id}_visualization"

        # Put each generated project in: site/projects/<paper_id>/
        out_root = PROJECTS_DIR / paper_id

        # Clean old output to avoid stale files
        if out_root.exists():
            shutil.rmtree(out_root)
        out_root.mkdir(parents=True, exist_ok=True)

        files = proj.get("files", [])
        if not isinstance(files, list) or not files:
            print(f"[WARN] No files in {jf.name}, skipping")
            continue

        for f in files:
            rel = f.get("path")
            content = f.get("content", "")
            if not rel or not isinstance(rel, str):
                continue
            write_file(out_root, rel, content)

        entries.append(
            {"folder": paper_id, "title": title, "year": year, "venue": venue, "root_dir": root_dir_name}
        )

        print(f"[OK] Unpacked: {jf.name} -> {out_root}")

    INDEX_PATH.write_text(build_library_index(entries), encoding="utf-8", newline="\n")
    print(f"\nLibrary index written: {INDEX_PATH}")
    print(f"Open in browser: {INDEX_PATH}")


if __name__ == "__main__":
    main()
