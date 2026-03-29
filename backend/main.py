import asyncio
import json
import uuid

from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

import database
from queue_manager import queue_manager
from agent import run_pipeline


app = FastAPI(title="ClarityBot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ClaimRequest(BaseModel):
    claim: str


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/check")
async def check_claim(req: ClaimRequest, background_tasks: BackgroundTasks):
    claim = req.claim.strip()
    if not claim:
        raise HTTPException(status_code=400, detail="Claim cannot be empty")
    if len(claim) > 1000:
        raise HTTPException(status_code=400, detail="Claim must be 1000 characters or fewer")

    claim_id = str(uuid.uuid4())
    await database.insert_claim(claim_id, claim)

    queue_manager.create(claim_id)

    background_tasks.add_task(run_pipeline, claim, claim_id)

    return {"claim_id": claim_id, "status": "processing"}


@app.get("/results")
async def get_results():
    claims = await database.get_all_claims()
    return claims


@app.get("/results/{claim_id}")
async def get_result(claim_id: str):
    claim = await database.get_claim(claim_id)
    if claim is None:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim


@app.get("/trends")
async def get_trends():
    trends = await database.get_trends()
    return trends


@app.get("/logs/stream")
async def stream_logs(request: Request, claim_id: str):
    q = queue_manager.get(claim_id)

    async def event_generator():
        if q is None:
            historical = await database.get_logs(claim_id)
            for log in historical:
                yield {
                    "event": "log",
                    "data": json.dumps({
                        "step": log["step"],
                        "status": log["status"],
                        "message": log["message"],
                        "ts": log["ts"],
                    }),
                }
            return

        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(q.get(), timeout=30.0)
                except asyncio.TimeoutError:
                    yield {"event": "heartbeat", "data": json.dumps({"status": "heartbeat"})}
                    continue

                if event is None:
                    break

                yield {"event": "log", "data": json.dumps(event)}
        finally:
            queue_manager.cleanup(claim_id)

    return EventSourceResponse(event_generator())


@app.get("/logs/{claim_id}")
async def get_logs(claim_id: str):
    logs = await database.get_logs(claim_id)
    return logs


@app.on_event("startup")
async def startup():
    try:
        await database.get_trends()
        print("Supabase connection verified")
    except Exception as e:
        print(f"WARNING: Supabase connection failed: {e}")
