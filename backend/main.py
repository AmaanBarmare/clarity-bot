import asyncio
import json
import os
import sys
import time
import uuid
from pathlib import Path

_backend_dir = Path(__file__).resolve().parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

import database
from agent import run_pipeline
from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse


def _allowed_origins() -> list[str]:
    raw = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    out = [x.strip() for x in raw.split(",") if x.strip()]
    if vercel_url := os.getenv("VERCEL_URL"):
        out.append(f"https://{vercel_url}")
    if branch_url := os.getenv("VERCEL_BRANCH_URL"):
        out.append(f"https://{branch_url}")
    return list(dict.fromkeys(out))


_REPO_ROOT = Path(__file__).resolve().parent.parent
_PUBLIC_DIR = _REPO_ROOT / "public"

app = FastAPI(title="ClarityBot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")


class ClaimRequest(BaseModel):
    claim: str


@api.get("/health")
async def health():
    return {"status": "ok"}


@api.post("/check")
async def check_claim(req: ClaimRequest):
    claim = req.claim.strip()
    if not claim:
        raise HTTPException(status_code=400, detail="Claim cannot be empty")
    if len(claim) > 1000:
        raise HTTPException(status_code=400, detail="Claim must be 1000 characters or fewer")

    claim_id = str(uuid.uuid4())
    await database.insert_claim(claim_id, claim)

    return {"claim_id": claim_id, "status": "pending"}


@api.post("/execute/{claim_id}")
async def execute_pipeline(claim_id: str):
    row = await database.get_claim(claim_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Claim not found")
    text = row.get("text") or ""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Claim text missing")
    await run_pipeline(text, claim_id)
    return {"claim_id": claim_id, "status": "done"}


@api.get("/results")
async def get_results():
    claims = await database.get_all_claims()
    return claims


@api.get("/results/{claim_id}")
async def get_result(claim_id: str):
    claim = await database.get_claim(claim_id)
    if claim is None:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim


@api.get("/trends")
async def get_trends():
    trends = await database.get_trends()
    return trends


STREAM_MAX_SECONDS = 900.0
STREAM_POLL_INTERVAL = 0.45


@api.get("/logs/stream")
async def stream_logs(request: Request, claim_id: str):
    async def event_generator():
        seen = 0
        last_heartbeat = time.monotonic()
        started = time.monotonic()
        while time.monotonic() - started < STREAM_MAX_SECONDS:
            if await request.is_disconnected():
                break

            logs = await database.get_logs(claim_id)
            for log in logs[seen:]:
                yield {
                    "event": "log",
                    "data": json.dumps({
                        "step": log["step"],
                        "status": log["status"],
                        "message": log["message"],
                        "ts": log["ts"],
                    }),
                }
                seen += 1
                if log["step"] == "error" or (
                    log["step"] == "emitter" and log["status"] == "done"
                ):
                    return

            claim = await database.get_claim(claim_id)
            if claim is not None and claim.get("score") is not None:
                return

            now = time.monotonic()
            if now - last_heartbeat >= 25.0:
                yield {"event": "heartbeat", "data": json.dumps({"status": "heartbeat"})}
                last_heartbeat = now

            await asyncio.sleep(STREAM_POLL_INTERVAL)

    return EventSourceResponse(event_generator())


@api.get("/logs/{claim_id}")
async def get_logs(claim_id: str):
    logs = await database.get_logs(claim_id)
    return logs


app.include_router(api)


@app.on_event("startup")
async def startup():
    try:
        await database.get_trends()
        print("Supabase connection verified")
    except Exception as e:
        print(f"WARNING: Supabase connection failed: {e}")


if _PUBLIC_DIR.is_dir() and any(_PUBLIC_DIR.iterdir()):
    app.mount("/", StaticFiles(directory=str(_PUBLIC_DIR), html=True), name="static")
