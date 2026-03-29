# CLAUDE.md — ClarityBot

This file is the persistent context for every Claude Code session on this repo.
Read it fully before touching any file. It contains the product context,
architecture, coding standards, and conventions for every layer of the stack.

---

## What this product is

ClarityBot is an AI misinformation fact-checker built for HackPSU Spring 2026.

The core loop:
1. User pastes any claim, headline, or viral statement into the dashboard
2. A 5-step OpenClaw agent pipeline runs inside a NemoClaw sandbox
3. Each step streams live to the frontend via Server-Sent Events
4. The pipeline scores the claim 1–10 and assigns a verdict
5. Results, logs, and trend data are written to Supabase

The demo is the story. Every technical decision serves a live 3-minute
presentation moment. Reliability and visual coherence matter more than
feature completeness. When in doubt, ask: does this unblock the demo loop?

---

## Repo structure

```
claritybot/
├── frontend/                   React + Vite + TypeScript + Tailwind (port 5173)
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── package.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx             Router + sidebar layout + health polling
│       ├── api/
│       │   └── client.ts       ALL fetch() calls — never fetch() in components
│       ├── pages/
│       │   ├── CheckClaim.tsx  Submit form + live pipeline steps + result card
│       │   ├── History.tsx     Past fact-checks, filter pills, keyword search
│       │   ├── TrendReport.tsx Donut + bar charts (plain SVG, no libraries)
│       │   └── AgentLogs.tsx   Terminal panel, SSE stream
│       └── components/
│           ├── Sidebar.tsx
│           ├── ScoreBadge.tsx
│           ├── VerdictTag.tsx
│           ├── ResultCard.tsx
│           ├── LogLine.tsx
│           └── StatusDot.tsx
│
├── backend/                    FastAPI + Python (port 8000)
│   ├── main.py                 FastAPI app, all 4 routes, CORS, startup
│   ├── agent.py                Pipeline orchestrator — calls skills in order
│   ├── database.py             ALL Supabase reads/writes — nowhere else
│   ├── queue_manager.py        asyncio.Queue registry — one queue per claim_id
│   ├── skills/
│   │   └── fact_check/
│   │       ├── __init__.py
│   │       ├── extractor.py    Step 1: extract verifiable assertions
│   │       ├── searcher.py     Step 2: Serper web search (Google results)
│   │       ├── crossref.py     Step 3: Gemini cross-reference (with credibility labels)
│   │       ├── scorer.py       Step 4: score 1–10 + verdict label (with source quality caps)
│   │       ├── emitter.py      Step 5: write Supabase + close SSE queue
│   │       └── source_credibility.py  Trusted source registry + credibility scoring
│   ├── requirements.txt
│   ├── .env                    secrets — gitignored
│   ├── .env.example            committed with empty values
│   └── test_pipeline.py
│
├── nemoclaw/
│   ├── openclaw-sandbox.yaml   Network allowlist policy
│   └── setup.sh                One-command sandbox bootstrap
│
├── .gitignore
├── start.sh                    Starts backend + frontend together
└── README.md
```

---

## How to run

```bash
# Install backend deps
cd backend && pip install -r requirements.txt

# Install frontend deps
cd frontend && npm install

# Start everything
bash start.sh
```

- Backend:  http://localhost:8000
- Frontend: http://localhost:5173
- API docs: http://localhost:8000/docs

---

## Environment variables

All secrets live in `backend/.env` — gitignored. Never hardcode keys.
Always use `os.getenv()` in Python. Never commit `.env`.

```
GEMINI_API_KEY=
SERPER_API_KEY=
NVIDIA_API_KEY=
SUPABASE_URL=
SUPABASE_KEY=
```

`.env.example` is committed with empty values as a reference template.

---

## Backend conventions (FastAPI / Python)

### File responsibilities

| File | Responsibility |
|------|----------------|
| `main.py` | FastAPI app, all 4 routes, CORS middleware, startup event |
| `database.py` | Every Supabase read/write — no DB calls anywhere else |
| `agent.py` | Calls skills in order, catches exceptions, closes queue |
| `queue_manager.py` | SSE asyncio.Queue per claim — create, push, close, cleanup |
| `skills/fact_check/gemini.py` | Shared Gemini helper — retry with backoff, strip markdown fences |
| `skills/fact_check/extractor.py` | Parse claim into verifiable assertions via Gemini |
| `skills/fact_check/searcher.py` | Serper web search (Google results) — 3 assertions x 3 results |
| `skills/fact_check/crossref.py` | Gemini compares sources vs claim (with credibility labels) |
| `skills/fact_check/scorer.py` | Map support_level to score 1–10 + verdict label (with source quality caps) |
| `skills/fact_check/emitter.py` | Write Supabase, upsert trends, push done event |
| `skills/fact_check/source_credibility.py` | Trusted source registry + credibility scoring for 3 topic domains |

### Supabase client — critical rule

The Supabase Python client is synchronous. Always wrap calls in
asyncio.to_thread() to avoid blocking the FastAPI event loop.

```python
# CORRECT
result = await asyncio.to_thread(
    lambda: client.table("claims").select("*").execute()
)

# WRONG — blocks the event loop
result = client.table("claims").select("*").execute()
```

Never call client.table(...) directly inside an async function.

### Skill function signature

Every skill follows this exact pattern:

```python
async def skill_name(input_data, log_cb) -> dict:
    await log_cb("step_key", "running", "Human-readable start message")
    # ... do work ...
    await log_cb("step_key", "done", "Human-readable completion message")
    return result_dict
```

log_cb signature: async def log_cb(step: str, status: str, message: str)

Exception: scorer.py has an extended signature that also receives
the sources list for credibility analysis:
async def score(support_level, analysis, sources, log_cb) -> dict

### Log event format

Every event pushed to the SSE queue follows this shape:

```python
{
    "step":    str,   # extractor | searcher | crossref | scorer | emitter | error
    "status":  str,   # running | done | error | heartbeat
    "message": str,   # shown verbatim in the frontend terminal panel
    "ts":      str    # datetime.now(timezone.utc).isoformat()
}
```

### SSE queue — critical ordering rule

In POST /check, always call queue_manager.create(claim_id) BEFORE
background_tasks.add_task(run_pipeline, ...). If the pipeline starts before
the queue exists, the first log events are lost and never reach the frontend.

The pipeline's finally block must always call queue_manager.close(claim_id)
regardless of success or failure. None is the sentinel that terminates the stream.

### Gemini API calls

All Gemini calls go through the shared helper in
`skills/fact_check/gemini.py` which handles retries with exponential
backoff for 429 rate limits and strips markdown fences automatically.

Model: `gemini-2.5-flash` via the REST endpoint (not the Python SDK):

```python
from .gemini import call_gemini

text = await call_gemini(prompt)
data = json.loads(text)
```

The helper uses this URL pattern:
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
```

### Error handling

- Each skill raises on failure — do not swallow exceptions inside skills
- agent.py catches all exceptions at the pipeline level
- On exception: call log_cb("error", "error", str(e)), update claim in
  Supabase with verdict="ERROR", then finally: queue_manager.close(claim_id)
- Never return partial results from a skill — either the full dict or raise

### Source credibility filter

The pipeline includes a source credibility filter tuned for 3 domains:
Space/NASA, Vaccines/Health, and Historical facts. The filter lives in
`skills/fact_check/source_credibility.py` and is used by crossref.py
and scorer.py.

How it works:
- `get_credibility(url)` returns `(level, topic)` where level is
  high/medium/low and topic is space/health/history/general/unknown
- `summarize_source_credibility(sources)` returns aggregate counts
  and a `credibility_note` string used in the Gemini scoring prompt

Credibility levels:
  high:   primary authority (nasa.gov, cdc.gov, who.int), dedicated
          fact-checker (snopes.com, factcheck.org), or major wire
          service (reuters.com, apnews.com)
  medium: .gov or .edu domain not in the primary list, or secondary
          sources like wikipedia.org, healthline.com
  low:    domain not in the trusted list and not .gov/.edu

Score adjustments in scorer.py:
- Primary authority found (nasa.gov, cdc.gov, etc.): no cap
- No high or medium sources: score capped at 4, verdict forced to UNVERIFIED
- No high sources but some medium: score capped at 6

crossref.py labels each source in the Gemini prompt with
[CREDIBILITY: HIGH/MEDIUM/LOW | DOMAIN: example.com] so the
model can weight evidence by source quality.

### CORS

Backend allows only http://localhost:5173. Do not change this to *.

---

## Frontend conventions (React / TypeScript / Tailwind)

### File responsibilities

| File | Responsibility |
|------|----------------|
| `src/api/client.ts` | ALL fetch() and EventSource calls — never in components |
| `src/App.tsx` | Router, sidebar layout, 10s health check polling |
| `src/pages/CheckClaim.tsx` | Input form, animated pipeline steps, result reveal |
| `src/pages/History.tsx` | Claim list, filter pills, keyword search |
| `src/pages/TrendReport.tsx` | Donut + bar charts in plain SVG |
| `src/pages/AgentLogs.tsx` | Terminal panel, SSE stream from localStorage claim_id |

### API client rules

- All backend calls go through src/api/client.ts
- Never call fetch() or new EventSource() directly in a page or component
- All methods are async and typed with interfaces from the same file
- api.streamLogs() returns an EventSource — always close it in cleanup

### Pipeline step key mapping

CheckClaim.tsx maps SSE log events to UI step rows by the step field.
These keys must match exactly what the backend emits — do not rename either side:

```
extractor → searcher → crossref → scorer → emitter
```

After the SSE stream ends, poll api.getResult(claim_id) every 1 second
(max 20 attempts) until score !== null before rendering the ResultCard.

### localStorage handoff

When CheckClaim.tsx submits a claim, store the claim_id in
localStorage("lastClaimId"). AgentLogs.tsx reads this on mount to connect
to the correct SSE stream. This is the only cross-page state mechanism.

### Color scheme — do not deviate

```
Background:      #111111  →  bg-[#111111]
Card:            #1a1a1a  →  bg-gray-900
Terminal:        #0a0a0a  →  bg-gray-950
Border:          #2a2a2a  →  border-gray-800
Primary text:    #e5e5e5  →  text-gray-100
Muted text:      #9ca3af  →  text-gray-400
Accent:          #00FF88  →  text-green-400 / border-green-400 / bg-green-600

Score badge:
  1–3  → bg-red-500
  4–6  → bg-amber-500
  7–10 → bg-green-500
  null → bg-gray-600

Verdict pill:
  FALSE      → bg-red-900    text-red-300
  MISLEADING → bg-amber-900  text-amber-300
  UNVERIFIED → bg-gray-700   text-gray-300
  TRUE       → bg-green-900  text-green-300
  ERROR      → bg-red-900    text-red-300
```

### Charts in TrendReport

Use plain SVG — do not install recharts, chart.js, or any charting library.
The donut chart and bar chart are hand-coded SVG elements only.

### Tailwind conventions

- Dark background: bg-[#111111] (bracket notation — not a Tailwind default)
- Cards: bg-gray-900 rounded-xl border border-gray-800 p-6
- Primary button: bg-green-600 hover:bg-green-500 text-white font-semibold py-3 px-6 rounded-lg
- Inputs: bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-100 focus:border-green-500 focus:outline-none
- Logs panel: font-mono text-sm

---

## Database schema (Supabase — tables already created via SQL editor)

```
claims  (id text PK, text text, score int, verdict text,
         explanation text, sources text, created_at timestamptz)

logs    (id bigserial PK, claim_id text, step text,
         status text, message text, ts timestamptz)

trends  (week text PK, total int, false_pct real,
         mislead_pct real, unverified_pct real,
         true_pct real, avg_score real)
```

sources is stored as a JSON string. Always json.dumps() before writing
and json.loads() after reading. Never store a raw Python list.

trends.week uses ISO week format: datetime.now().strftime("%Y-W%V")

---

## Demo critical path

The minimum viable demo loop is:

```
Submit claim → Pipeline steps animate live → Result card appears
→ Agent Logs show terminal output → History shows past checks
→ Trend Report shows charts → Supabase dashboard shows live DB writes
```

If any link in this chain is broken, the demo fails. Protect this path
above all else. When in doubt about what to build next, ask: does this
unblock the demo loop?

---

## NemoClaw sandbox

NemoClaw is NVIDIA's OpenShell-based security runtime for OpenClaw agents,
released March 16 2026. The policy file is nemoclaw/openclaw-sandbox.yaml.

Allowlisted hosts (deny everything else by default):
  generativelanguage.googleapis.com
  google.serper.dev
  build.nvidia.com

To start the sandbox: bash nemoclaw/setup.sh

The sandbox is the security story for judges. Frame it as:
"Every network call the agent makes is governed by an OpenShell policy.
A prompt injection attack cannot exfiltrate data to unauthorized endpoints."

Note: The search provider was changed from Google Custom Search JSON API
(which was discontinued for new customers) to Serper.dev, which returns
Google search results via a simple REST API.

---

## Git conventions

```
feat: add trend report page
fix: handle null score in ResultCard
chore: update requirements.txt
refactor: extract score mapping to scorer.py
```

Never commit .env. Never commit node_modules/ or __pycache__/.
Run git status before every commit and verify the file list.