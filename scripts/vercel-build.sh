#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/frontend"
npm run build
cd "$ROOT"
rm -rf public
mkdir -p public
cp -r frontend/dist/* public/
