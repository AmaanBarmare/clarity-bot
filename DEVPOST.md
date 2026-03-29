# ClarityBot — AI Misinformation Fact-Checker

## Inspiration

Misinformation spreads faster than corrections. We wanted to make
fact-checking as easy as submitting a form — paste any claim, get a
scored verdict with sources in seconds.

## What it does

ClarityBot takes any claim and runs it through a 5-step AI pipeline:
assertion extraction, web source retrieval, cross-referencing with
credibility labels, credibility scoring (1–10), and verdict labeling.
Every step streams live to a real-time dashboard terminal via
Server-Sent Events, so users can watch the agent think.

## How we built it

- **NemoClaw** (NVIDIA, released March 16 2026): sandboxes the OpenClaw
  agent with a deny-all network policy via OpenShell. Every outbound
  call is governed — a prompt injection attack cannot exfiltrate data.
- **OpenClaw**: agent framework with 5 custom Python skills
  (extractor, searcher, crossref, scorer, emitter).
- **Gemini 2.5 Flash**: claim extraction, cross-referencing, and scoring
  via the REST API with retry + backoff for rate limits.
- **Serper.dev**: Google search results for source retrieval — 3
  assertions × 3 results, deduplicated by URL.
- **Source credibility filter**: trusted-source registry covering
  Space/NASA, Vaccines/Health, and Historical facts. Scores are capped
  based on source quality (primary authority → no cap, no high sources
  → capped at 6, only low sources → capped at 4).
- **FastAPI** (Python): REST backend + Server-Sent Events for live
  streaming. All Supabase calls wrapped in `asyncio.to_thread()` to
  avoid blocking the event loop.
- **React + Vite + TypeScript + Tailwind**: custom dark-mode frontend
  with animated pipeline steps, donut/bar charts (plain SVG, no
  charting libraries), and a terminal-style agent logs panel.
- **Supabase**: hosted Postgres for claims, logs, and trend data.

## Challenges we ran into

- Configuring NemoClaw's OpenShell policy to allow only necessary
  endpoints while blocking everything else by default.
- Syncing the SSE stream with the frontend's animated pipeline step UI
  — the queue must be created before the background task starts, or
  the first events are lost.
- Wrapping synchronous Supabase client calls in `asyncio.to_thread()`
  to prevent blocking the FastAPI event loop.
- Tuning the source credibility filter so that scores accurately
  reflect evidence quality across different topic domains.

## Accomplishments we're proud of

- The live pipeline animation: watching 5 steps light up in real time
  while the agent searches, cross-references, and scores.
- The source credibility system: not all sources are equal, and our
  scoring reflects that with hard caps based on evidence quality.
- The NemoClaw sandbox: a real security story, not just a checkbox.

## What we learned

NemoClaw was released 12 days before this hackathon. Learning its
blueprint lifecycle and sandbox policy system was the most technically
interesting part of the build. We also learned how powerful SSE is for
real-time agent observability — no WebSocket complexity needed.

## What's next

- Telegram bot via NemoClaw's built-in bridge
- Browser extension to check claims inline on social media
- Multi-language support for non-English claims
- Batch checking mode for journalists processing multiple claims

## Built with

NemoClaw, NVIDIA OpenShell, OpenClaw, Nemotron, Gemini API,
FastAPI, React, Vite, TypeScript, Tailwind CSS, Supabase, SSE, Python
