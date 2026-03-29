#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT/frontend"
npm run build

cd "$ROOT"
rm -rf public
mkdir -p public
cp -r frontend/dist/* public/

# Ensure Vercel output static directory exists and has the built frontend
if [ -d "$ROOT/.vercel/output" ]; then
  mkdir -p "$ROOT/.vercel/output/static"
  cp -r frontend/dist/* "$ROOT/.vercel/output/static/"
fi
