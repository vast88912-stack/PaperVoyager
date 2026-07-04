import os
from pathlib import Path

OUTPUTS_DIR = Path("outputs/tsx")

PKG_JSON = """{
  "name": "app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.263.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "framer-motion": "^10.12.16",
    "clsx": "^2.0.0",
    "tailwind-merge": "^1.14.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.27",
    "tailwindcss": "^3.3.3",
    "typescript": "^5.0.2",
    "vite": "^4.4.5"
  }
}"""

VITE_CONFIG = """import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
})"""

INDEX_HTML = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PaperVoyager App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>"""

MAIN_TSX = """import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)"""

INDEX_CSS = """@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #020617; /* slate-950 */
  color: #f8fafc;
}
"""

TAILWIND_CONFIG = """/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}"""

POSTCSS_CONFIG = """export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}"""

TS_CONFIG = """{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}"""

TS_CONFIG_NODE = """{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}"""

def main():
    if not OUTPUTS_DIR.exists():
        print("No outputs directory found")
        return

    count = 0
    for proj_dir in OUTPUTS_DIR.iterdir():
        if not proj_dir.is_dir():
            continue
        
        # Check if scaffold exists
        if (proj_dir / "package.json").exists():
            continue

        print(f"Scaffolding {proj_dir.name}...")
        
        # Write files
        (proj_dir / "package.json").write_text(PKG_JSON)
        (proj_dir / "vite.config.ts").write_text(VITE_CONFIG)
        (proj_dir / "index.html").write_text(INDEX_HTML)
        (proj_dir / "postcss.config.js").write_text(POSTCSS_CONFIG)
        (proj_dir / "tailwind.config.js").write_text(TAILWIND_CONFIG)
        (proj_dir / "tsconfig.json").write_text(TS_CONFIG)
        (proj_dir / "tsconfig.node.json").write_text(TS_CONFIG_NODE)
        
        src = proj_dir / "src"
        src.mkdir(exist_ok=True)
        (src / "main.tsx").write_text(MAIN_TSX)
        (src / "index.css").write_text(INDEX_CSS)
        
        count += 1

    print(f"Scaffolded {count} projects.")

if __name__ == "__main__":
    main()







