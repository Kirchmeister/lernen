#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for script in scripts/*.sh; do bash -n "$script"; done
for source in ./*.mjs public/app.js; do node --check "$source"; done
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/check-docs.py
