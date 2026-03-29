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
│   ├── index.html              Google Fonts (Inter + JetBrains Mono), title "ClarityBot"
│   ├── vite.config.ts          Tailwind plugin + /api proxy to backend
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
│   ├── main.py                 FastAPI app, APIRouter(/api), 7 routes, CORS, startup
│   ├── agent.py                Pipeline orchestrator — calls skills in order
│   ├── database.py             ALL Supabase reads/writes — nowhere else
│   ├── queue_manager.py        asyncio.Queue registry — one queue per claim_id
│   ├── skills/
│   │   └── fact_check/
│   │       ├── __init__.py
│   │       ├── gemini.py       Shared Gemini helper — retry with backoff
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
├── index.py                    Vercel FastAPI entrypoint — loads backend/main.py
├── pyproject.toml              Python project metadata for Vercel builder
├── requirements.txt            Root-level pip deps (same as backend/) for Vercel
├── vercel.json                 Vercel config — framework:fastapi, SPA rewrites
├── scripts/
│   └── vercel-build.sh         Builds frontend into public/ for Vercel CDN
├── .vercelignore               Controls Vercel upload (allows public/)
├── .gitignore
├── start.sh                    Starts backend + frontend together (local dev)
└── README.md
```

---

## How to run (local dev)

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

The Vite dev server proxies `/api` requests to `http://127.0.0.1:8000`,
so frontend and backend share the same origin during local development.

## Vercel deployment

The app is deployed as a single Vercel project at:
**https://clarity-bot-brown.vercel.app**

Vercel runs the FastAPI app from `index.py` at the repo root, which
loads `backend/main.py`. The frontend is pre-built into `public/` and
served by Vercel's CDN. All API routes live under `/api/...`.

### How it works on Vercel

- `index.py` adds `backend/` to `sys.path` and imports `app` from
  `backend/main.py`. Vercel's `@vercel/python` builder uses this as
  the entrypoint.
- `vercel.json` sets `framework: "fastapi"`, SPA rewrites
  (`/(.*) → /index.html`), and a redirect for `/` → `/index.html`.
- `scripts/vercel-build.sh` builds the Vite frontend into `public/`.
  Run this locally before `npx vercel --prod` since `.gitignore`
  excludes `public/` and `.vercelignore` allows it.
- Function timeout must be set to **300 seconds** (Pro plan) in the
  Vercel dashboard under Settings → Functions → Max Duration.

### Deploy commands

```bash
# Build frontend into public/
bash scripts/vercel-build.sh

# Deploy to production
npx vercel --prod
```

### Environment variables on Vercel

Set these in the Vercel dashboard (Settings → Environment Variables)
for Production, Preview, and Development:

```
GEMINI_API_KEY
SERPER_API_KEY
SUPABASE_URL
SUPABASE_KEY
```

CORS is automatically configured: the backend reads `VERCEL_URL` and
`VERCEL_BRANCH_URL` (injected by Vercel) and adds them as allowed
origins alongside `ALLOWED_ORIGINS` (optional, comma-separated).

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
| `main.py` | FastAPI app, APIRouter(`/api`), 7 routes, dynamic CORS, startup, optional StaticFiles for `public/` |
| `database.py` | Every Supabase read/write — no DB calls anywhere else |
| `agent.py` | Calls skills in order, catches exceptions, closes queue |
| `queue_manager.py` | SSE asyncio.Queue per claim — create, push, close, cleanup (used locally; Vercel uses DB-backed SSE) |
| `skills/fact_check/gemini.py` | Shared Gemini helper — retry with backoff, strip markdown fences |
| `skills/fact_check/extractor.py` | Parse claim into verifiable assertions via Gemini |
| `skills/fact_check/searcher.py` | Serper web search (Google results) — 3 assertions x 3 results |
| `skills/fact_check/crossref.py` | Gemini compares sources vs claim (with credibility labels) |
| `skills/fact_check/scorer.py` | Map support_level to score 1–10 + verdict label (with source quality caps) |
| `skills/fact_check/emitter.py` | Write Supabase, upsert trends, push done event |
| `skills/fact_check/source_credibility.py` | Trusted source registry + credibility scoring for 3 topic domains |

### Backend routes

All routes are mounted under the `/api` prefix via `APIRouter(prefix="/api")`:

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | GET | Health check — returns `{"status": "ok"}` |
| `/api/check` | POST | Submit claim (insert only, returns `claim_id`) |
| `/api/execute/{claim_id}` | POST | Run the full pipeline synchronously (for Vercel serverless) |
| `/api/results` | GET | All claims from Supabase, ordered by date |
| `/api/results/{claim_id}` | GET | Single claim or 404 |
| `/api/trends` | GET | Latest week trend data |
| `/api/logs/stream` | GET | SSE stream — polls Supabase for logs (DB-backed, serverless-safe) |
| `/api/logs/{claim_id}` | GET | Historical logs for a claim (REST endpoint) |

The split between `POST /api/check` and `POST /api/execute/{claim_id}`
exists because Vercel's serverless functions cannot use `BackgroundTasks`
(no shared memory between invocations). The frontend calls `check` first,
then starts the SSE stream, then calls `execute` to run the pipeline.

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

### SSE streaming — DB-backed (serverless-safe)

The SSE endpoint (`GET /api/logs/stream`) polls Supabase for new logs
instead of reading from an in-memory queue. This works on both local dev
and Vercel's stateless serverless functions.

The stream polls `database.get_logs(claim_id)` every ~450ms, yielding
new log entries as SSE events with `event: log`. It terminates when:
- The `emitter` step emits `status: done`
- An `error` step appears
- The claim's `score` field is non-null in the DB
- 900 seconds elapse (hard timeout)

Heartbeat events (`event: heartbeat`) are sent every 25 seconds to
keep the connection alive.

The `queue_manager` is still used locally by `agent.py` to push events,
but the SSE endpoint does not read from it — it always reads from the DB.
This means SSE works both for live claims and for historical playback.

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
  high:   primary authority (nasa.gov, cdc.gov, who.int, nejm.org),
          dedicated fact-checker (snopes.com, factcheck.org), or major
          wire service (reuters.com, apnews.com)
  medium: .gov or .edu domain not in the primary list, or secondary
          sources like mayoclinic.org, space.com, bbc.com
  low:    domain not in the trusted list and not .gov/.edu, OR any
          domain on the LOW_CREDIBILITY_DOMAINS blocklist

Explicitly blocked (always LOW regardless of other rules):
  reddit.com, facebook.com, twitter.com/x.com, youtube.com,
  tiktok.com, instagram.com, quora.com, medium.com,
  wikipedia.org, wikihow.com, blogspot.com, wordpress.com

agent.py calls filter_credible_sources() after the search step to
remove low-credibility sources before crossref and scoring. If ALL
sources are low-credibility, they are kept but labelled LOW so the
score is capped at 4 / UNVERIFIED.

Score adjustments in scorer.py:
- Primary authority found (nasa.gov, cdc.gov, etc.): no cap
- No high or medium sources: score capped at 4, verdict forced to UNVERIFIED
- No high sources but some medium: score capped at 6

crossref.py labels each source in the Gemini prompt with
[CREDIBILITY: HIGH/MEDIUM/LOW | DOMAIN: example.com] so the
model can weight evidence by source quality.

### CORS

Backend CORS origins are determined dynamically:
- Default: `http://localhost:5173`, `http://127.0.0.1:5173`
- `ALLOWED_ORIGINS` env var: comma-separated list of additional origins
- `VERCEL_URL` and `VERCEL_BRANCH_URL`: auto-added as `https://` origins
  when running on Vercel (these env vars are injected by Vercel)

Do not set CORS to `*` (allow all origins). For custom domains, add
them to `ALLOWED_ORIGINS` in the Vercel dashboard.

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
- BASE URL defaults to `/api` (relative) — works both locally (Vite proxy)
  and on Vercel (same origin). Override with `VITE_API_BASE` env var.
- `api.executePipeline(claimId)` runs the pipeline synchronously via
  `POST /api/execute/{claim_id}` — needed for Vercel serverless
- `api.getLogs(claimId)` fetches historical logs via `GET /api/logs/{claim_id}`

### Pipeline step key mapping

CheckClaim.tsx maps SSE log events to UI step rows by the step field.
These keys must match exactly what the backend emits — do not rename either side:

```
extractor → searcher → crossref → scorer → emitter
```

After starting the SSE stream, CheckClaim.tsx calls api.executePipeline()
to run the pipeline. The SSE stream displays step progress as it arrives.
After the stream ends, poll api.getResult(claim_id) every 1 second
(max 180 attempts / 3 minutes) until score !== null before rendering
the ResultCard. EventSource is cleaned up on component unmount.

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
Google search results via a simple REST API. The Serper API key is set
in `SERPER_API_KEY` and the endpoint is `https://google.serper.dev/search`.

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