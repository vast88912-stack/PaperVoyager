"""
renderer.py — Build a TSX variant into a Vite app and take a Playwright screenshot.

For each variant code.tsx:
1. Scaffold a minimal Vite project (reuse generate_apps.py boilerplate)
2. Write code.tsx as src/App.tsx
3. npm install && npm run build
4. Serve with python -m http.server on a free port
5. Playwright screenshot
6. Kill server
"""

from __future__ import annotations
import json
import os
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional

_REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_REPO_ROOT))

from generate_apps import BOILERPLATE, setup_project_structure


def _find_free_port(start: int = 9000, end: int = 9999) -> int:
    for port in range(start, end):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError("No free port found in range")


def _scaffold_variant_app(app_dir: Path, code_tsx: str) -> None:
    """Set up a minimal Vite project with the given code as App.tsx."""
    setup_project_structure(str(app_dir))
    app_tsx_path = app_dir / "src" / "App.tsx"
    app_tsx_path.write_text(code_tsx, encoding="utf-8")


def build_variant(app_dir: Path, timeout: int = 120) -> tuple[bool, str]:
    """
    Run npm install + npm run build in app_dir.
    Returns (success, log).
    """
    install_log = ""
    build_log = ""

    # npm install
    try:
        result = subprocess.run(
            ["npm", "install", "--prefer-offline", "--no-audit", "--no-fund"],
            cwd=str(app_dir),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        install_log = result.stdout + result.stderr
        if result.returncode != 0:
            return False, f"npm install failed:\n{install_log}"
    except subprocess.TimeoutExpired:
        return False, "npm install timed out"
    except Exception as e:
        return False, f"npm install error: {e}"

    # npm run build (use vite build directly, skip tsc)
    try:
        result = subprocess.run(
            ["npm", "run", "build"],
            cwd=str(app_dir),
            capture_output=True,
            text=True,
            timeout=timeout,
            env={**os.environ, "SKIP_PREFLIGHT_CHECK": "true"},
        )
        build_log = result.stdout + result.stderr
        if result.returncode != 0:
            return False, f"npm run build failed:\n{build_log}"
    except subprocess.TimeoutExpired:
        return False, "npm run build timed out"
    except Exception as e:
        return False, f"npm run build error: {e}"

    return True, install_log + "\n" + build_log


def screenshot_variant(
    app_dir: Path,
    screenshot_path: Path,
    headless: bool = True,
    wait_ms: int = 3000,
    timeout: int = 30,
) -> tuple[bool, str]:
    """
    Serve the built dist/ directory and take a screenshot.
    Returns (success, message).
    """
    dist_dir = app_dir / "dist"
    if not dist_dir.exists():
        return False, "dist/ not found — build may have failed"

    port = _find_free_port()
    server_proc = None
    try:
        # Start HTTP server
        server_proc = subprocess.Popen(
            [sys.executable, "-m", "http.server", str(port), "--directory", str(dist_dir)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        time.sleep(1.5)  # Let server start

        url = f"http://127.0.0.1:{port}/index.html"

        # Run Playwright in a subprocess to avoid loading heavy deps in main process
        pw_script = f"""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless={headless})
        page = await browser.new_page(viewport={{"width": 1280, "height": 800}})
        try:
            await page.goto("{url}", timeout={timeout * 1000})
            await page.wait_for_timeout({wait_ms})
            await page.screenshot(path="{screenshot_path}", full_page=False)
            print("OK")
        except Exception as e:
            print(f"ERROR: {{e}}")
        finally:
            await browser.close()

asyncio.run(main())
"""
        result = subprocess.run(
            [sys.executable, "-c", pw_script],
            capture_output=True,
            text=True,
            timeout=timeout + 15,
        )
        output = result.stdout.strip()
        if "OK" in output and screenshot_path.exists():
            return True, "Screenshot taken"
        else:
            return False, f"Playwright output: {output}\n{result.stderr}"

    except subprocess.TimeoutExpired:
        return False, "Screenshot timed out"
    except Exception as e:
        return False, f"Screenshot error: {e}"
    finally:
        if server_proc:
            server_proc.terminate()
            try:
                server_proc.wait(timeout=3)
            except Exception:
                server_proc.kill()


def render_variant(
    code_tsx_path: Path,
    variant_dir: Path,
    headless: bool = True,
    skip_if_exists: bool = True,
) -> dict:
    """
    Full render pipeline for one variant:
    - scaffold app
    - build
    - screenshot
    Returns result dict saved to variant_dir/render.json
    """
    render_json_path = variant_dir / "render.json"
    screenshot_path = variant_dir / "screenshot.png"

    if skip_if_exists and render_json_path.exists():
        return json.loads(render_json_path.read_text())

    app_dir = variant_dir / "_app"
    code_tsx = code_tsx_path.read_text(encoding="utf-8")

    result = {
        "build_success": False,
        "screenshot_success": False,
        "build_log": "",
        "screenshot_msg": "",
    }

    # Scaffold
    try:
        _scaffold_variant_app(app_dir, code_tsx)
    except Exception as e:
        result["build_log"] = f"Scaffold error: {e}"
        render_json_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        return result

    # Build
    build_ok, build_log = build_variant(app_dir)
    result["build_success"] = build_ok
    result["build_log"] = build_log[-3000:]  # truncate

    if not build_ok:
        print(f"      ❌ Build failed for {variant_dir.name}")
        render_json_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        return result

    # Screenshot
    shot_ok, shot_msg = screenshot_variant(app_dir, screenshot_path, headless=headless)
    result["screenshot_success"] = shot_ok
    result["screenshot_msg"] = shot_msg

    if shot_ok:
        print(f"      📸 Screenshot saved: {screenshot_path}")
    else:
        print(f"      ⚠️  Screenshot failed: {shot_msg}")

    render_json_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result
