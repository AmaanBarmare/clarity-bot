# TASKS.md — ClarityBot Build Plan

This file is the execution plan for the HackPSU 24-hour build.
Read CLAUDE.md first. Every decision here assumes that context.

Work through tasks in strict order. Do not skip ahead.
Each task unblocks the next. After each task, run the verification
command before moving on.

---

## TASK 1 — Project scaffold

```
Scaffold the claritybot project with this exact structure:

claritybot/
  frontend/     React + Vite + TypeScript + TailwindCSS
  backend/      FastAPI Python
  nemoclaw/     NemoClaw sandbox config
  start.sh      starts both servers
  README.md

FRONTEND:
Run these commands exactly:
  npm create vite@latest frontend -- --template react-ts
  cd frontend && npm install
  npm install react-router-dom
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p

In tailwind.config.ts set:
  content: ["./index.html", "./src/**/*.{ts,tsx}"]

Replace frontend/src/index.css with:
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  body {
    background-color: #111111;
    color: #E5E5E5;
    font-family: 'Inter', sans-serif;
  }

BACKEND:
Create backend/requirements.txt with:
  fastapi
  uvicorn[standard]
  python-dotenv
  httpx
  supabase
  sse-starlette

Create backend/.env (gitignored):
  GEMINI_API_KEY=your_key_here
  SEARCH_API_KEY=your_key_here
  SEARCH_ENGINE_ID=your_id_here
  NVIDIA_API_KEY=your_key_here
  SUPABASE_URL=your_url_here
  SUPABASE_KEY=your_anon_key_here

Create backend/.env.example (committed, all values empty):
  GEMINI_API_KEY=
  SEARCH_API_KEY=
  SEARCH_ENGINE_ID=
  NVIDIA_API_KEY=
  SUPABASE_URL=
  SUPABASE_KEY=

Create backend/skills/__init__.py (empty)
Create backend/skills/fact_check/__init__.py (empty)

ROOT FILES:
.gitignore must include:
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

**Verify:**
```bash
cd frontend && npm run dev
# Should open http://localhost:5173 with blank Vite page — confirm no errors
```

---

## TASK 2 — Supabase database module

```
Create backend/database.py — Supabase client wrapper.

Requirements:
- Load env vars with python-dotenv at module level
- Create supabase client: client = create_client(SUPABASE_URL, SUPABASE_KEY)
- The 3 tables (claims, logs, trends) already exist in Supabase
- Do NOT create tables in code
- Wrap ALL supabase client calls in asyncio.to_thread() — the client is synchronous

Pattern for every function:
  result = await asyncio.to_thread(
      lambda: client.table("claims").select("*").execute()
  )

Functions to implement:

async def insert_claim(id: str, text: str) -> None
  Insert into claims with id and text only.
  score, verdict, explanation, sources are null initially.

async def update_claim(id: str, score: int, verdict: str,
                       explanation: str, sources: list) -> None
  Update claims row where id matches.
  Serialize sources: json.dumps(sources) before storing.

async def get_all_claims() -> list
  Select all from claims, order by created_at desc.
  For each row parse sources: json.loads(row["sources"] or "[]")
  Return list of dicts.

async def get_claim(id: str) -> dict | None
  Select single row where id matches.
  Parse sources. Return dict or None if not found.

async def insert_log(claim_id: str, step: str,
                     status: str, message: str) -> None
  Insert into logs table.

async def get_logs(claim_id: str) -> list
  Select all from logs where claim_id matches, order by ts asc.
  Return list of dicts.

async def upsert_trends(verdict: str, score: int) -> None
  Get current ISO week: datetime.now().strftime("%Y-W%V")
  Fetch existing row for this week.
  If exists: increment total, recalculate percentages and avg_score.
  If not: insert first row for this week.
  Supabase upsert with on_conflict="week".

async def get_trends() -> dict
  Select most recent row from trends, order by week desc, limit 1.
  Return as dict or empty dict {} if no rows.
```

**Verify:**
```bash
cd backend
python -c "
import asyncio
from dotenv import load_dotenv
load_dotenv()
from database import get_all_claims
result = asyncio.run(get_all_claims())
print('Supabase connected. Claims count:', len(result))
"
```

---

## TASK 3 — SSE queue manager

```
Create backend/queue_manager.py

Manages one asyncio.Queue per active claim for SSE streaming.

import asyncio
from typing import Dict, Optional
from datetime import datetime, timezone

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
```

Event dict format to use when calling push():
```python
{
    "step": str,      # extractor | searcher | crossref | scorer | emitter | error
    "status": str,    # running | done | error
    "message": str,
    "ts": datetime.now(timezone.utc).isoformat()
}
```

---

## TASK 4 — 5 skill files

```
Create all 5 skill files in backend/skills/fact_check/
Each skill is an async function. Load env vars via os.getenv().
Use httpx.AsyncClient for all HTTP calls.
log_cb signature: async def log_cb(step, status, message)
Call log_cb at start (running) and end (done) of every skill.

--- extractor.py ---

async def extract(claim: str, log_cb) -> dict:
    await log_cb("extractor", "running", "Parsing claim into assertions...")

    prompt = f"""Given this claim: "{claim}"

1. Classify it: is this a factual claim, an opinion, or satire?
2. If factual, extract up to 3 specific verifiable assertions.

Respond ONLY with valid JSON, no markdown:
{{"claim_type": "factual|opinion|satire", "assertions": ["...", "..."]}}"""

    Call Gemini API via httpx (see CLAUDE.md for exact call pattern)
    Strip markdown fences, parse JSON
    n = len(data.get("assertions", []))
    await log_cb("extractor", "done", f"Extracted {n} assertion(s). Type: {data['claim_type']}")
    return data  # {claim_type, assertions}

--- searcher.py ---

async def search(assertions: list, log_cb) -> dict:
    await log_cb("searcher", "running", "Searching primary sources...")

    For each assertion (max 3):
      GET https://www.googleapis.com/customsearch/v1
        params: key, cx, q=assertion, num=3
    Deduplicate results by URL.
    Collect: [{title, url, snippet}]

    await log_cb("searcher", "done", f"Found {len(sources)} source(s)")
    return {"sources": sources}

--- crossref.py ---

from skills.fact_check.source_credibility import get_credibility

async def crossref(claim: str, sources: list, log_cb) -> dict:
    await log_cb("crossref", "running", "Cross-referencing sources with claim...")

    Build sources_text with credibility labels:
    sources_text = "\n".join([
        f"{i+1}. [CREDIBILITY: {get_credibility(s.get('url',''))[0].upper()} "
        f"| DOMAIN: {s.get('url','').replace('https://','').replace('http://','').split('/')[0]}] "
        f"{s['title']}: {s['snippet']}"
        for i, s in enumerate(sources[:5])
    ])

    Add this paragraph to the Gemini prompt before the JSON schema:
    "Source credibility labels are provided in brackets before each source.
     HIGH credibility means the source is a primary authority (NASA, CDC, WHO),
     a major wire service (Reuters, AP), or a dedicated fact-checker (Snopes).
     MEDIUM credibility means a .gov or .edu domain not in the primary list.
     LOW credibility means an unverified source — treat it with skepticism.
     Weight HIGH sources strongly. Discount LOW sources significantly.
     If only LOW sources are available, your support_level should be 'none'
     unless the claim is so obviously false that no source is needed."

    Response JSON schema:
    {"support_level": "strong|partial|none|contradicts", "analysis": "2 sentences"}

    await log_cb("crossref", "done", f"Support level: {data['support_level']}")
    return data

--- scorer.py ---

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

    Add credibility_note into the Gemini scoring prompt before the JSON schema.
    Ask Gemini to pick exact score in range and choose FALSE vs MISLEADING.
    Response JSON schema:
    {"score": int, "verdict": "TRUE|UNVERIFIED|MISLEADING|FALSE", "explanation": "2 sentences"}

    Clamp score: data["score"] = max(1, min(10, int(data.get("score", low))))

    await log_cb("scorer", "done", f"Score: {data['score']}/10 — {data['verdict']}")
    return data

--- emitter.py ---

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
    await database.upsert_trends(score_data["verdict"], score_data["score"])

    await log_cb("emitter", "done", "Saved. Dashboard updated.")

--- source_credibility.py ---

Utility module (not a pipeline step). Imported by crossref.py and scorer.py.

TRUSTED_SOURCES dict mapping domains to (level, topic) tuples.
Covers 3 topic areas: Space/NASA, Vaccines/Health, Historical facts.
Plus cross-topic fact-checkers and wire services (snopes.com, factcheck.org,
politifact.com, reuters.com, apnews.com, wikipedia.org).

def get_credibility(url: str) -> tuple[str, str]:
    Returns (credibility_level, topic_tag) for a URL.
    Normalizes URL (strip protocol, www, path).
    Checks TRUSTED_SOURCES dict first.
    Falls back: .gov -> ("medium", "general"), .edu -> ("medium", "general").
    Default: ("low", "unknown").

def summarize_source_credibility(sources: list) -> dict:
    Takes list of source dicts (each with 'url' key).
    Returns {high_count, medium_count, low_count, total,
             has_primary_authority, credibility_note}
    has_primary_authority is True if any source is from
    nasa.gov, cdc.gov, who.int, nih.gov, loc.gov, archives.gov, or esa.int.
    credibility_note is a human-readable string for the Gemini prompt.
```

---

## TASK 5 — Agent pipeline orchestrator

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
        queue_manager.push(claim_id, {"step": step, "status": status,
                                       "message": message, "ts": ts})

    try:
        result1 = await extract(claim, log_cb)

        if result1.get("claim_type") != "factual":
            await log_cb("scorer", "done", "Non-factual claim — skipped verification")
            await database.update_claim(
                id=claim_id, score=5, verdict="UNVERIFIED",
                explanation="This appears to be an opinion or satire.",
                sources=[]
            )
            return

        result2 = await search(result1["assertions"], log_cb)
        result3 = await crossref(claim, result2["sources"], log_cb)
        result4 = await score(result3["support_level"], result3["analysis"],
                              result2["sources"], log_cb)
        await emit(claim_id, claim, result4, result2["sources"], log_cb)

    except Exception as e:
        await log_cb("error", "error", f"Pipeline error: {str(e)}")
        await database.update_claim(
            id=claim_id, score=0, verdict="ERROR",
            explanation="An error occurred during verification.",
            sources=[]
        )

    finally:
        queue_manager.close(claim_id)
```

**Verify:**
```bash
cd backend
python test_pipeline.py
# Should print step-by-step logs and return score + verdict for test claim
# Fix until a valid result is returned before proceeding
```

---

## TASK 6 — FastAPI server

```
Create backend/main.py — complete FastAPI application.

Import and configure:
  from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
  from fastapi.middleware.cors import CORSMiddleware
  from sse_starlette.sse import EventSourceResponse
  from pydantic import BaseModel
  from dotenv import load_dotenv
  load_dotenv()

  CORS: allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"]

Startup event: log "ClarityBot API starting..." and verify Supabase by calling
get_all_claims(). Print result or warning.

Endpoints:

POST /check
  Body: {"claim": str}
  Validate: non-empty, max 1000 chars
  Generate claim_id = str(uuid.uuid4())
  await database.insert_claim(claim_id, claim)
  queue_manager.create(claim_id)          ← MUST be before add_task
  background_tasks.add_task(run_pipeline, claim, claim_id)
  Return: {"claim_id": claim_id, "status": "processing"}

GET /results
  Return await database.get_all_claims()

GET /results/{claim_id}
  result = await database.get_claim(claim_id)
  If None: raise HTTPException(404)
  Return result

GET /trends
  Return await database.get_trends()

GET /logs/stream?claim_id=xxx
  async def event_generator():
    q = queue_manager.get(claim_id)
    if not q:
      yield {"data": json.dumps({"step":"done","status":"done",
                                  "message":"Complete","ts":""})}
      return
    while True:
      try:
        event = await asyncio.wait_for(q.get(), timeout=60.0)
      except asyncio.TimeoutError:
        yield {"data": json.dumps({"step":"heartbeat","status":"running",
                                    "message":"...","ts":""})}
        continue
      if event is None:
        queue_manager.cleanup(claim_id)
        break
      yield {"data": json.dumps(event)}
  return EventSourceResponse(event_generator())

GET /health
  Return {"status": "ok"}
```

**Verify:**
```bash
cd backend && uvicorn main:app --port 8000 &
curl http://localhost:8000/health
# Should return {"status":"ok"}
curl http://localhost:8000/results
# Should return [] (empty array from Supabase)
```

---

## TASK 7 — Frontend API client

```
Create frontend/src/api/client.ts

const BASE = "http://localhost:8000"

Export interfaces:
  Claim { id, text, score, verdict, explanation, sources[], created_at }
  LogEvent { step, status, message, ts }
  Trends { week, total, false_pct, mislead_pct, unverified_pct, true_pct, avg_score }

Export api object with methods:
  submitClaim(claim: string): Promise<{claim_id: string}>
    POST /check with {claim}

  getResult(claim_id: string): Promise<Claim>
    GET /results/{claim_id}

  getAllResults(): Promise<Claim[]>
    GET /results

  getTrends(): Promise<Trends | null>
    GET /trends, return null on failure

  streamLogs(claim_id, onEvent, onDone): EventSource
    new EventSource(BASE/logs/stream?claim_id=xxx)
    Filter out heartbeat events (step === "heartbeat")
    Close and call onDone when step === "emitter" && status === "done"
    Close and call onDone on error status too
    Close and call onDone on EventSource error

  checkHealth(): Promise<boolean>
    GET /health with AbortSignal.timeout(3000)
    Return true if ok, false on any failure
```

---

## TASK 8 — Frontend components

```
Create all 6 components in frontend/src/components/

--- StatusDot.tsx ---
Props: { online: boolean }
Pulsing dot + text. Green if online, red if offline.
"Backend online" / "Backend offline"
Use Tailwind animate-pulse on the dot.

--- ScoreBadge.tsx ---
Props: { score: number | null }
Circular badge w-16 h-16 flex center.
1–3: bg-red-500, 4–6: bg-amber-500, 7–10: bg-green-500, null: bg-gray-600
White bold text showing the score number.
null: render a small spinner (animate-spin border circle).

--- VerdictTag.tsx ---
Props: { verdict: string | null }
Pill badge px-3 py-1 rounded-full text-sm font-medium.
Colors per CLAUDE.md verdict pill spec.
null: gray pill with spinner and "Checking..."

--- LogLine.tsx ---
Props: { log: {step, status, message, ts} }
Monospace font-mono text-sm py-0.5
Format: [HH:MM:SS] [STEP] message
done: text-green-400, running: text-amber-400, error: text-red-400
Animate in: opacity-0 to opacity-100 over 200ms on mount.

--- ResultCard.tsx ---
Props: { claim: Claim }
bg-gray-900 rounded-xl p-6 border border-gray-800
Row 1: ScoreBadge + VerdictTag + timestamp (text-gray-500 text-xs right-aligned)
Row 2: claim text italic text-gray-300, truncated at 120 chars with "Show more" toggle
Row 3: explanation text-gray-200 text-sm leading-relaxed
Row 4: "Sources" section — each source as external link in text-green-400
Row 5: "Share" button — copies URL+claim id to clipboard, shows "Copied!" toast 2s

--- Sidebar.tsx ---
Props: { online: boolean }
Fixed left w-56 bg-gray-950 h-screen border-r border-gray-800
Top: "ClarityBot" font-mono text-green-400 text-xl font-bold pt-6 px-4
Nav links via NavLink from react-router-dom:
  / → Check Claim
  /history → History
  /trends → Trend Report
  /logs → Agent Logs
Active: border-l-2 border-green-400 bg-gray-900 text-white
Inactive: text-gray-400 hover:text-white hover:bg-gray-900
Bottom mt-auto pb-6 px-4: <StatusDot online={online} />
```

**Verify:**
```bash
cd frontend && npm run tsc --noEmit
# Zero type errors expected before moving on
```

---

## TASK 9 — Frontend pages

```
Create all 4 pages in frontend/src/pages/

--- CheckClaim.tsx ---

5 step definitions (order matters — must match backend step keys):
  extractor → "Extracting assertions"
  searcher  → "Searching sources"
  crossref  → "Cross-referencing"
  scorer    → "Calculating score"
  emitter   → "Saving result"

State: inputText, isChecking, steps (waiting|running|done|error), result, error

Layout (max-w-2xl mx-auto pt-12 px-4):
  h1: "Check a Claim"
  Textarea: 4 rows, full width, dark styled, placeholder:
    "e.g. The Eiffel Tower is located in London."
  Button "Check Claim": full width green, disabled while checking

On submit:
  1. api.submitClaim(text) → get claim_id
  2. Store claim_id in localStorage("lastClaimId")
  3. api.streamLogs(claim_id, onEvent, onDone)
     onEvent: update step matching event.step to event.status
     onDone: poll api.getResult(claim_id) every 1s until score !== null
  4. Show ResultCard when score !== null

Pipeline steps UI: 5 rows with spinner/check/x icon based on status.
Each row animates in when it changes from "waiting".

--- History.tsx ---

On mount: fetch api.getAllResults()
State: claims[], filter string, search string, loading boolean

Layout (max-w-3xl mx-auto pt-12 px-4):
  h1: "History"
  Search input + filter pills (All/FALSE/MISLEADING/UNVERIFIED/TRUE)
  Filtered list of ResultCard (collapsed by default, click to expand)
  Empty state: "No claims checked yet."
  Loading skeleton: 3 pulse bars while fetching

--- TrendReport.tsx ---

On mount: fetch api.getTrends() and api.getAllResults()

Layout (max-w-3xl mx-auto pt-12 px-4):
  h1: "Trend Report"
  3 stat cards in a row: total checked / avg score / most common verdict

  Donut chart (plain SVG only — no libraries):
    Circle r=80, 4 arc segments for FALSE/MISLEADING/UNVERIFIED/TRUE
    Colors: red / amber / gray / green
    Center text showing total count
    Legend below with percentages

  Bar chart (plain SVG only — no libraries):
    Group claims by day for last 7 days
    Bars in green, X axis day labels, Y axis count

  Empty state if no data: "Check some claims to see trends."

--- AgentLogs.tsx ---

On mount:
  Read localStorage("lastClaimId")
  If found: api.streamLogs(claim_id, onEvent, onDone)
  Append each event to logs state array

State: logs LogEvent[], isActive boolean

Layout (max-w-3xl mx-auto pt-12 px-4):
  h1: "Agent logs" in font-mono text-green-400

  Terminal panel:
    bg-gray-950 rounded-xl border border-gray-800 p-4
    min-h-64 max-h-96 overflow-y-auto

    Header: "claritybot@agent" in green + blinking cursor when active
    "Clear" button: clears logs state

    Scrollable area with <LogLine /> per event
    Auto-scroll to bottom on new logs (useEffect on logs.length)
    Empty state: text-gray-600 font-mono "Waiting for claim submission..."
```

---

## TASK 10 — App shell, routing, and test script

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

Create frontend/src/main.tsx:
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

Create backend/test_pipeline.py:
  Run 3 test claims directly (no HTTP, no server needed):
    1. "The Great Wall of China is visible from space with the naked eye"
    2. "Water boils at 100 degrees Celsius at sea level"
    3. "Vaccines contain microchips for government tracking"
  For each: load .env, call run_pipeline(claim, fake_uuid)
  Print every log event as it arrives
  Print final score, verdict, explanation
  Assert score is not None and verdict is not None

Create nemoclaw/openclaw-sandbox.yaml:
  Allowlist only:
    generativelanguage.googleapis.com
    customsearch.googleapis.com
    www.googleapis.com
    build.nvidia.com
  Deny all other egress.

Create nemoclaw/setup.sh:
  #!/bin/bash
  echo "Setting up NemoClaw sandbox for ClarityBot..."
  nemoclaw onboard --name claritybot-sandbox
  nemoclaw start
  echo "NemoClaw sandbox running."
```

---

## TASK 11 — Full integration test

This is not a Claude Code task. You run this yourself.

```bash
bash start.sh
```

Open http://localhost:5173 and walk through the full demo loop:

1. Submit "The moon landing in 1969 was faked in a Hollywood studio"
   - All 5 pipeline steps should animate in sequence
   - Result card should appear with score 1–3, verdict FALSE
   - Sources should be linked

2. Check Agent Logs page — terminal should show all 5 steps

3. Check History page — the claim should appear

4. Submit 2 more claims, then check Trend Report — charts should render

5. Open Supabase dashboard — verify rows in claims, logs, trends tables

If anything fails:
  - Backend 500s → check backend terminal for traceback
  - SSE never fires → verify queue_manager.create() is before add_task in main.py
  - Score never appears → run test_pipeline.py and fix the skill that errors
  - Supabase writes fail → verify asyncio.to_thread() wrapping in database.py
  - Frontend blank → check browser console for TypeScript errors

Fix all issues before proceeding to Task 12.

---

## TASK 12 — NemoClaw sandbox

```bash
bash nemoclaw/setup.sh
```

Verify the sandbox is running:
```bash
nemoclaw status
```

Test that the agent still runs correctly inside the sandbox by submitting
one more claim from the dashboard. The pipeline should complete normally.

If the pipeline fails inside the sandbox: check the network policy file.
A blocked request will surface in the NemoClaw TUI — approve or add to allowlist.

---

## TASK 13 — Devpost + demo prep

```
Create DEVPOST.md with these sections:

## Inspiration
Misinformation spreads faster than corrections. We wanted to make
fact-checking as easy as submitting a form.

## What it does
ClarityBot takes any claim and runs it through a 5-step AI pipeline:
assertion extraction, web source retrieval, cross-referencing,
credibility scoring (1–10), and verdict labeling. Every step streams
live to a real-time dashboard terminal.

## How we built it
NemoClaw (NVIDIA, released March 16 2026): sandboxes the OpenClaw agent
with deny-all network policy via OpenShell.
OpenClaw: agent framework with 5 custom Python skills.
Nemotron 3 Super 120B: inference via build.nvidia.com.
Gemini API: claim extraction and cross-referencing.
FastAPI (Python): REST backend + Server-Sent Events for live streaming.
React + Vite + TypeScript + Tailwind: custom frontend.
Supabase: hosted Postgres for claims, logs, and trend data.

## Challenges we ran into
- Configuring NemoClaw's OpenShell policy to allow only necessary endpoints
- Syncing the SSE stream with the frontend's animated pipeline step UI
- Wrapping synchronous Supabase client calls in asyncio.to_thread()

## What we learned
NemoClaw was released 12 days before this hackathon. Learning its
blueprint lifecycle and sandbox policy system was the most technically
interesting part of the build.

## What's next
- Telegram bot via NemoClaw's built-in bridge
- Browser extension to check claims inline on social media
- Multi-language support

## Built with
NemoClaw, NVIDIA OpenShell, OpenClaw, Nemotron, Gemini API,
FastAPI, React, Vite, TypeScript, Tailwind, Supabase, SSE, Python
```

---

## Final verification checklist

Walk through every item before submitting on Devpost:

- [ ] git ls-files | grep .env returns nothing
- [ ] npm run tsc --noEmit exits 0 with no type errors
- [ ] bash start.sh starts both servers with no errors
- [ ] Submitting a claim shows all 5 steps animate in sequence
- [ ] Result card shows score badge + verdict pill + sources
- [ ] Agent Logs terminal shows live step output
- [ ] History page shows past claims with working filter
- [ ] Trend Report renders donut + bar charts
- [ ] StatusDot shows green "Backend online"
- [ ] Supabase dashboard shows rows in claims, logs, trends
- [ ] NemoClaw sandbox is running (nemoclaw status)
- [ ] claritybot.tech domain registered on mlh.io
- [ ] Demo video recorded and uploaded (YouTube unlisted)
- [ ] Devpost submitted to all 5 prize categories:
      Grand Prize / IST OpenClaw / MLH Gemini / Base44 Challenge / Best .tech Domain