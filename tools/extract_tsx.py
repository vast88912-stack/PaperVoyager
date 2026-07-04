import argparse
import json
import re
from pathlib import Path


def strip_code_fences(s: str) -> str:
    s = s.strip()
    fence = re.match(r"^```(?:json|tsx|typescript|jsx|ts)?\s*(.*?)\s*```$", s, flags=re.DOTALL | re.IGNORECASE)
    if fence:
        return fence.group(1).strip()
    return s


def ensure_valid_json(text: str) -> dict:
    cleaned = strip_code_fences(text)
    if not cleaned.startswith("{"):
        first = cleaned.find("{")
        last = cleaned.rfind("}")
        if first != -1 and last != -1 and last > first:
            cleaned = cleaned[first:last + 1]
    return json.loads(cleaned)


def extract_tsx_from_text(text: str) -> str | None:
    # JSON formats we commonly use
    try:
        data = ensure_valid_json(text)
        if isinstance(data, dict):
            if isinstance(data.get("tsx"), str):
                return data["tsx"]
            app = data.get("tsx_app")
            if isinstance(app, dict):
                files = app.get("files")
                if isinstance(files, list) and files:
                    for f in files:
                        if isinstance(f, dict) and f.get("path") == "src/App.tsx" and isinstance(f.get("content"), str):
                            return f["content"]
    except Exception:
        pass

    # Fenced block
    m = re.search(r"```(?:tsx|typescript|jsx|ts)\s*(.*?)```", text, flags=re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(1).strip()

    # Raw TSX
    if "export default" in text and "<" in text:
        return text.strip()

    return None


def main():
    parser = argparse.ArgumentParser(description="Extract TSX code from a model response (JSON or fenced block).")
    parser.add_argument("input", help="Path to a raw model output file (txt/json).")
    parser.add_argument("-o", "--output", help="Output .tsx path (default: stdout).")
    parser.add_argument(
        "--latest",
        action="store_true",
        help="Ignore INPUT and extract from the newest file under outputs/tsx/_generations/*.raw.txt",
    )
    args = parser.parse_args()

    if args.latest:
        repo_root = Path(__file__).resolve().parents[1]
        gen_dir = repo_root / "outputs" / "tsx" / "_generations"
        candidates = sorted(gen_dir.glob("*.raw.txt"), key=lambda p: p.stat().st_mtime, reverse=True)
        if not candidates:
            raise SystemExit(f"No generation files found at: {gen_dir}")
        in_path = candidates[0]
    else:
        in_path = Path(args.input)

    if not in_path.exists():
        hint = ""
        if args.input.strip() in {"path/to/response.txt", "path/to/response.json"}:
            hint = (
                "\nHint: you used the placeholder path. Replace it with a real file, e.g.\n"
                "  outputs/tsx/_generations/<slug>.raw.txt\n"
                "Or run with:\n"
                "  python tools/extract_tsx.py dummy --latest -o src/App.tsx\n"
            )
        raise SystemExit(f"Input file not found: {in_path}{hint}")

    raw = in_path.read_text(encoding="utf-8", errors="replace")
    tsx = extract_tsx_from_text(raw)
    if not tsx:
        raise SystemExit(f"Failed to extract TSX from input: {in_path}")

    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(tsx, encoding="utf-8", newline="\n")
        print(f"[OK] Wrote TSX: {out} (from {in_path})")
    else:
        print(tsx)


if __name__ == "__main__":
    main()
