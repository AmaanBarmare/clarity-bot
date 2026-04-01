#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT/frontend"
npm run build

cd "$ROOT"
rm -rf public backend/static
mkdir -p public backend/static
cp -r frontend/dist/* public/
# Full dist into backend/static — Vercel’s Python bundle includes backend/ but often not repo-root public/.
cp -r frontend/dist/* backend/static/

# Build Output API static tree (present before the FastAPI builder finalizes output).
mkdir -p "$ROOT/.vercel/output/static"
cp -r frontend/dist/* "$ROOT/.vercel/output/static/"

echo "[vercel-build] public + backend/static + .vercel/output/static populated from frontend/dist"
ls -la "$ROOT/public" | head -20
