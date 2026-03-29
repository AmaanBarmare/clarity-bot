#!/usr/bin/env bash
set -e

trap 'kill 0' EXIT

echo "Starting ClarityBot..."

cd "$(dirname "$0")"

echo "[backend]  Starting FastAPI on port 8000..."
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &

echo "[frontend] Starting Vite on port 5173..."
cd ../frontend
npm run dev &

wait
