import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TSX_ROOT = ROOT / "outputs" / "tsx"
TEMPLATE_PKG = ROOT / "templates" / "vite-react-ts-tailwind" / "package.json"


def patch_package_json(pkg_path: Path) -> bool:
    pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
    scripts = pkg.get("scripts") or {}

    # Preserve old build if present
    old_build = scripts.get("build")

    # Make "build" a bundler-only build so dist can be produced even if TS has lint-like errors.
    scripts["build"] = "vite build"

    # Keep a strict build / typecheck path.
    if "build:strict" not in scripts:
        scripts["build:strict"] = old_build or "tsc -b && vite build"
    if "typecheck" not in scripts:
        scripts["typecheck"] = "tsc -b"

    scripts.setdefault("dev", "vite")
    scripts.setdefault("preview", "vite preview")
    scripts.setdefault("lint", "eslint .")

    pkg["scripts"] = scripts
    pkg_path.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return True


def main():
    parser = argparse.ArgumentParser(description="Patch outputs/tsx/* package.json build scripts for easier static builds.")
    parser.add_argument("--root", default=str(TSX_ROOT), help="TSX projects root (default: outputs/tsx).")
    parser.add_argument("--include-template", action="store_true", help="Also patch the Vite template package.json.")
    args = parser.parse_args()

    root = Path(args.root)
    if not root.exists():
        raise SystemExit(f"Missing: {root}")

    patched = 0
    for proj in sorted(root.iterdir()):
        if not proj.is_dir():
            continue
        if proj.name.startswith("_"):
            continue
        pkg_path = proj / "package.json"
        if not pkg_path.exists():
            continue
        if patch_package_json(pkg_path):
            patched += 1
            print(f"[OK] Patched {pkg_path}")

    if args.include_template and TEMPLATE_PKG.exists():
        patch_package_json(TEMPLATE_PKG)
        print(f"[OK] Patched template {TEMPLATE_PKG}")

    print(f"Done. Patched {patched} project(s).")


if __name__ == "__main__":
    main()

