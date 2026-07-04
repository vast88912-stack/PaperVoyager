# Prompts layout

- `*.txt` symlinks point to ChatGPT-5.1 prompt specs (current model baseline).
- `models/chatgpt-5.1/` holds the authoritative prompt files you should edit.
- `models/gemini-3-pro/` archives the earlier Gemini 3.0 Pro prompts (kept read-only).

Usage:
- Generation scripts that scan `./prompts/*.txt` will automatically pick up the ChatGPT-5.1 versions via symlinks.
- To switch models in the future, update the symlinks to point to another `models/<model>/` folder.
