#!/usr/bin/env python3
"""Prüft relative Markdown-Dateilinks; externe Links werden nicht aufgerufen."""
import pathlib
import re

root = pathlib.Path(__file__).resolve().parent.parent
errors = []
documents = [root / "README.md", root / "AGENTS.md", *sorted((root / "docs").glob("*.md"))]
for document in documents:
    for target in re.findall(r"\]\(([^)]+)\)", document.read_text()):
        if "://" in target or target.startswith("#"):
            continue
        path = (document.parent / target.split("#")[0]).resolve()
        if not path.is_relative_to(root) or not path.exists():
            errors.append(f"{document.relative_to(root)}: ungültiges Linkziel {target}")
if errors:
    raise SystemExit("\n".join(errors))
print(f"Dateilinks in {len(documents)} Dokumenten geprüft.")
