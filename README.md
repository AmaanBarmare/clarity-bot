# ClarityBot — Live AI Fact-Checking Pipeline

![React](https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python_3-F7DF1E?style=flat&logo=python&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-4285F4?style=flat&logo=google&logoColor=white)
![NVIDIA](https://img.shields.io/badge/NVIDIA_Nemotron-76B900?style=flat&logo=nvidia&logoColor=white)
![OpenClaw](https://img.shields.io/badge/OpenClaw-skill--based_agent-8B5CF6?style=flat)

Paste any headline, viral post, or “friend said…” claim. ClarityBot runs an **OpenClaw-style, five-skill agent pipeline**: break the claim into checkable assertions, pull web evidence (Google results via Serper), cross-reference with an LLM that sees **per-source credibility labels**, score 1–10 with **hard caps when evidence is weak**, then persist everything to Postgres. **Every stage streams to the UI** over Server-Sent Events so a demo audience watches the agent “think” in real time—not a single spinner that hides 30 seconds of work.

Built for **HackPSU Spring 2026** as a misinformation / media-literacy demo: the product story is transparency (show the steps), not a black-box score.

> **Live:** [clarity-bot-brown.vercel.app](https://clarity-bot-brown.vercel.app)

---

## Table of Contents

- [Problem & Motivation](#problem--motivation)
- [What This Is (and Is Not)](#what-this-is-and-is-not)
- [OpenClaw, Nemotron & Gemini](#openclaw-nemotron--gemini)
- [Key Design Decisions](#key-design-decisions)
- [Features](#features)
- [Architecture](#architecture)
- [End-to-End Request Flow](#end-to-end-request-flow)
- [The Five Skills](#the-five-skills)
- [Problems I Hit Building This](#problems-i-hit-building-this)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Deployment (Vercel)](#deployment-vercel)
- [Security: NemoClaw Sandbox](#security-nemoclaw-sandbox)
- [Roadmap](#roadmap)
- [License](#license)

---

## Problem & Motivation

Fact-checking in the wild is slow and uneven. You open tabs, skim SEO sludge, guess whether a domain is trustworthy, and still walk away unsure. Meanwhile, “AI fact checkers” often collapse into **one prompt, one answer**—fast, but useless for teaching *why* a conclusion was reached.

ClarityBot optimizes for **inspectability under time pressure** (a hackathon demo, a recruiter screen, a classroom):

1. **Structured decomposition** — Not every string is a factual claim. The first stage classifies and extracts assertions; opinions and non-factual content exit early with an explicit UNVERIFIED path (no wasted search spend).
2. **Evidence-first** — Search happens *before* the model free-associates, so the cross-reference step is grounded in URLs and snippets the user can open.
3. **Source hygiene encoded in code** — Domains are scored (high / medium / low) with an explicit blocklist for UGC and low-trust patterns. That metadata is injected into the cross-reference prompt *and* fed into scoring caps so the model cannot “sound confident” on Reddit threads alone.

The emotional goal: make **epistemic humility** a first-class outcome—capped scores and UNVERIFIED verdicts when the evidence does not support strong claims.

---

## What This Is (and Is Not)

| It is | It isn’t |
|--------|-----------|
| A **pipeline** of small, testable steps with shared logging | A single mega-prompt that returns `{ score, verdict }` |
| A **live SSE** narrative of those steps (DB-backed, serverless-safe) | A WebSocket chat app |
| A **credibility-aware** scorer with deterministic guardrails | A naive “trust whatever the LLM says” wrapper |
| A **Vercel + FastAPI** deployment with a pre-built SPA in `public/` | A long-lived always-on worker with in-memory job queues |

The orchestration lives in plain **async Python** (`backend/agent.py`) calling discrete modules under `skills/fact_check/`—the same **skill graph** you would wire in **OpenClaw**: each step is a named capability with a single job, shared logging, and explicit handoff to the next skill.

---

## OpenClaw, Nemotron & Gemini

### Why OpenClaw

Fact-checking is not a single completion—it is a **chain of decisions** (what is checkable?, what did the web say?, does evidence support the claim?, how confident can we be?, what do we store?). **OpenClaw** is built around that idea: an **agent as a graph of skills**, not one prompt that does everything.

I used that shape on purpose:

- **Composability** — Swap search, swap the scorer prompt, or add a “human review” skill without rewriting a monolith.
- **Observable demos** — Each skill emits logs; the UI can show *which* step failed instead of a generic error.
- **Alignment with hackathon tracks** — IST / OpenClaw-style challenges reward explicit agent design, not a thin wrapper around `chat.completions`.

ClarityBot implements the same **five-skill contract** OpenClaw expects: `extractor → searcher → crossref → scorer → emitter`, orchestrated in `agent.py`.

### Why Nemotron to run OpenClaw (inside NemoClaw)

When you run the agent **inside NemoClaw** (NVIDIA’s OpenShell sandbox), egress is **deny-by-default**. The only LLM egress hole I carved for “our” stack—besides Gemini, which I also allow for flexibility—is **`build.nvidia.com`**, i.e. **Nemotron** inference on NVIDIA Build.

**Nemotron is the natural LLM for the OpenClaw path in that sandbox:**

1. **Same trust story as the sandbox** — NemoClaw is an NVIDIA runtime; Nemotron is served from **NVIDIA Build**. For judges and security reviewers, “agent + policy + inference” stays on **one vendor surface** instead of sending every weighty reasoning call to a random endpoint you would have to justify in the policy file.
2. **Agent-scale reasoning** — Multi-step fact-checking needs the model to hold **assertions, snippets, credibility tags, and scoring rules** in head at once. Nemotron families are aimed at **long-context, tool-style workloads**—exactly the profile of cross-reference + scoring after search, not just a one-line classification.
3. **Policy-meets-code** — `nemoclaw/openclaw-sandbox.yaml` allowlists `build.nvidia.com` **because** the OpenClaw-shaped pipeline is supposed to call home there when running in the sandbox. The README, the policy file, and the demo narrative stay in sync: *this* is the endpoint the secured agent is allowed to use for NVIDIA-side inference.
4. **Defense in depth** — Even if prompt injection nudges the agent, **NemoClaw** still cannot open arbitrary URLs; Nemotron traffic goes only to the allowlisted host. OpenClaw defines *what* runs; Nemotron + NemoClaw define *where* heavy inference is allowed to go.

So: **OpenClaw** = structure of the agent; **Nemotron** = the LLM I pair with that structure when I want **sandboxed, NVIDIA-native execution** with a straight line from policy → `build.nvidia.com`.

### Why Gemini (and how it fits)

The **public** app on Vercel runs the **same five skills** but calls **Gemini 2.5 Flash** over REST (`skills/fact_check/gemini.py`): fast, cost-effective, excellent at **structured JSON** (extracted assertions, support labels, scores), and trivial to wire for a short hackathon window.

**Gemini vs Nemotron is not “pick one and delete the other”—it’s two deployment faces of the same pipeline:**

| Context | Inference | Role |
|--------|-----------|------|
| **NemoClaw + OpenClaw demo** | **Nemotron** (NVIDIA Build) | Secured agent runtime; policy-aligned egress; strong narrative for NVIDIA / OpenClaw tracks |
| **Hosted demo (`vercel.app`)** | **Gemini 2.5 Flash** | Low-latency, serverless-friendly HTTP; retries for 429s; what this repo implements for `extract` / `crossref` / `score` today |

Search (**Serper**) is shared: both paths still ground the model in **Google organic results** before synthesis—evidence-first, regardless of which LLM tokenizes the reasoning.

Set `NVIDIA_API_KEY` in `backend/.env` (see `.env.example`) when you wire Nemotron on Build; the sandbox policy is already prepared for that traffic.

---

## Key Design Decisions

### 1. Split `POST /api/check` and `POST /api/execute/{claim_id}`

On a traditional server, you might enqueue work after insert and return immediately. **Vercel serverless functions do not share memory** between invocations—`BackgroundTasks` in FastAPI does not give you a durable worker the way a process model does on your laptop.

So the contract is deliberate:

- **`check`** — Insert the row, return `claim_id`.
- **Client** — Open the SSE stream, *then* call **`execute`** so logs have somewhere to land while the function runs.
- **`execute`** — Runs the full pipeline **synchronously** inside one invocation (bounded by Vercel max duration).

This looks a little odd in OpenAPI; it is the shape you get when **the platform’s execution model**, not aesthetics, drives the API.

### 2. SSE That Polls Postgres Instead of an In-Memory Queue

Local development originally wanted an `asyncio.Queue` per `claim_id`. That breaks the moment traffic hits a different lambda instance than the one doing the work.

The stream endpoint (`GET /api/logs/stream`) **polls Supabase on a ~450ms cadence**, diffs what it has already sent, emits `event: log` for new rows, sends **heartbeats every 25s** to survive proxies, and stops on terminal conditions (`emitter` done, `error` step, score populated, or a 900s safety cap).

Tradeoff: slightly higher read load and latency than a push queue. Win: **identical semantics** for live runs *and* historical replay—same code path.

### 3. `asyncio.to_thread()` for Every Supabase Call

The official Supabase Python client is **synchronous**. Awaiting it directly inside `async def` handlers would block the event loop and serialize your API under concurrency.

Every `client.table(...)` interaction goes through `asyncio.to_thread(...)`. That one discipline is the difference between “works on my machine with one user” and “does not stall health checks when a claim is heavy.”

### 4. Source Credibility as Data, Not Vibes

`source_credibility.py` centralizes:

- Topic-aware **high-trust** domains (space / health / history plus major wires and fact-checkers).
- **Medium** for many `.gov` / `.edu` and serious secondary outlets.
- **Low** for unknowns—and an explicit **blocklist** (social platforms, Wikipedia for this use case, generic blogs, etc.).

After search, **`filter_credible_sources`** can drop noise before cross-reference. If *everything* is low-trust, sources are retained but the scorer **caps the score** (and forces UNVERIFIED when appropriate) so garbage-in does not become confident-out.

### 5. Gemini via REST + Honest Retry Policy (hosted path)

For the Vercel-facing pipeline, `skills/fact_check/gemini.py` calls `gemini-2.5-flash` over HTTP with **429 backoff** (exponential sleeps, capped attempts) and strips markdown fences before `json.loads`. See [OpenClaw, Nemotron & Gemini](#openclaw-nemotron--gemini) for why Gemini here vs Nemotron in NemoClaw.

### 6. Serper Instead of Legacy Google Programmatic Search

Google’s **Custom Search JSON API** is not a viable default for new projects (availability / onboarding). Serper returns **Google organic results** over a simple REST shape, which matches what you want for “what a human would see on Google” without running a browser farm.

---

## Features

| Surface | What you get |
|--------|----------------|
| **Check Claim** | Large input, animated 5-step rail driven by SSE log events, result card when `score` is non-null |
| **History** | All claims from Supabase, verdict filters, keyword search |
| **Trend Report** | Weekly verdict mix + activity—**hand-written SVG** (no charting deps) |
| **Agent Logs** | Terminal aesthetic; reads `lastClaimId` from `localStorage` for continuity after navigation |
| **Health** | Lightweight polling from the shell layout |

Frontend rule worth stealing: **all `fetch` and `EventSource` live in `src/api/client.ts`**—pages stay declarative.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  React + Vite + TypeScript + Tailwind (localhost:5173 / CDN)       │
│  CheckClaim · History · TrendReport · AgentLogs                     │
│       │                                                             │
│       │  REST + SSE  (Vite proxies /api → FastAPI in dev)            │
└───────┼─────────────────────────────────────────────────────────────┘
        ▼
┌────────────────────────────────────────────────────────────────────┐
│  FastAPI (`backend/main.py`, routes under `/api`)                   │
│  · POST /check          insert claim                                │
│  · POST /execute/{id}   run pipeline (sync in one invocation)       │
│  · GET  /results, /trends                                           │
│  · GET  /logs/stream    SSE (poll Supabase)                         │
│  · GET  /logs/{id}      REST log fetch                              │
└───────┬───────────────────────────────┬────────────────────────────┘
        │                               │
        ▼                               ▼
┌─────────────────────────────┐ ┌────────────────────────────────────┐
│  Skill graph (OpenClaw)      │ │  Supabase Postgres                  │
│  · Serper (search) — always  │ │  claims · logs · trends             │
│  · LLM: Gemini (Vercel path) │ │                                     │
│    or Nemotron in NemoClaw   │ │                                     │
└─────────────────────────────┘ └────────────────────────────────────┘
```

---

## End-to-End Request Flow

```
User submits claim
      │
      ▼
POST /api/check ──► row in `claims` (score null), claim_id returned
      │
      ├──► EventSource GET /api/logs/stream?claim_id=…
      │         └── poll loop yields log rows as SSE until done / error / score set
      │
      └──► POST /api/execute/{claim_id} ──► run_pipeline(...)
                │
                ├── extractor   (Gemini: assertions + claim type)
                ├── [early exit if not factual → UNVERIFIED, score 5]
                ├── searcher    (Serper: organic results)
                ├── filter_credible_sources
                ├── crossref    (Gemini: support vs evidence, with credibility tags)
                ├── scorer      (Gemini: 1–10 + verdict, caps by source tier)
                └── emitter     (persist claim + upsert trends + final log)
      │
      ▼
Frontend polls GET /api/results/{id} until score !== null (backup to SSE completion)
```

**Ordering matters:** if you called `execute` before subscribing to SSE, you could miss the first log lines in a fast stage. The UI opens the stream first, then kicks off execution.

---

## The Five Skills

| Step | Module | Responsibility |
|------|--------|----------------|
| 1 | `extractor.py` | Classify claim type; extract up to N checkable assertions (JSON to Gemini) |
| 2 | `searcher.py` | Query Serper per assertion; dedupe URLs; collect title/url/snippet |
| — | `source_credibility.py` | Filter / label domains; aggregate counts for prompts |
| 3 | `crossref.py` | Compare evidence to original claim with **[CREDIBILITY | DOMAIN]** prefixes |
| 4 | `scorer.py` | Map support level → score + verdict; enforce caps when tiers are missing |
| 5 | `emitter.py` | Write final claim row, trend upsert, completion log |

Shared helper: `gemini.py` (retry, fence stripping) for the **Gemini**-backed hosted pipeline—the same prompts and JSON contracts can target **Nemotron** when the agent runs under **OpenClaw inside NemoClaw** (see [OpenClaw, Nemotron & Gemini](#openclaw-nemotron--gemini)). Logging contract: every skill calls `log_cb(step, status, message)` so the UI keys off stable `step` names: `extractor`, `searcher`, `crossref`, `scorer`, `emitter`, `error`.

---

## Problems I Hit Building This

These are **real integration failures**, not a generic “challenges” list—each one forced a concrete change in code or architecture.

### 1. “Background work” on serverless is a lie (for this stack)

**Symptom:** Everything worked locally with the mental model “insert claim, fire background job, return.” On Vercel, the “background” never reliably shared state with the next HTTP request.

**Lesson:** The platform does not owe you a process. If you need multi-step work, either **finish inside one invocation** (what we do—up to timeout), or **externalize** with a queue / workflow product you actually wire up.

**Fix:** Split **create** vs **execute**, and accept that `execute` is long-running HTTP from the client’s perspective.

### 2. In-memory SSE queues and lambda instances don’t mix

**Symptom:** Logs would “sometimes” never show in production, or stream from the wrong memory space.

**Lesson:** Anything that assumes **sticky server memory** dies on autoscaling serverless.

**Fix:** Make the SSE endpoint a **thin poller over Postgres**—the pipeline already writes logs row-by-row; the stream just tails the table. Same code handles **live** and **replay**.

### 3. Blocking DB client vs async FastAPI

**Symptom:** Under parallel requests, latency spikes looked like “Gemini is slow” when often the event loop was **blocked on Supabase**.

**Lesson:** Sync I/O inside `async def` is a silent performance bug.

**Fix:** Wrap Supabase calls in `asyncio.to_thread` consistently (`database.py`).

### 4. Search API churn (Google Custom Search → Serper)

**Symptom:** Original plan assumed a Google API that **new projects cannot adopt** the same way. Docs and stack-overflow answers go stale fast.

**Lesson:** For hackathons, **prefer APIs you can sign up for in five minutes** with predictable JSON.

**Fix:** Serper as the search back end; simple `httpx` POST with `X-API-KEY`.

### 5. Serving the Vite build from the same FastAPI app on Vercel

**Symptom:** `public/` might not land beside the Python entrypoint depending on upload ignores and builder output paths—users hit API routes but got 404 on `/`.

**Lesson:** Static asset location on PaaS is **path resolution**, not `npm run build` alone.

**Fix:** `_resolve_public_dir()` tries `backend/static`, `/vercel/path0/public`, repo `public/`—first match with `index.html` + `assets/` wins (`main.py`). Document the `scripts/vercel-build.sh` contract so production stays reproducible.

### 6. Rate limits are part of the architecture

**Symptom:** Burst demos → HTTP 429 from Gemini.

**Lesson:** Retries with backoff are **required**, not polish.

**Fix:** Exponential backoff in `gemini.py`; keep prompts structured so failures are easy to distinguish from model refusals.

### 7. Frontend / backend coupling on step names

**Symptom:** Rename a step in Python and the UI rail silently stops updating.

**Lesson:** Treat `step` strings as **protocol**, not internal labels.

**Fix:** Single source of truth documented in both places; `CheckClaim.tsx` maps `extractor → … → emitter` to match the backend exactly.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Agent shape | **OpenClaw** (skill-based pipeline) | Five explicit skills, observable steps, matches competition / “real agent” expectations—not one black-box completion |
| LLM (sandbox path) | **Nemotron** via **NVIDIA Build** (`build.nvidia.com`) | Pairs with **NemoClaw**: policy allowlist, long-context agent workloads, single-vendor security story for OpenClaw-in-sandbox demos |
| LLM (hosted path) | **Gemini 2.5 Flash** (REST) | Fast structured JSON, 429 backoff in code, ideal for serverless latency and hackathon iteration |
| UI | React + Vite + TypeScript + Tailwind | Fast iteration, strict types, demo-grade styling |
| API | FastAPI | Async-native, OpenAPI for free, Python for ML/LLM glue |
| Streaming | `sse-starlette` | SSE over HTTP—no socket server |
| Search | Serper.dev | Google results JSON without legacy Search API friction |
| Data | Supabase (Postgres) | Hosted DB + simple client; logs as events table |
| Deploy | Vercel | Single project: FastAPI entry (`index.py`) + static SPA |
| Hardening | **NemoClaw** + `openclaw-sandbox.yaml` | Default-deny egress; Gemini, Serper, NVIDIA Build explicitly allowed |

---

## Database Schema

```sql
-- claims: one row per user submission; sources stored as JSON string
claims (
  id text PK,
  text text,
  score int,
  verdict text,
  explanation text,
  sources text,
  created_at timestamptz
)

logs (
  id bigserial PK,
  claim_id text,
  step text,
  status text,
  message text,
  ts timestamptz
)

trends (
  week text PK,       -- e.g. ISO week format from app logic
  total int,
  false_pct real,
  mislead_pct real,
  unverified_pct real,
  true_pct real,
  avg_score real
)
```

---

## Project Structure

```
claritybot/
├── frontend/
│   └── src/
│       ├── api/client.ts       # all HTTP + EventSource
│       ├── pages/              # CheckClaim, History, TrendReport, AgentLogs
│       └── components/         # ScoreBadge, VerdictTag, ResultCard, …
├── backend/
│   ├── main.py                 # FastAPI app, SSE loop, static resolution
│   ├── agent.py                # orchestrates skills + error handling
│   ├── database.py             # Supabase I/O (async-wrapped)
│   ├── queue_manager.py        # local/dev helper; production path is DB SSE
│   └── skills/fact_check/      # extractor, searcher, crossref, scorer, emitter
├── nemoclaw/
│   ├── openclaw-sandbox.yaml   # network allowlist policy
│   └── setup.sh
├── index.py                    # Vercel entry → imports backend app
├── scripts/vercel-build.sh     # build frontend → public/
├── vercel.json
└── requirements.txt            # root deps for Vercel builder
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Supabase project + API keys
- Gemini + Serper API keys

### Install & run locally

```bash
cd backend && pip install -r requirements.txt
cd ../frontend && npm install
cd .. && bash start.sh
```

- Frontend: http://localhost:5173  
- API: http://localhost:8000/docs  

### Environment (`backend/.env`)

Copy from `backend/.env.example` and set:

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Gemini REST (hosted / Vercel path) |
| `NVIDIA_API_KEY` | NVIDIA Build — **Nemotron** when running the OpenClaw pipeline in sandbox |
| `SERPER_API_KEY` | Web search |
| `SUPABASE_URL` / `SUPABASE_KEY` | Persistence |
| `ALLOWED_ORIGINS` | Optional extra CORS origins (comma-separated) |

---

## Deployment (Vercel)

Production URL: **https://clarity-bot-brown.vercel.app**

```bash
bash scripts/vercel-build.sh   # produces public/
npx vercel --prod
```

Set `GEMINI_API_KEY`, `SERPER_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY` in the Vercel dashboard. CORS picks up `VERCEL_URL` / `VERCEL_BRANCH_URL` automatically alongside `ALLOWED_ORIGINS`.

**Function timeout:** configure **300s** max duration for `/api/execute/*` class workloads (paid plan).

---

## Security: NemoClaw Sandbox

`nemoclaw/openclaw-sandbox.yaml` defines a **deny-by-default network policy** for running the **OpenClaw** skill pipeline under **NemoClaw** (NVIDIA OpenShell). Allowlisted egress is intentional and minimal:

- **`generativelanguage.googleapis.com`** — Gemini (same skills can run here in the sandbox if you point calls at Gemini).
- **`google.serper.dev`** — evidence retrieval (Google organic results).
- **`build.nvidia.com`** — **Nemotron** inference on NVIDIA Build—the LLM endpoint aligned with [why Nemotron drives the OpenClaw path](#why-nemotron-to-run-openclaw-inside-nemoclaw) when you execute inside this sandbox.

This is the **defense-in-depth** story for judges: **OpenClaw** decides the steps; **NemoClaw** caps where those steps may connect; **Nemotron** (or Gemini, per your wiring) stays on an allowlisted host only. Operational note: a plain `bash start.sh` dev loop may not route through NemoClaw unless you intentionally use `nemoclaw/setup.sh`—read the policy before claiming production guarantees.

---

## Roadmap

- [x] Five-skill pipeline with early exit for non-factual claims
- [x] DB-backed SSE + split check/execute for serverless
- [x] Source credibility registry + scorer caps
- [x] Trend aggregation + SVG charts without chart libraries
- [ ] Per-user auth and private claim history
- [ ] Queue-based execution (true async) when timeouts become the bottleneck
- [ ] Evaluation harness with labeled claims (calibration, not vibes)

---

## License

MIT
