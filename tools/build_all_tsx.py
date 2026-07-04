import argparse
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TSX_ROOT = ROOT / "outputs" / "tsx"


def run(cmd: list[str], *, cwd: Path) -> tuple[int, str]:
    p = subprocess.run(
        cmd,
        cwd=str(cwd),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    return p.returncode, p.stdout


def is_project_dir(p: Path) -> bool:
    return (
        p.is_dir()
        and (p / "package.json").exists()
        and (p / "src" / "main.tsx").exists()
        and (p / "index.html").exists()
    )


def main():
    parser = argparse.ArgumentParser(description="Batch build all outputs/tsx/* Vite projects.")
    parser.add_argument("--path", default="", help="TSX root path (default: outputs/tsx).")
    parser.add_argument("--npm", default="npm", help="NPM executable (default: npm).")
    parser.add_argument("--limit", type=int, default=0, help="Build at most N projects (0 = all).")
    parser.add_argument("--install", action="store_true", help="Run npm install before build (recommended).")
    args = parser.parse_args()

    tsx_root = Path(args.path).resolve() if args.path else (ROOT / "outputs" / "tsx")
    if not tsx_root.exists():
        raise SystemExit(f"Missing folder: {tsx_root}")

    projects = [p for p in sorted(tsx_root.iterdir()) if is_project_dir(p)]
    if args.limit and args.limit > 0:
        projects = projects[: args.limit]

    if not projects:
        raise SystemExit(f"No TSX Vite projects found under: {tsx_root}")

    total = len(projects)
    ok = 0
    for i, proj in enumerate(projects, start=1):
        print(f"[{i}/{total}] {proj.name}")
        if args.install:
            code, out = run([args.npm, "install"], cwd=proj)
            (proj / ".build.install.log").write_text(out, encoding="utf-8")
            if code != 0:
                print(f"  [ERR] npm install failed (see {proj}/.build.install.log)")
                continue

        code, out = run([args.npm, "run", "build"], cwd=proj)
        (proj / ".build.log").write_text(out, encoding="utf-8")
        if code != 0:
            print(f"  [ERR] build failed (see {proj}/.build.log)")
            continue

        if (proj / "dist" / "index.html").exists():
            ok += 1
            print("  [OK] dist/index.html")
        else:
            print("  [WARN] build finished but dist/index.html not found")

    print(f"Done: {ok}/{total} built.")


if __name__ == "__main__":
    main()

