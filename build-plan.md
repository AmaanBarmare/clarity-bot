# ClarityBot 2.0 — Complete Build Plan
## HackPSU Spring 2026 · Solo · 24 hours · Custom Frontend + Supabase

---

## Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| Frontend | React + Vite + TypeScript + Tailwind | Claude Code builds 100%, full control |
| Backend | FastAPI (Python) | Async, SSE, clean REST |
| Agent framework | OpenClaw inside NemoClaw | Custom skills, sandboxed, prize-winning |
| Inference | Nemotron 3 Super 120B | Via NemoClaw routing (build.nvidia.com) |
| LLM calls | Gemini API | Claim analysis + cross-referencing |
| Web search | Serper.dev (Google results) | Source retrieval per assertion |
| Database | Supabase (hosted Postgres) | Visual dashboard, zero local setup |
| Realtime | Server-Sent Events (SSE) | Log streaming, no WebSocket needed |
| Security | NemoClaw + OpenShell | Deny-all sandbox, policy-governed egress |

---

## Project Structure

```
claritybot/
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── package.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                ← Router + sidebar layout + health check
│       ├── api/
│       │   └── client.ts          ← ALL fetch() calls in one place
│       ├── pages/
│       │   ├── CheckClaim.tsx     ← Submit + pipeline steps + result
│       │   ├── History.tsx        ← Past fact-checks, filter, search
│       │   ├── TrendReport.tsx    ← SVG pie + bar charts
│       │   └── AgentLogs.tsx      ← Live SSE terminal panel
│       └── components/
│           ├── Sidebar.tsx        ← Nav + StatusDot
│           ├── ScoreBadge.tsx     ← Circular 1-10 score
│           ├── VerdictTag.tsx     ← FALSE / MISLEADING / UNVERIFIED / TRUE
│           ├── ResultCard.tsx     ← Full fact-check result card
│           ├── LogLine.tsx        ← Single terminal log row
│           └── StatusDot.tsx      ← Backend online/offline indicator
│
├── backend/
│   ├── main.py                    ← FastAPI app + all 4 endpoints
│   ├── agent.py                   ← Pipeline orchestrator
│   ├── database.py                ← Supabase client wrapper
│   ├── queue_manager.py           ← asyncio.Queue per claim for SSE
│   ├── skills/
│   │   └── fact_check/
│   │       ├── __init__.py
│   │       ├── extractor.py       ← Step 1: parse assertions
│   │       ├── searcher.py        ← Step 2: Serper web search (Google results)
│   │       ├── crossref.py        ← Step 3: Gemini cross-reference (with credibility labels)
│   │       ├── scorer.py          ← Step 4: score + verdict (with source quality caps)
│   │       ├── emitter.py         ← Step 5: write Supabase + push SSE
│   │       └── source_credibility.py ← Trusted source registry + credibility scoring
│   ├── requirements.txt
│   ├── .env                       ← secrets (gitignored)
│   ├── .env.example               ← committed placeholder
│   └── test_pipeline.py
│
├── nemoclaw/
│   ├── openclaw-sandbox.yaml      ← Network allowlist policy
│   └── setup.sh                   ← One-command sandbox start
│
├── .gitignore                     ← includes .env and node_modules
├── start.sh                       ← starts backend + frontend together
└── README.md
```

---

## Step 0 — Before you touch Claude Code (Hour 0, ~20 mins)

Do all of this before opening your terminal.

### Get your API keys

| Key | URL | Free tier |
|-----|-----|-----------|
| Gemini API key | aistudio.google.com → Get API Key | 1M tokens/day |
| Serper API key | serper.dev → sign up free → copy API key from dashboard | 2500 free queries |
| NVIDIA Nemotron key | build.nvidia.com → Get API Key | Free credits |

### Set up Supabase (5 mins)

1. Go to **supabase.com** → sign up free → New project → name: `claritybot`
2. Choose region: US East
3. Once created (~2 mins), go to **SQL Editor** tab and run this exactly:

```sql
create table claims (
  id text primary key,
  text text not null,
  score integer,
  verdict text,
  explanation text,
  sources text,
  created_at timestamptz default now()
);

create table logs (
  id bigserial primary key,
  claim_id text not null,
  step text not null,
  status text not null,
  message text,
  ts timestamptz default now()
);

create table trends (
  week text primary key,
  total integer default 0,
  false_pct real default 0,
  mislead_pct real default 0,
  unverified_pct real default 0,
  true_pct real default 0,
  avg_score real default 0
);
```

4. Go to **Settings → API** → copy:
   - Project URL → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_KEY`

---

## Step 1 — Open Claude Code

```bash
mkdir claritybot && cd claritybot
claude
```

Now paste each message below **one at a time**. Wait for Claude Code to
finish and confirm before sending the next.

---

## MESSAGE 1 — Full project scaffold

```
Scaffold a claritybot project with two sub-projects: frontend and backend.

FRONTEND (React + Vite + TypeScript + Tailwind):
Run these commands:
  npm create vite@latest frontend -- --template react-ts
  cd frontend
  npm install
  npm install react-router-dom
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p

In tailwind.config.ts set content: ["./index.html","./src/**/*.{ts,tsx}"]

Replace frontend/src/index.css with:
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  body {
    background-color: #111111;
    color: #E5E5E5;
    font-family: 'Inter', sans-serif;
  }

BACKEND (FastAPI Python):
Create backend/ with:

requirements.txt:
  fastapi
  uvicorn[standard]
  python-dotenv
  httpx
  supabase
  sse-starlette

.env (gitignored):
  GEMINI_API_KEY=your_key_here
  SERPER_API_KEY=your_key_here
  NVIDIA_API_KEY=your_key_here
  SUPABASE_URL=your_url_here
  SUPABASE_KEY=your_anon_key_here

.env.example (committed):
  GEMINI_API_KEY=
  SERPER_API_KEY=
  NVIDIA_API_KEY=
  SUPABASE_URL=
  SUPABASE_KEY=

Create backend/skills/__init__.py
Create backend/skills/fact_check/__init__.py

ROOT FILES:
.gitignore:
  .env
  node_modules/
  __pycache__/
  *.pyc
  .DS_Store
  frontend/dist/

start.sh:
  #!/bin/bash
  echo "Starting ClarityBot..."
  cd backend && pip install -r requirements.txt -q && uvicorn main:app --reload --port 8000 &
  cd frontend && npm run dev &
  wait

README.md with a one-paragraph description and "run: bash start.sh"
```

---

## MESSAGE 2 — Supabase database module

```
Create backend/database.py — Supabase client wrapper.

Load env vars with python-dotenv.
Create supabase client:
  from supabase import create_client
  client = create_client(SUPABASE_URL, SUPABASE_KEY)

The 3 tables (claims, logs, trends) already exist in Supabase.
Do NOT create tables here. Just implement these async functions.

Wrap all supabase client calls in asyncio.to_thread() to avoid
blocking the FastAPI event loop. Pattern:
  result = await asyncio.to_thread(
    lambda: client.table("claims").select("*").execute()
  )

Functions to implement:

async def insert_claim(id: str, text: str) -> None
  Insert into claims with id and text only.
  score, verdict, explanation, sources start as None.

async def update_claim(id: str, score: int, verdict: str,
                       explanation: str, sources: list) -> None
  Update claims row where id matches.
  Serialize sources to JSON string: json.dumps(sources)

async def get_all_claims() -> list
  Select all from claims, order by created_at desc.
  For each row, parse sources back: json.loads(row["sources"] or "[]")
  Return list of dicts.

async def get_claim(id: str) -> dict | None
  Select single row from claims where id = id.
  Parse sources. Return dict or None if not found.

async def insert_log(claim_id: str, step: str,
                     status: str, message: str) -> None
  Insert into logs table.

async def get_logs(claim_id: str) -> list
  Select all from logs where claim_id = claim_id, order by ts asc.
  Return list of dicts.

async def upsert_trends(verdict: str, score: int) -> None
  Get current ISO week: datetime.now().strftime("%Y-W%V")
  Fetch existing row for this week.
  If exists: recalculate totals and percentages, update.
  If not: insert first row.
  Use supabase upsert with on_conflict="week".

async def get_trends() -> dict
  Select most recent row from trends, order by week desc, limit 1.
  Return as dict or empty dict {}.
```

---

## MESSAGE 3 — SSE queue manager

```
Create backend/queue_manager.py

Manages one asyncio.Queue per active claim for SSE streaming.

import asyncio
from typing import Dict, Optional

class QueueManager:
    def __init__(self):
        self._queues: Dict[str, asyncio.Queue] = {}

    def create(self, claim_id: str) -> asyncio.Queue:
        q = asyncio.Queue()
        self._queues[claim_id] = q
        return q

    def get(self, claim_id: str) -> Optional[asyncio.Queue]:
        return self._queues.get(claim_id)

    def push(self, claim_id: str, event: dict) -> None:
        q = self._queues.get(claim_id)
        if q:
            q.put_nowait(event)

    def close(self, claim_id: str) -> None:
        q = self._queues.get(claim_id)
        if q:
            q.put_nowait(None)  # None = sentinel = stream done

    def cleanup(self, claim_id: str) -> None:
        self._queues.pop(claim_id, None)

queue_manager = QueueManager()

Event dict format:
{
  "step": str,       # extractor | searcher | crossref | scorer | emitter | error
  "status": str,     # running | done | error
  "message": str,    # human-readable description
  "ts": str          # ISO timestamp: datetime.utcnow().isoformat()
}
```

---

## MESSAGE 4 — 5 skill files

```
Create the 5 skill files in backend/skills/fact_check/
Each skill is an async Python function.
Load all env vars via os.getenv() (python-dotenv loaded in main.py).
Use httpx.AsyncClient for all HTTP calls.

The log_cb signature: async def log_cb(step, status, message)
Call it at the start (status="running") and end (status="done") of each skill.

─── extractor.py ───

import httpx, json, os

async def extract(claim: str, log_cb) -> dict:
    await log_cb("extractor", "running", "Parsing claim into assertions...")
    
    prompt = f"""Given this claim: "{claim}"
    
1. Classify it: is this a factual claim, an opinion, or satire?
2. If factual, extract up to 3 specific, verifiable assertions as a list.

Respond ONLY with valid JSON, no markdown:
{{"claim_type": "factual|opinion|satire", "assertions": ["assertion1", "assertion2"]}}"""

    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
            params={"key": os.getenv("GEMINI_API_KEY")},
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=30.0
        )
    
    text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
    # Strip markdown fences if present
    text = text.strip().strip("```json").strip("```").strip()
    data = json.loads(text)
    
    n = len(data.get("assertions", []))
    await log_cb("extractor", "done", f"Extracted {n} assertion(s). Type: {data['claim_type']}")
    return data

─── searcher.py ───

import httpx, os

SERPER_URL = "https://google.serper.dev/search"

async def search(assertions: list, log_cb) -> dict:
    await log_cb("searcher", "running", "Searching primary sources...")
    
    sources = []
    seen_urls = set()
    
    async with httpx.AsyncClient() as client:
        for assertion in assertions[:3]:  # max 3 to save API quota
            res = await client.post(
                SERPER_URL,
                headers={
                    "X-API-KEY": os.getenv("SERPER_API_KEY"),
                    "Content-Type": "application/json",
                },
                json={"q": assertion, "num": 3},
                timeout=15.0,
            )
            res.raise_for_status()
            items = res.json().get("organic", [])
            for item in items:
                url = item.get("link", "")
                if url not in seen_urls:
                    seen_urls.add(url)
                    sources.append({
                        "title": item.get("title", ""),
                        "url": url,
                        "snippet": item.get("snippet", "")
                    })
    
    await log_cb("searcher", "done", f"Found {len(sources)} source(s)")
    return {"sources": sources}

─── crossref.py ───

import httpx, json, os
from skills.fact_check.source_credibility import get_credibility

async def crossref(claim: str, sources: list, log_cb) -> dict:
    await log_cb("crossref", "running", "Cross-referencing sources with claim...")
    
    sources_text = "\n".join([
        f"{i+1}. [CREDIBILITY: {get_credibility(s.get('url',''))[0].upper()} "
        f"| DOMAIN: {s.get('url','').replace('https://','').replace('http://','').split('/')[0]}] "
        f"{s['title']}: {s['snippet']}"
        for i, s in enumerate(sources[:5])
    ])
    
    prompt = f"""Claim: "{claim}"

Sources found:
{sources_text}

Source credibility labels are provided in brackets before each source.
HIGH credibility means the source is a primary authority (NASA, CDC, WHO),
a major wire service (Reuters, AP), or a dedicated fact-checker (Snopes).
MEDIUM credibility means a .gov or .edu domain not in the primary list.
LOW credibility means an unverified source — treat it with skepticism.
Weight HIGH sources strongly. Discount LOW sources significantly.
If only LOW sources are available, your support_level should be 'none'
unless the claim is so obviously false that no source is needed.

Based ONLY on the sources above, analyze whether they support the claim.

Respond ONLY with valid JSON, no markdown:
{{"support_level": "strong|partial|none|contradicts", "analysis": "2 sentence summary of what the evidence shows"}}"""

    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
            params={"key": os.getenv("GEMINI_API_KEY")},
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=30.0
        )
    
    text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
    text = text.strip().strip("```json").strip("```").strip()
    data = json.loads(text)
    
    await log_cb("crossref", "done", f"Support level: {data['support_level']}")
    return data

─── scorer.py ───

import httpx, json, os
from skills.fact_check.source_credibility import summarize_source_credibility

SCORE_RANGES = {
    "strong":      (7, 10, "TRUE"),
    "partial":     (4,  6, "UNVERIFIED"),
    "none":        (3,  5, "UNVERIFIED"),
    "contradicts": (1,  3, "FALSE"),
}

async def score(support_level: str, analysis: str,
                sources: list, log_cb) -> dict:
    await log_cb("scorer", "running", "Calculating credibility score...")
    
    low, high, default_verdict = SCORE_RANGES.get(support_level, (3, 5, "UNVERIFIED"))

    summary = summarize_source_credibility(sources)

    # Adjust score ceiling based on source quality
    if summary["has_primary_authority"]:
        pass  # full confidence, no cap
    elif summary["high_count"] == 0 and summary["medium_count"] == 0:
        high = min(high, 4)
        low = min(low, 4)
        default_verdict = "UNVERIFIED"
    elif summary["high_count"] == 0:
        high = min(high, 6)

    credibility_note = summary["credibility_note"]
    
    prompt = f"""Analysis of a fact-check: "{analysis}"
Support level: {support_level}

Source quality assessment: {credibility_note}

Pick an exact credibility score between {low} and {high}.
Pick a verdict: one of TRUE, UNVERIFIED, MISLEADING, FALSE.
Write a 2-sentence plain-English explanation for a general audience.

Respond ONLY with valid JSON, no markdown:
{{"score": {low}, "verdict": "{default_verdict}", "explanation": "..."}}"""

    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
            params={"key": os.getenv("GEMINI_API_KEY")},
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=30.0
        )
    
    text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
    text = text.strip().strip("```json").strip("```").strip()
    data = json.loads(text)
    
    # Clamp score to valid range
    data["score"] = max(1, min(10, int(data.get("score", low))))
    
    await log_cb("scorer", "done", f"Score: {data['score']}/10 — {data['verdict']}")
    return data

─── emitter.py ───

import database

async def emit(claim_id: str, claim_text: str,
               score_data: dict, sources: list, log_cb) -> None:
    await log_cb("emitter", "running", "Saving result to database...")
    
    await database.update_claim(
        id=claim_id,
        score=score_data["score"],
        verdict=score_data["verdict"],
        explanation=score_data["explanation"],
        sources=sources
    )
    
    await database.upsert_trends(
        verdict=score_data["verdict"],
        score=score_data["score"]
    )
    
    await log_cb("emitter", "done", "Saved. Dashboard updated.")

─── source_credibility.py ───

Utility module (not a pipeline step). Imported by crossref.py and scorer.py.

TRUSTED_SOURCES = {
    # Space / NASA
    "nasa.gov":                 ("high", "space"),
    "space.com":                ("high", "space"),
    "esa.int":                  ("high", "space"),
    "smithsonianmag.com":       ("high", "space_history"),
    "scientificamerican.com":   ("high", "space"),
    # Vaccines / Health
    "cdc.gov":                  ("high", "health"),
    "who.int":                  ("high", "health"),
    "nih.gov":                  ("high", "health"),
    "pubmed.ncbi.nlm.nih.gov":  ("high", "health"),
    "mayoclinic.org":           ("high", "health"),
    "healthline.com":           ("medium", "health"),
    # Historical facts
    "britannica.com":           ("high", "history"),
    "history.com":              ("high", "history"),
    "nationalgeographic.com":   ("high", "history"),
    "loc.gov":                  ("high", "history"),
    "archives.gov":             ("high", "history"),
    "bbc.com":                  ("high", "history"),
    "bbc.co.uk":                ("high", "history"),
    # Cross-topic fact-checkers and wire services
    "snopes.com":               ("high", "general"),
    "factcheck.org":            ("high", "general"),
    "politifact.com":           ("high", "general"),
    "reuters.com":              ("high", "general"),
    "apnews.com":               ("high", "general"),
    "wikipedia.org":            ("medium", "general"),
}

def get_credibility(url: str) -> tuple[str, str]:
    Normalize URL (strip protocol, www, path).
    Check TRUSTED_SOURCES dict.
    Fallback: .gov -> ("medium", "general"), .edu -> ("medium", "general").
    Default: ("low", "unknown").

def summarize_source_credibility(sources: list) -> dict:
    Aggregate source quality across all sources.
    Return {high_count, medium_count, low_count, total,
            has_primary_authority, credibility_note}.
    has_primary_authority checks for nasa.gov, cdc.gov, who.int,
    nih.gov, loc.gov, archives.gov, esa.int.
    credibility_note is a human-readable string for the Gemini prompt.
```

---

## MESSAGE 5 — Agent pipeline orchestrator

```
Create backend/agent.py

from datetime import datetime, timezone
import database
from queue_manager import queue_manager
from skills.fact_check.extractor import extract
from skills.fact_check.searcher import search
from skills.fact_check.crossref import crossref
from skills.fact_check.scorer import score
from skills.fact_check.emitter import emit

async def run_pipeline(claim: str, claim_id: str) -> None:
    
    async def log_cb(step: str, status: str, message: str):
        ts = datetime.now(timezone.utc).isoformat()
        await database.insert_log(claim_id, step, status, message)
        queue_manager.push(claim_id, {
            "step": step,
            "status": status,
            "message": message,
            "ts": ts
        })
    
    try:
        # Step 1: Extract
        result1 = await extract(claim, log_cb)
        
        if result1.get("claim_type") != "factual":
            await log_cb("scorer", "done", "Non-factual claim — skipped verification")
            await database.update_claim(
                id=claim_id, score=5, verdict="UNVERIFIED",
                explanation="This appears to be an opinion or satire, not a verifiable factual claim.",
                sources=[]
            )
            return
        
        # Step 2: Search
        result2 = await search(result1["assertions"], log_cb)
        
        # Step 3: Cross-reference
        result3 = await crossref(claim, result2["sources"], log_cb)
        
        # Step 4: Score (with source credibility analysis)
        result4 = await score(result3["support_level"], result3["analysis"],
                              result2["sources"], log_cb)
        
        # Step 5: Emit
        await emit(claim_id, claim, result4, result2["sources"], log_cb)
    
    except Exception as e:
        await log_cb("error", "error", f"Pipeline error: {str(e)}")
        await database.update_claim(
            id=claim_id, score=0, verdict="ERROR",
            explanation="An error occurred during verification. Please try again.",
            sources=[]
        )
    
    finally:
        queue_manager.close(claim_id)
```

---

## MESSAGE 6 — FastAPI server

```
Create backend/main.py — complete FastAPI application.

from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import uuid, asyncio, json

load_dotenv()

import database
from agent import run_pipeline
from queue_manager import queue_manager

app = FastAPI(title="ClarityBot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    print("ClarityBot API starting...")
    # Verify Supabase connection
    try:
        await database.get_all_claims()
        print("Supabase connected.")
    except Exception as e:
        print(f"Supabase connection warning: {e}")

class CheckRequest(BaseModel):
    claim: str

@app.post("/check")
async def check_claim(req: CheckRequest, background_tasks: BackgroundTasks):
    if not req.claim.strip():
        raise HTTPException(400, "Claim cannot be empty")
    if len(req.claim) > 1000:
        raise HTTPException(400, "Claim too long (max 1000 chars)")
    
    claim_id = str(uuid.uuid4())
    await database.insert_claim(claim_id, req.claim.strip())
    queue_manager.create(claim_id)
    background_tasks.add_task(run_pipeline, req.claim.strip(), claim_id)
    
    return {"claim_id": claim_id, "status": "processing"}

@app.get("/results")
async def get_results():
    return await database.get_all_claims()

@app.get("/results/{claim_id}")
async def get_result(claim_id: str):
    result = await database.get_claim(claim_id)
    if not result:
        raise HTTPException(404, "Claim not found")
    return result

@app.get("/trends")
async def get_trends():
    return await database.get_trends()

@app.get("/logs/stream")
async def stream_logs(claim_id: str = Query(...)):
    async def event_generator():
        q = queue_manager.get(claim_id)
        if not q:
            # Already finished — return done sentinel
            yield {"data": json.dumps({"step":"done","status":"done",
                                       "message":"Pipeline complete","ts":""})}
            return
        
        while True:
            try:
                event = await asyncio.wait_for(q.get(), timeout=60.0)
            except asyncio.TimeoutError:
                yield {"data": json.dumps({"step":"heartbeat","status":"running",
                                           "message":"...","ts":""})}
                continue
            
            if event is None:  # sentinel
                queue_manager.cleanup(claim_id)
                break
            
            yield {"data": json.dumps(event)}
    
    return EventSourceResponse(event_generator())

@app.get("/health")
async def health():
    return {"status": "ok"}
```

---

## MESSAGE 7 — Frontend API client

```
Create frontend/src/api/client.ts

const BASE = "http://localhost:8000"

export interface Claim {
  id: string
  text: string
  score: number | null
  verdict: "TRUE" | "MISLEADING" | "UNVERIFIED" | "FALSE" | "ERROR" | null
  explanation: string | null
  sources: { title: string; url: string; snippet: string }[]
  created_at: string
}

export interface LogEvent {
  step: string
  status: "running" | "done" | "error" | "heartbeat"
  message: string
  ts: string
}

export interface Trends {
  week: string
  total: number
  false_pct: number
  mislead_pct: number
  unverified_pct: number
  true_pct: number
  avg_score: number
}

export const api = {
  submitClaim: async (claim: string): Promise<{ claim_id: string }> => {
    const res = await fetch(`${BASE}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim }),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  getResult: async (claim_id: string): Promise<Claim> => {
    const res = await fetch(`${BASE}/results/${claim_id}`)
    if (!res.ok) throw new Error("Not found")
    return res.json()
  },

  getAllResults: async (): Promise<Claim[]> => {
    const res = await fetch(`${BASE}/results`)
    if (!res.ok) throw new Error("Failed to fetch")
    return res.json()
  },

  getTrends: async (): Promise<Trends | null> => {
    const res = await fetch(`${BASE}/trends`)
    if (!res.ok) return null
    return res.json()
  },

  streamLogs: (
    claim_id: string,
    onEvent: (e: LogEvent) => void,
    onDone: () => void
  ): EventSource => {
    const es = new EventSource(`${BASE}/logs/stream?claim_id=${claim_id}`)
    es.onmessage = (e) => {
      const data: LogEvent = JSON.parse(e.data)
      if (data.step === "heartbeat") return
      onEvent(data)
      if (data.step === "emitter" && data.status === "done") {
        es.close()
        onDone()
      }
      if (data.status === "error") {
        es.close()
        onDone()
      }
    }
    es.onerror = () => { es.close(); onDone() }
    return es
  },

  checkHealth: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) })
      return res.ok
    } catch {
      return false
    }
  },
}
```

---

## MESSAGE 8 — Frontend components

```
Create all 6 components in frontend/src/components/

─── StatusDot.tsx ───
Props: { online: boolean }
Small pulsing dot + text. Green if online, red if offline.
Online text: "Backend online"  
Offline text: "Backend offline"
Use Tailwind: green-400 / red-400. Pulse animation on the dot.

─── ScoreBadge.tsx ───
Props: { score: number | null }
Circular badge, w-16 h-16, flex center.
1-3: bg-red-500, 4-6: bg-amber-500, 7-10: bg-green-500, null: bg-gray-600
Show score number in white bold text, size xl.
null shows a small spinner (animate-spin border circle).

─── VerdictTag.tsx ───
Props: { verdict: string | null }
Pill badge, px-3 py-1, rounded-full, text-sm font-medium.
FALSE: bg-red-900 text-red-300
MISLEADING: bg-amber-900 text-amber-300
UNVERIFIED: bg-gray-700 text-gray-300
TRUE: bg-green-900 text-green-300
ERROR: bg-red-900 text-red-300
null: gray spinner pill with "Checking..."

─── LogLine.tsx ───
Props: { log: { step: string; status: string; message: string; ts: string } }
Monospace font (font-mono), text-sm, py-0.5.
Format: [HH:MM:SS] [STEP] message
Colors:
  status=done: text-green-400
  status=running: text-amber-400
  status=error: text-red-400
Animate in: transition opacity-0 → opacity-100 over 200ms.
Show a spinning indicator before the message if status=running.

─── ResultCard.tsx ───
Props: { claim: Claim }
Dark card: bg-gray-900 rounded-xl p-6 border border-gray-800.
Layout:
  Row 1: ScoreBadge + VerdictTag + created_at (right-aligned, text-gray-500 text-xs)
  Row 2: claim text in text-gray-300, italic, truncated. 
         "Show more" toggle if > 120 chars.
  Row 3: explanation in text-gray-200 text-sm leading-relaxed
  Row 4: "Sources" heading + list of clickable links
         Each source: external link icon + title (truncated 60 chars) in green-400
  Row 5: "Share" button — copies window.location.origin + /results/id to clipboard
         Shows "Copied!" toast for 2s using a small absolute-positioned div

─── Sidebar.tsx ───
Props: { online: boolean }
Fixed left sidebar, w-56, bg-gray-950, h-screen, border-r border-gray-800.
Top: "ClarityBot" in font-mono text-green-400 text-xl font-bold, pt-6 px-4.
Nav links (use NavLink from react-router-dom):
  / → Check Claim
  /history → History
  /trends → Trend Report
  /logs → Agent Logs
Active link: border-l-2 border-green-400 bg-gray-900 text-white
Inactive link: text-gray-400 hover:text-white hover:bg-gray-900
Bottom (mt-auto pb-6 px-4): <StatusDot online={online} />
```

---

## MESSAGE 9 — Frontend pages

```
Create all 4 pages in frontend/src/pages/

─── CheckClaim.tsx ───

State:
  inputText: string
  isChecking: boolean
  steps: Array<{name, status: 'waiting'|'running'|'done'|'error'}>
  result: Claim | null
  error: string | null

The 5 step definitions (used to render pipeline progress):
  [
    { key: "extractor", label: "Extracting assertions" },
    { key: "searcher",  label: "Searching sources" },
    { key: "crossref",  label: "Cross-referencing" },
    { key: "scorer",    label: "Calculating score" },
    { key: "emitter",   label: "Saving result" },
  ]

Layout (max-w-2xl mx-auto pt-12 px-4):
  h1: "Check a Claim" — text-2xl font-bold text-white mb-2
  p: "Paste any claim, headline, or viral statement." — text-gray-400 mb-6

  Textarea: 
    4 rows, full width, bg-gray-900 border border-gray-700 rounded-lg p-4
    text-gray-100 placeholder-gray-600 focus:border-green-500 focus:outline-none
    placeholder: "e.g. The Eiffel Tower is located in London."
    disabled while isChecking

  Button "Check Claim":
    Full width, bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-lg
    disabled + "Checking..." when isChecking
  
  Error div (if error): red text

  Pipeline steps section (show when isChecking or result):
    5 rows, each showing: step number, label, spinner/check/x icon based on status
    Animate each row sliding in from opacity-0 as it changes from waiting

  Result card (show when result && result.score !== null):
    <ResultCard claim={result} />
    Animate: slide up from translateY(20px) opacity-0

On submit:
  1. setIsChecking(true), reset steps all to 'waiting'
  2. const { claim_id } = await api.submitClaim(inputText)
  3. api.streamLogs(claim_id, (event) => {
       Update step matching event.step to event.status
     }, async () => {
       // Poll for result
       let attempts = 0
       while (attempts < 20) {
         const r = await api.getResult(claim_id)
         if (r.score !== null) { setResult(r); break }
         await new Promise(res => setTimeout(res, 1000))
         attempts++
       }
       setIsChecking(false)
     })
  4. Store claim_id in localStorage("lastClaimId") for AgentLogs page

─── History.tsx ───

On mount: fetch api.getAllResults()

State: claims[], filter: string, search: string, loading: boolean

Layout (max-w-3xl mx-auto pt-12 px-4):
  h1: "History" — text-2xl font-bold mb-6
  
  Row: search input + filter pills (All/FALSE/MISLEADING/UNVERIFIED/TRUE)
  
  Filtered list of <ResultCard> components, collapsed by default.
  Each card has a click-to-expand toggle.
  
  Empty state: "No claims checked yet. Go check one!" with link to /
  Loading skeleton: 3 gray pulse bars while fetching

─── TrendReport.tsx ───

On mount: fetch api.getTrends() + api.getAllResults()

Layout (max-w-3xl mx-auto pt-12 px-4):
  h1: "Trend Report" — text-2xl font-bold mb-6
  
  3 stat cards in a row:
    - Total claims checked (trends.total)
    - Average score (trends.avg_score, 1 decimal)
    - Most common verdict (calculate from claims array)
  
  Donut chart (plain SVG, no libraries):
    Circle r=80, 4 arc segments for FALSE/MISLEADING/UNVERIFIED/TRUE
    Colors: red/amber/gray/green
    Center text: total count
    Legend below with percentages
  
  Bar chart (plain SVG):
    Last 7 days of data from claims array
    Group by date, count claims per day
    Bars colored green
    X axis: day labels, Y axis: count
  
  Empty state if no data: "Check some claims to see trends."

─── AgentLogs.tsx ───

On mount:
  - Check localStorage("lastClaimId")
  - If found, start streaming: api.streamLogs(claim_id, ...)
  - If already done, fetch from api.getResult() and display completed logs

State: logs: LogEvent[], isActive: boolean

Layout (max-w-3xl mx-auto pt-12 px-4):
  h1: "Agent logs" — font-mono text-2xl text-green-400 mb-4
  
  Terminal panel:
    bg-gray-950 rounded-xl border border-gray-800 p-4
    min-h-64 max-h-96 overflow-y-auto
    
    Header bar: "claritybot@agent" in green + blinking cursor if active
    Clear button: text-gray-500 hover:text-white text-sm
    
    Scrollable log area with <LogLine> per event
    Auto-scroll to bottom on new logs (useEffect on logs.length)
    
    Empty state: text-gray-600 font-mono "Waiting for claim submission..."
  
  When a new claim is submitted from CheckClaim.tsx (via localStorage event),
  clear logs and start new stream.
```

---

## MESSAGE 10 — App shell, routing, wiring + test script

```
Create frontend/src/App.tsx

import { Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import CheckClaim from './pages/CheckClaim'
import History from './pages/History'
import TrendReport from './pages/TrendReport'
import AgentLogs from './pages/AgentLogs'
import { api } from './api/client'

export default function App() {
  const [online, setOnline] = useState(false)

  useEffect(() => {
    const check = async () => setOnline(await api.checkHealth())
    check()
    const interval = setInterval(check, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex h-screen bg-[#111111] text-gray-100">
      <Sidebar online={online} />
      <main className="flex-1 overflow-y-auto ml-56">
        <Routes>
          <Route path="/" element={<CheckClaim />} />
          <Route path="/history" element={<History />} />
          <Route path="/trends" element={<TrendReport />} />
          <Route path="/logs" element={<AgentLogs />} />
        </Routes>
      </main>
    </div>
  )
}

─── Also create frontend/src/main.tsx ───

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

─── Also create backend/test_pipeline.py ───

Run 3 test claims directly through the pipeline (no HTTP):
  1. "The Great Wall of China is visible from space with the naked eye"
  2. "Water boils at 100 degrees Celsius at sea level"
  3. "Vaccines contain microchips for government tracking"

For each:
  - Load .env
  - Call run_pipeline(claim, fake_uuid)
  - Print every log event as it arrives
  - Print final result: score, verdict, explanation
  - Assert score is not None and verdict is not None

─── Also create nemoclaw/openclaw-sandbox.yaml ───

Allowlist only these hosts (deny everything else):
  - generativelanguage.googleapis.com
  - google.serper.dev
  - build.nvidia.com

─── Also create nemoclaw/setup.sh ───

#!/bin/bash
echo "Setting up NemoClaw sandbox for ClarityBot..."
nemoclaw onboard --name claritybot-sandbox
nemoclaw start
echo "NemoClaw sandbox running."
```

---

## 24-Hour Build Timeline

| Time | Task | Tool |
|------|------|------|
| **0:00–0:20** | Get 4 API keys + set up Supabase + run SQL to create tables | Browser |
| **0:20–0:50** | Claude Code Message 1 — full scaffold. Run `npm run dev` (blank page = good). | Claude Code |
| **0:50–1:20** | Claude Code Messages 2–3 — Supabase module + SSE queue. | Claude Code |
| **1:20–3:30** | Claude Code Message 4 — 5 skill files. Most important step. | Claude Code |
| **3:30–4:30** | Claude Code Message 5 — agent pipeline. | Claude Code |
| **4:30–5:30** | Claude Code Message 6 — FastAPI server. Test `/health` in browser → should return `{"status":"ok"}` | Claude Code |
| **5:30–6:00** | Fill in `.env` with your real API keys. Run `python test_pipeline.py` on 1 claim. Debug until you see a score. | You |
| **6:00–7:00** | Claude Code Messages 7–8 — API client + components. | Claude Code |
| **7:00–9:00** | Claude Code Messages 9–10 — 4 pages + App shell + test script. | Claude Code |
| **9:00–11:00** | **Full integration test.** Run `bash start.sh`. Open browser. Submit a claim. Watch the pipeline steps light up. Check Supabase dashboard — you should see the row appear in `claims` table in real time. Fix any bugs with follow-up Claude Code messages. | You + Claude Code |
| **11:00–13:00** | Polish pass — fix any UI issues, improve styling, test all 4 pages, test error states. | Claude Code |
| **13:00–15:00** | **Sleep/rest.** Do not skip this. | — |
| **15:00–16:00** | `bash nemoclaw/setup.sh` — onboard the NemoClaw sandbox. Verify agent runs inside it. | You |
| **16:00–17:30** | Write Devpost submission (use the template below). | You |
| **17:30–18:00** | Register `claritybot.tech` on mlh.io (free, 2 mins). Take screenshots. | You |
| **18:00–19:30** | Record 5-minute demo video. Script below. | You |
| **19:30–20:30** | Submit on Devpost to all 5 prize categories. | You |
| **20:30–24:00** | Practice pitch 3x out loud. Sleep. | You |

---

## Debugging Checklist

If something breaks during integration testing, check these first:

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `/health` returns 500 | Supabase env vars wrong | Check `.env`, recheck URL/key from Supabase dashboard |
| `POST /check` hangs | Gemini API key wrong | Test key at aistudio.google.com |
| Score always null | Pipeline erroring silently | Run `test_pipeline.py` and read the traceback |
| Frontend can't reach backend | CORS or wrong port | Confirm backend is on 8000, frontend on 5173 |
| SSE logs never appear | Queue not created before pipeline starts | Check `queue_manager.create()` is called in `POST /check` before background task |
| Supabase write fails | `asyncio.to_thread` missing | Supabase client is sync — must wrap in to_thread |

---

## Devpost Submission Template

```
INSPIRATION
Misinformation spreads faster than corrections. I wanted to build a tool 
that makes fact-checking as easy as forwarding a message — paste any claim, 
get a credibility score and sources in seconds.

WHAT IT DOES
ClarityBot takes any claim, headline, or viral statement and runs it through 
a 5-step AI pipeline: assertion extraction, web source retrieval, 
cross-referencing, credibility scoring (1–10), and verdict labeling 
(TRUE / MISLEADING / UNVERIFIED / FALSE). Every step streams live to a 
real-time dashboard with a terminal-style log panel.

HOW WE BUILT IT
- NemoClaw (NVIDIA, released March 16 2026): sandboxes the OpenClaw agent 
  with deny-all network policy via OpenShell
- OpenClaw: agent framework with 5 custom TypeScript skills
- Nemotron 3 Super 120B: inference provider via build.nvidia.com
- Gemini 2.5 Flash: claim extraction and cross-referencing
- Serper.dev: Google search results for source retrieval
- FastAPI (Python): REST backend + Server-Sent Events for live log streaming
- React + Vite + TypeScript + Tailwind: custom frontend
- Supabase: hosted Postgres for claims, logs, and trend data

CHALLENGES
- Configuring NemoClaw's OpenShell policy to allow only the necessary 
  endpoints while keeping the pipeline functional
- Building a live SSE streaming system that syncs the agent's skill 
  execution with the frontend's pipeline step UI in real time
- Handling async Supabase writes inside FastAPI's event loop 
  (required asyncio.to_thread wrapping)

WHAT WE LEARNED
NemoClaw was released just 12 days before this hackathon — learning its 
sandbox policy system, blueprint lifecycle, and inference routing was the 
most challenging and rewarding part of the build.

WHAT'S NEXT
- Telegram bot integration (NemoClaw has a built-in bridge)
- Browser extension to check claims inline on social media
- Multi-language support

BUILT WITH
NemoClaw, NVIDIA OpenShell, OpenClaw, Nemotron, Gemini API, FastAPI, 
React, Vite, TypeScript, TailwindCSS, Supabase, Server-Sent Events, Python
```

---

## Demo Video Script (5 minutes)

```
0:00–0:20  "Hi, I'm [name]. This is ClarityBot — a misinformation 
            fact-checker built on NemoClaw, NVIDIA's security runtime 
            for AI agents, released 12 days ago at GTC."

0:20–1:30  Open Check Claim. Type:
           "The Great Wall of China is visible from space with the naked eye."
           Hit Check. Narrate each step live as it lights up.
           Show result: score, verdict, sources.

1:30–2:30  Switch to Agent Logs.
           "Every skill step is logged live. This is the NemoClaw pipeline —
            not an API wrapper. 5 skills, policy-sandboxed, Nemotron inference."
           Submit second claim: "Vaccines cause autism."
           Watch logs fire in real time.

2:30–3:15  Switch to History. Show both results. Filter to FALSE.

3:15–4:00  Switch to Trend Report. Show charts.
           "Over time this builds your information diet profile."

4:00–4:30  Show Supabase dashboard on a second tab.
           "Here's every claim hitting the database live. 
            Full observability for free."

4:30–5:00  "NemoClaw runs the agent in a sandboxed container —
            deny-all egress, only Gemini and Serper allowed.
            Built solo in 24 hours. Thank you."
```

---

## Prize Submission Checklist

- [ ] **Grand Prize** — submit as main open-track project
- [ ] **IST/OpenClaw Challenge** — highlight NemoClaw, OpenClaw, 5 custom skills
- [ ] **MLH Best Use of Gemini** — highlight Gemini for extraction + cross-referencing
- [ ] **Base44 Challenge** — social media misinformation = mental health + meaningful engagement impact
- [ ] **Best .tech Domain** — register claritybot.tech on mlh.io (free, 2 mins)

---

## Judge Pitch (60 seconds — memorize this)

"ClarityBot fact-checks any claim in real time using a 5-step AI pipeline
sandboxed by NemoClaw — NVIDIA's brand new security runtime, released just
12 days ago. The agent runs inside an OpenShell container with a deny-all
network policy, so even a prompt injection attack can't reach unauthorized
endpoints. It extracts assertions, searches primary sources, cross-references
with Nemotron 120B, scores credibility 1-to-10, and streams every step live
to this dashboard. Let me show you."

[Submit a claim. Watch the pipeline fire. Show Supabase dashboard. Done.]