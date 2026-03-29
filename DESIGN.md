# DESIGN.md — ClarityBot

Visual and UX specification for the ClarityBot dashboard.
Every component decision in this file is final. Do not deviate without
updating this document first.

---

## 1. Product overview

ClarityBot is a desktop-first single-page application used primarily
during live hackathon demos. The primary user is a judge watching a
3-minute presentation, and secondarily a developer interacting with
the dashboard on a laptop.

Design goals in priority order:
1. The live pipeline animation must be visually striking and clear
2. Verdict + score must be readable at a glance from 3 feet away
3. The terminal log panel must feel technical and authentic
4. Everything must load fast with no flicker or layout shift

---

## 2. Design principles

### Technical credibility over consumer polish
This is a developer tool, not a consumer app. The aesthetic should
communicate sophistication and precision — not friendliness. Think
security operations center, not social media app.

### Animation serves communication, not decoration
Every animation communicates state. Pipeline steps animate in as they
become active. The score badge scales in when a result arrives. Logs
stream in line by line. There are no decorative animations.

### Dark by default, always
The entire UI is dark-themed. There is no light mode. There are no
white backgrounds anywhere. This is both a design choice and a
practical one — it makes the terminal panel feel authentic.

### Clarity beats completeness
In 24 hours, every component must work reliably. A polished, working
3-page app beats a broken 6-page app. If a feature is uncertain,
cut it before the demo. Never leave a broken or empty state visible
during the demo loop.

---

## 3. Color system

```
Background (page):     #111111
Surface (cards):       #1a1a1a   →  bg-gray-900
Terminal surface:      #0a0a0a   →  bg-gray-950
Border:                #2a2a2a   →  border-gray-800
Subtle border:         #1f1f1f   →  border-gray-900

Primary text:          #e5e5e5   →  text-gray-100
Secondary text:        #9ca3af   →  text-gray-400
Muted text:            #6b7280   →  text-gray-500
Disabled text:         #4b5563   →  text-gray-600

Accent (green):        #00FF88   →  use text-green-400 / bg-green-600
Accent hover:          #00cc6e   →  hover:bg-green-500

Score badge colors:
  1–3  (false):        #ef4444   →  bg-red-500
  4–6  (uncertain):    #f59e0b   →  bg-amber-500
  7–10 (true):         #10b981   →  bg-green-500
  null (loading):      #4b5563   →  bg-gray-600

Verdict pill colors:
  FALSE:               bg-red-900    text-red-300
  MISLEADING:          bg-amber-900  text-amber-300
  UNVERIFIED:          bg-gray-700   text-gray-300
  TRUE:                bg-green-900  text-green-300
  ERROR:               bg-red-900    text-red-300

Log line colors:
  status=done:         #4ade80   →  text-green-400
  status=running:      #fbbf24   →  text-amber-400
  status=error:        #f87171   →  text-red-400

StatusDot colors:
  online:              #4ade80   →  text-green-400
  offline:             #f87171   →  text-red-400
```

No purple anywhere. No gradients. No glassmorphism. No shadows.
Flat, dark, precise.

---

## 4. Typography

```
Font stack:
  Primary:    'Inter', system-ui, sans-serif
  Monospace:  font-mono (Tailwind default — Menlo, Monaco, Consolas)

Sizes (Tailwind):
  Page heading h1:     text-2xl font-bold     (24px)
  Section heading:     text-lg font-semibold  (18px)
  Body:                text-base              (16px)
  Secondary / muted:   text-sm                (14px)
  Terminal / logs:     text-sm font-mono      (14px)
  Metadata / badges:   text-xs                (12px)

Weights:
  Regular: font-normal (400)
  Medium:  font-medium (500)
  Bold:    font-bold   (700) — headings only

Line heights:
  Body text:       leading-relaxed (1.625)
  Terminal lines:  leading-none    (1.0)
  Card content:    leading-normal  (1.5)
```

---

## 5. Layout

### App shell

```
┌────────────────────────────────────────────────────┐
│  SIDEBAR (fixed left, 224px / w-56)                │
│                                                    │
│  bg-gray-950, border-r border-gray-800, h-screen   │
│                                                    │
│  Top:   "ClarityBot" logo in green monospace       │
│  Mid:   Nav links (Check Claim / History /         │
│          Trend Report / Agent Logs)                │
│  Bot:   StatusDot                                  │
├────────────────────────────────────────────────────┤
│  MAIN CONTENT (flex-1, overflow-y-auto, ml-56)     │
│                                                    │
│  bg-[#111111]                                      │
│  Each page uses max-w-2xl or max-w-3xl mx-auto     │
│  with pt-12 px-4 for consistent breathing room     │
└────────────────────────────────────────────────────┘
```

### Sidebar nav items

Active state: `border-l-2 border-green-400 bg-gray-900 text-white`
Inactive state: `text-gray-400 hover:text-white hover:bg-gray-900`
All items: `px-4 py-3 flex items-center gap-3 text-sm transition-colors`

---

## 6. Component specifications

### ScoreBadge

- Circular, 64px diameter (w-16 h-16)
- Centered score number, text-xl font-bold text-white
- Color based on score: red / amber / green (see color system)
- null state: gray background + small animate-spin border-2 border-gray-400 rounded-full w-6 h-6
- Animate in on mount: scale from 0.5 to 1.0 over 300ms ease-out

```tsx
// Size and color in Tailwind
<div className={`w-16 h-16 rounded-full flex items-center justify-center
                 text-xl font-bold text-white ${colorClass}`}>
  {score}
</div>
```

### VerdictTag

- Pill shape: px-3 py-1 rounded-full text-sm font-medium
- Color based on verdict value (see color system)
- null state: gray pill with spinner + "Checking..." text

### ResultCard

- Container: `bg-gray-900 rounded-xl border border-gray-800 p-6`
- Top row: flex items-start gap-4
  - ScoreBadge (left)
  - VerdictTag + claim timestamp (middle, stacked)
- Claim text: italic text-gray-300 text-sm mt-3
  - Truncate at 120 chars with "Show more" toggle
- Explanation: text-gray-200 text-sm leading-relaxed mt-3
- Sources section: mt-4
  - "Sources" label: text-xs text-gray-500 uppercase tracking-wide mb-2
  - Each source: anchor tag, text-green-400 text-sm hover:underline
    Truncate title at 60 chars. Open in new tab.
- Share button: text-gray-500 text-xs hover:text-gray-300 mt-3

### LogLine

- Container: `py-0.5 font-mono text-sm`
- Format: `[HH:MM:SS]` + step name + message
- Color class applied to the entire line based on status
- Animate in: opacity-0 to opacity-100 transition-opacity duration-200
- Running lines: show a spinner character before the message (use animate-spin on a small span)

### Pipeline steps (in CheckClaim.tsx)

5 step rows rendered vertically. Each row shows:
- Step number (circle, small, gray by default)
- Step label text
- Status icon (right-aligned): spinner / checkmark / X

States:
```
waiting:  step circle bg-gray-700, label text-gray-500, no icon
running:  step circle bg-amber-500, label text-white,   spinner icon (amber)
done:     step circle bg-green-500, label text-white,   checkmark icon (green)
error:    step circle bg-red-500,   label text-red-300, X icon (red)
```

The row for the currently active step should have a subtle
left border accent: border-l-2 border-amber-500 pl-3

### Terminal panel (AgentLogs.tsx)

- Container: `bg-gray-950 rounded-xl border border-gray-800 p-4`
- Min height: min-h-64, max height: max-h-96, overflow-y-auto
- Header bar: flex justify-between items-center mb-3
  - Left: `claritybot@agent:~$` in text-green-400 font-mono text-sm
    - When active: blinking cursor after the prompt
      ```css
      @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      .cursor::after { content: '▋'; animation: blink 1s infinite; }
      ```
  - Right: "Clear" button in text-gray-500 hover:text-white text-xs
- Log area: flex flex-col gap-0.5
- Auto-scroll: useEffect on logs.length triggers scrollIntoView on last element
- Empty state: text-gray-600 font-mono text-sm "Waiting for claim submission..."

---

## 7. Page specifications

### Check Claim page

Max width: max-w-2xl
Padding: pt-12 px-4

Structure:
1. Heading: "Check a Claim" text-2xl font-bold text-white mb-2
2. Subtitle: text-gray-400 text-sm mb-6
   "Paste any claim, headline, or viral statement."
3. Textarea:
   - 4 rows, w-full, resize-none
   - bg-gray-900 border border-gray-700 rounded-lg p-4
   - text-gray-100 placeholder-gray-600
   - focus:border-green-500 focus:outline-none focus:ring-0
   - placeholder: "e.g. The Eiffel Tower is located in London."
   - disabled during isChecking
4. Submit button: mt-4 w-full bg-green-600 hover:bg-green-500
   text-white font-semibold py-3 rounded-lg
   Disabled state: opacity-50 cursor-not-allowed
   Loading text: "Checking..."
5. Error message (if any): text-red-400 text-sm mt-2
6. Pipeline steps section: mt-8 space-y-2
   Only visible once isChecking is true or result exists
7. ResultCard: mt-8, slide up animation on appear

Slide-up animation for ResultCard:
```css
@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### History page

Max width: max-w-3xl
Padding: pt-12 px-4

Structure:
1. Heading: "History" + claim count badge in text-gray-500
2. Controls row:
   - Search input: w-full or flex-1, same styling as textarea
   - Filter pills: flex gap-2, each pill is a button
     All / FALSE / MISLEADING / UNVERIFIED / TRUE
     Active pill: bg-green-600 text-white
     Inactive pill: bg-gray-800 text-gray-400 hover:bg-gray-700
3. Claim list: space-y-3 mt-6
   Each item is a ResultCard (collapsed by default)
   "Collapsed" means: show only top row (badge + tag + date + claim preview)
   Click anywhere on the card to expand to full ResultCard
4. Loading skeleton: 3 animated pulse bars while fetching
5. Empty state: centered, text-gray-500, "No claims checked yet."
   With a link "→ Check your first claim" routing to /

### Trend Report page

Max width: max-w-3xl
Padding: pt-12 px-4

Structure:
1. Heading: "Trend Report"
2. Stats row: 3 metric cards in flex gap-4
   Each card: bg-gray-900 rounded-xl border border-gray-800 p-4
   - Total claims: large number text-2xl font-bold + "claims checked" label
   - Average score: large number in color (red/amber/green) + "avg score" label
   - Most common verdict: VerdictTag component + "most common" label

3. Donut chart (plain SVG, no libraries):
   - viewBox="0 0 200 200", centered circle r=80
   - 4 arc segments, one per verdict, proportional to percentage
   - Colors: red / amber / gray (#6b7280) / green
   - Center text: total count (white, large)
   - Legend below: row of colored squares + label + percentage

4. Bar chart (plain SVG, no libraries):
   - viewBox="0 0 400 160"
   - X axis: last 7 days, formatted as "Mon" / "Tue" etc.
   - Y axis: count of claims per day
   - Bars: green (#10b981), rounded tops rx=2
   - If no data for a day: bar height 0 (flat line)

5. Empty state: "Check some claims to see trends."

### Agent Logs page

Max width: max-w-3xl
Padding: pt-12 px-4

Structure:
1. Heading: "Agent logs" in font-mono text-green-400
2. Subtitle: "Live pipeline output from the NemoClaw sandbox" text-gray-500 text-sm
3. Terminal panel component (full width)
4. No other elements on this page

---

## 8. Interaction patterns

### Auto-scroll in terminal

When a new log line is added, scroll the terminal container to the bottom.
Use a ref on the last log line element and call scrollIntoView.
Do this via useEffect on logs.length.

### SSE stream lifecycle

1. User submits claim
2. Frontend calls api.submitClaim() → gets claim_id
3. Frontend calls api.streamLogs() → opens EventSource
4. Events arrive and update pipeline step UI
5. When emitter+done event arrives: close EventSource, start polling
6. Poll api.getResult() every 1s until score !== null
7. Render ResultCard with slide-up animation
8. Store claim_id in localStorage for AgentLogs page

### Error states

Every page must handle:
- Backend offline: show StatusDot red + "Backend offline" message where relevant
- Fetch failure: show inline error with retry button
- Pipeline error (verdict="ERROR"): show ResultCard with red ERROR badge
  and "An error occurred during verification" message

Never show a blank page or a raw JavaScript error to the user.

---

## 9. Animation reference

```css
/* Result card slide up */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Score badge scale in */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.5); }
  to   { opacity: 1; transform: scale(1); }
}

/* Log line fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Terminal cursor blink */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
```

Add these to frontend/src/index.css alongside the Tailwind directives.

---

## 10. Anti-patterns to avoid

- No white or light backgrounds anywhere in the UI
- No border-radius larger than rounded-xl (12px) on cards
- No box shadows — use borders instead
- No gradient fills on any element
- No purple, pink, or teal colors
- No loading spinners that replace content — use inline spinners only
- No modal dialogs — use inline states and error messages
- No pagination — all lists scroll in place
- No toast notifications stacked in a corner — use inline feedback
- Do not install recharts, chart.js, d3, or any charting library
- Do not use CSS modules — Tailwind utility classes only
- Do not use inline styles except for dynamic values (e.g. bar chart heights)