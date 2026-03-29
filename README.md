# ClarityBot

**An AI-powered misinformation fact-checker built in 24 hours at HackPSU Spring 2026.**

You paste any claim, headline, or viral statement. ClarityBot breaks it down,
searches for primary sources, cross-checks the evidence, and returns a
credibility score from 1 to 10 — with a verdict, plain-English explanation,
and source links. Every step of that process streams live to the dashboard
as it happens.

---

## The problem it solves

Misinformation spreads faster than corrections. Fact-checking today requires
opening multiple browser tabs, searching manually, and judging source quality
yourself. ClarityBot compresses that process to about 15 seconds and makes
the reasoning transparent — you can see exactly how it reached its conclusion.

---

## Live demo

> Submit a claim → watch a 5-step AI pipeline fire in real time → see the score

![Pipeline animation showing 5 steps completing in sequence]
![Result card showing score 2/10, verdict FALSE, with sources]
![Agent logs terminal showing live step output]
![Trend report with donut and bar charts]

---

## What makes this technically interesting

### 1. It's not just "call an AI and show the answer"

Most AI demos are a single API call wrapped in a UI. ClarityBot runs a
structured 5-step pipeline where each step does something distinct:

```
① Extract       Break the claim into specific, checkable assertions
      ↓
② Search        Find 3–5 primary sources via Google Custom Search
      ↓
③ Cross-reference   Ask the AI: does the evidence support the claim?
      ↓
④ Score         Map the evidence strength to a 1–10 credibility score
      ↓
⑤ Save          Write the result to the database and close the stream
```

Each step is a separate module with a single responsibility. If the claim
is an opinion or satire rather than a factual statement, the pipeline
exits early at step 1 and returns "UNVERIFIED" — no wasted API calls.

### 2. Real-time streaming via Server-Sent Events

The dashboard doesn't poll or wait for a final result. As each pipeline
step completes, the backend pushes a log event to the frontend over a
persistent HTTP connection (Server-Sent Events). The UI animates each
step in sequence as the events arrive — the same way a terminal streams
build output.

This required building a lightweight event queue system where each
submitted claim gets its own isolated channel, so multiple claims running
simultaneously don't mix their logs.

### 3. NVIDIA NemoClaw sandbox (released 12 days before the hackathon)

This is the security layer — and the part that took the most research.

The AI agent runs inside a NemoClaw sandbox, which is NVIDIA's open-source
security runtime for AI agents, released on March 16, 2026 — 12 days
before this hackathon. The sandbox enforces a network policy at the
operating system level: the agent can only reach Gemini, Google Search,
and NVIDIA's inference endpoint. Everything else is blocked.

Why does this matter? A common attack against AI agents is "prompt injection"
— where a malicious input tricks the agent into doing something it shouldn't,
like sending your data to an attacker's server. With NemoClaw, that request
is blocked at the OS level before it leaves the process. The agent literally
cannot reach an unauthorized URL, regardless of what the LLM decides to do.

This is a meaningful security guarantee, not a prompt-level guardrail.

### 4. Source credibility weighting

Not all search results are equal. A NASA.gov page about the moon landing
carries more weight than a random blog post. ClarityBot maintains a
curated registry of trusted sources organized by topic — Space/NASA,
Vaccines/Health, and Historical facts — plus cross-topic fact-checkers
like Snopes and Reuters.

During cross-referencing, each source is labeled with its credibility
level (HIGH, MEDIUM, or LOW) directly in the prompt, so the AI weighs
authoritative sources more heavily. During scoring, if no high-credibility
sources were found, the score is automatically capped and the verdict
defaults to UNVERIFIED — preventing confident conclusions from
unreliable evidence.

### 5. The async database challenge

Supabase's Python client is synchronous — it blocks the thread while waiting
for a database response. FastAPI runs on an async event loop, which means a
blocking call freezes the entire server.

The fix: wrap every database call in `asyncio.to_thread()`, which moves the
blocking work to a thread pool and lets the event loop continue handling
other requests. Getting this right was the difference between a server that
handles one request at a time and one that handles concurrent requests properly.

---

## Tech stack

| Layer | Technology | What it does |
|-------|-----------|--------------|
| Frontend | React + Vite + TypeScript + Tailwind | 4-page dashboard |
| Backend | FastAPI (Python) | REST API + SSE stream |
| Agent framework | OpenClaw | Modular skill-based AI agent |
| Security sandbox | NemoClaw (NVIDIA) | Network policy enforcement |
| LLM inference | Nemotron 3 Super 120B | Runs via NVIDIA cloud |
| Claim analysis | Gemini API (Google) | Assertion extraction + cross-referencing |
| Web search | Google Custom Search | Primary source retrieval |
| Database | Supabase (Postgres) | Stores claims, logs, trends |
| Realtime | Server-Sent Events | Live log streaming to frontend |

---

## System architecture

```
┌─────────────────────────────────────────────────────┐
│              React Dashboard (port 5173)            │
│                                                     │
│  Check Claim │ History │ Trend Report │ Agent Logs  │
└──────────────────────┬──────────────────────────────┘
                       │  HTTP / Server-Sent Events
                       ▼
┌─────────────────────────────────────────────────────┐
│              FastAPI Backend (port 8000)            │
│                                                     │
│  POST /check   →  kick off pipeline, return ID      │
│  GET /results  →  fetch past claims from Supabase   │
│  GET /trends   →  weekly stats                      │
│  GET /logs/stream  →  SSE live log push             │
└──────────────────────┬──────────────────────────────┘
                       │  subprocess
                       ▼
┌─────────────────────────────────────────────────────┐
│       NemoClaw Sandbox (NVIDIA OpenShell)           │
│                                                     │
│  Network policy: deny all except Gemini + Search    │
│  Filesystem: isolated to /sandbox only              │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│          OpenClaw Agent — 5 Skills                  │
│                                                     │
│  extractor → searcher → crossref → scorer → emitter │
│                                                     │
│  Each skill emits a log event as it runs            │
└──────────────────────┬──────────────────────────────┘
                       │  reads / writes
                       ▼
┌─────────────────────────────────────────────────────┐
│                 Supabase (Postgres)                 │
│                                                     │
│  claims  │  logs  │  trends                         │
└─────────────────────────────────────────────────────┘
```

---

## Project structure

```
claritybot/
├── frontend/
│   └── src/
│       ├── api/client.ts        All API calls in one place
│       ├── pages/
│       │   ├── CheckClaim.tsx   Submit form + live pipeline UI
│       │   ├── History.tsx      Past fact-checks with search + filter
│       │   ├── TrendReport.tsx  Charts built in plain SVG
│       │   └── AgentLogs.tsx    Terminal-style live log panel
│       └── components/
│           ├── ScoreBadge.tsx   Circular 1–10 score indicator
│           ├── VerdictTag.tsx   FALSE / MISLEADING / UNVERIFIED / TRUE
│           ├── ResultCard.tsx   Full fact-check result display
│           └── LogLine.tsx      Single terminal log row
│
├── backend/
│   ├── main.py                  FastAPI server + all endpoints
│   ├── agent.py                 Pipeline orchestrator
│   ├── database.py              All Supabase reads/writes
│   ├── queue_manager.py         SSE event queue (one per claim)
│   └── skills/fact_check/
│       ├── extractor.py         Step 1
│       ├── searcher.py          Step 2
│       ├── crossref.py          Step 3 (with credibility labels)
│       ├── scorer.py            Step 4 (with source quality caps)
│       ├── emitter.py           Step 5
│       └── source_credibility.py  Trusted source registry
│
└── nemoclaw/
    ├── openclaw-sandbox.yaml    Network allowlist policy
    └── setup.sh                 Sandbox bootstrap
```

---

## Running it locally

**Prerequisites:** Python 3.11+, Node.js 18+, a NemoClaw-compatible system

**Step 1 — Get your API keys** (all have free tiers)

| Key | Where to get it |
|-----|----------------|
| Gemini API | aistudio.google.com |
| Google Custom Search | console.cloud.google.com |
| NVIDIA Nemotron | build.nvidia.com |
| Supabase URL + key | supabase.com |

**Step 2 — Set up Supabase**

Create a new project at supabase.com, then run this in the SQL editor:

```sql
create table claims (
  id text primary key, text text not null, score integer,
  verdict text, explanation text, sources text,
  created_at timestamptz default now()
);
create table logs (
  id bigserial primary key, claim_id text, step text,
  status text, message text, ts timestamptz default now()
);
create table trends (
  week text primary key, total integer default 0,
  false_pct real default 0, mislead_pct real default 0,
  unverified_pct real default 0, true_pct real default 0,
  avg_score real default 0
);
```

**Step 3 — Configure environment**

```bash
cp backend/.env.example backend/.env
# Fill in your API keys in backend/.env
```

**Step 4 — Start everything**

```bash
bash start.sh
```

Open http://localhost:5173 and submit a claim.

---

## How the fact-checking pipeline works

Here's a concrete example. Claim submitted: *"The Great Wall of China
is visible from space with the naked eye."*

**Step 1 — Extract**
Gemini reads the claim and identifies the core checkable assertion:
"The Great Wall of China is visible to the naked eye from space."
It classifies this as a factual claim (not an opinion or satire).

**Step 2 — Search**
The backend queries Google Custom Search for 3 sources about this
specific assertion. It collects titles, URLs, and snippet text from
NASA, Snopes, and a BBC article.

**Step 3 — Cross-reference**
Each source is labeled with its credibility level (HIGH, MEDIUM, or LOW)
based on a curated registry of trusted domains. Gemini is given the
original claim alongside the labeled source snippets and asked: does the
evidence support, partially support, not address, or contradict the claim?
HIGH sources (like NASA.gov) are weighted strongly; LOW sources are
discounted. In this case: "contradicts" — NASA astronauts have confirmed
the wall is too narrow to see from orbit.

**Step 4 — Score**
The source credibility summary is analyzed: since NASA.gov (a primary
authority) is among the sources, no score cap is applied. "Contradicts"
maps to the score range 1–3. Gemini picks score 2, assigns verdict
"FALSE", and writes a 2-sentence explanation. If only low-credibility
sources had been found, the score would be capped at 4 and the verdict
forced to UNVERIFIED.

**Step 5 — Save**
The result is written to Supabase. The frontend receives the final
SSE event and displays the ResultCard.

Total time: approximately 12–18 seconds.

---

## Dashboard pages

**Check Claim** — The main page. Large text input, submit button,
and an animated pipeline showing each of the 5 steps completing in
sequence. The result card slides up when the score is ready.

**History** — Every claim ever submitted, with filter pills
(All / FALSE / MISLEADING / UNVERIFIED / TRUE) and keyword search.
Each card expands to show the full fact-check on click.

**Trend Report** — A weekly summary built with hand-coded SVG charts
(no charting library). Shows a donut chart of verdict distribution and
a bar chart of daily claims over the past 7 days.

**Agent Logs** — A terminal-style panel that shows every log event
from the most recent pipeline run. Designed to make the technical
depth of the system visible during demos.

---

## Engineering decisions worth noting

**Why Server-Sent Events instead of WebSockets?**
SSE is unidirectional (server → client), which is all we need for
streaming logs. It works over standard HTTP, requires no additional
infrastructure, and reconnects automatically if the connection drops.
WebSockets would add complexity with no benefit for this use case.

**Why plain SVG for charts instead of a charting library?**
The charts on the Trend Report page are simple enough that a library
would add more code than it saves. The donut and bar charts are each
under 50 lines of SVG. No extra bundle size, no version conflicts,
and full control over the visual output.

**Why separate the 5 pipeline steps into individual files?**
Each skill has a single job, a predictable input/output shape, and
its own error handling. This makes the pipeline easy to test in
isolation — you can run just the scoring step with mock data without
needing a real PDF or API call. It also makes it easy to swap out
individual steps (e.g. replace Google Search with a different source).

**Why asyncio.to_thread() for database calls?**
The Supabase Python client is synchronous. Running it directly inside
an async FastAPI handler would freeze the server while waiting for the
database. Wrapping each call in `asyncio.to_thread()` moves the work
to a thread pool, keeping the async event loop free to handle other
incoming requests while the database query runs.

---

## What I'd do differently with more time

- **Move the pipeline to a task queue** — Right now the pipeline runs
  as a FastAPI background task. Under load, this would compete with
  the API server for resources. A proper implementation would use
  something like Celery to run pipelines as separate worker processes.

- **Add user accounts** — Currently anyone can submit claims and see
  everyone's history. Adding authentication would let each user see
  only their own history and build their own trend report.

- **Dynamic domain reputation** — Source credibility is now built in
  with a curated registry of trusted domains across 3 topics. A future
  version could score domain reputation dynamically using PageRank-style
  signals, citation frequency, and real-time trust indicators rather
  than a static allowlist.

- **Confidence calibration** — The credibility score is a single number
  from an LLM. A more rigorous approach would run multiple independent
  checks and average the results, flagging cases where the checks
  disagree strongly.

- **Telegram integration** — NemoClaw has a built-in Telegram bridge.
  With a few additional lines of configuration, users could submit
  claims and receive results directly in a Telegram chat — no browser
  required.

---

## Prizes targeted

Built for HackPSU Spring 2026 — Penn State's flagship hackathon.

- IST / OpenClaw Challenge — custom agent with 5 skills
- MLH Best Use of Gemini API — claim analysis and cross-referencing
- Base44 Challenge — addresses misinformation and social media impact
- Best .tech Domain — claritybot.tech
- Grand Prize — open track

---

## About

Built solo in 24 hours. HackPSU Spring 2026, Penn State ECoRE Building.

**Questions?** Open an issue or reach out directly.