# DESIGN.md — ClarityBot

Visual and UX specification for the ClarityBot dashboard.
This document supersedes all previous design decisions.
Every component decision here is final.

---

## 1. The visual direction

The current UI is functional but flat. The new direction is:

"Intelligence Terminal" — the aesthetic of a real-time monitoring
system used by analysts. Think Bloomberg Terminal meets a modern
cybersecurity dashboard. Dark, precise, with moments of vivid color
that communicate meaning. Non-technical people should feel like they
are watching something intelligent happen in real time.

The three things that make non-tech people stop and look:
1. The score badge revealing with a glowing animated ring
2. The pipeline steps lighting up in sequence like a circuit board
3. The terminal logs streaming in with color-coded output

Every visual decision below serves one of those three moments.

---

## 2. Color system

### Base palette

```
Page background:        #0a0a0f   (near-black with a slight blue tint)
Surface primary:        #12121a   (cards, panels)
Surface elevated:       #1a1a26   (hover states, active items)
Surface terminal:       #080810   (agent logs panel only)
Border default:         #1e1e2e
Border subtle:          #16161f
Border highlight:       #2a2a3d   (hover, focus)
```

### Text

```
Text primary:           #f0f0ff   (cool white — more elegant than warm white)
Text secondary:         #8888aa
Text muted:             #555570
Text disabled:          #333348
```

### Accent — the green

Use sparingly so it has impact when it appears.

```
Accent:                 #00ff88
Accent dim:             #00cc6a
Accent glow (subtle):   box-shadow: 0 0 12px rgba(0, 255, 136, 0.4)
Accent glow (strong):   box-shadow: 0 0 20px rgba(0, 255, 136, 0.6),
                                    0 0 40px rgba(0, 255, 136, 0.2)
```

In Tailwind: text-green-400 and bg-green-500.
For glow: inline style with the box-shadow values above.

### Verdict colors — make these vivid

These are the most visible colors in the UI. They need presence.

```
FALSE:
  card border-l:     #ef4444
  card bg:           #1a0505
  card glow:         box-shadow: 0 0 0 1px #7f1d1d,
                                 0 0 12px rgba(239, 68, 68, 0.15)
  pill bg:           #450a0a
  pill text:         #fca5a5
  pill border:       #7f1d1d

MISLEADING:
  card border-l:     #f59e0b
  card bg:           #1a0f00
  card glow:         box-shadow: 0 0 0 1px #78350f,
                                 0 0 12px rgba(245, 158, 11, 0.15)
  pill bg:           #431407
  pill text:         #fcd34d
  pill border:       #78350f

UNVERIFIED:
  card border-l:     #6366f1
  card bg:           #111118
  card glow:         box-shadow: 0 0 0 1px #3730a3
  pill bg:           #1e1e2e
  pill text:         #a5b4fc
  pill border:       #3730a3

TRUE:
  card border-l:     #22c55e
  card bg:           #001a0a
  card glow:         box-shadow: 0 0 0 1px #14532d,
                                 0 0 12px rgba(34, 197, 94, 0.15)
  pill bg:           #052e16
  pill text:         #86efac
  pill border:       #166534
```

### Score badge ring colors

```
1–3  (FALSE):      stroke #ef4444  glow rgba(239, 68, 68, 0.5)    text #fca5a5
4–6  (UNCERTAIN):  stroke #f59e0b  glow rgba(245, 158, 11, 0.5)   text #fcd34d
7–10 (TRUE):       stroke #22c55e  glow rgba(34, 197, 94, 0.5)    text #86efac
null (loading):    stroke #2d2d40  glow none                       text #555570
```

### Log line colors — color-coded by step name

```
Timestamp:          #333348   (very muted — don't compete)
Step label:
  [extractor]:      #818cf8   (indigo)
  [searcher]:       #22d3ee   (cyan)
  [crossref]:       #a78bfa   (violet)
  [scorer]:         #fbbf24   (amber)
  [emitter]:        #00ff88   (green)
  [error]:          #f87171   (red)
Message done:       #d0d0e8   (bright)
Message running:    #8888aa   (muted — not finished yet)
Message error:      #fca5a5
```

---

## 3. Typography

Install JetBrains Mono via Google Fonts. Add to index.html:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

```
Logo / brand:     JetBrains Mono, semibold
Headings:         Inter, bold (700)
Body:             Inter, regular (400)
Terminal / data:  JetBrains Mono, regular (400)
Score number:     JetBrains Mono, bold (700)
Section labels:   JetBrains Mono, semibold, uppercase, tracked
```

Sizes (Tailwind):
```
Page heading h1:  text-3xl font-bold           (30px)
Section label:    text-[10px] uppercase tracking-[0.2em] font-mono font-semibold
Body:             text-sm (14px)
Terminal:         text-sm font-mono
Metadata:         text-xs font-mono            (12px)
Score in ring:    text-2xl font-bold font-mono
Logo:             text-xl font-semibold font-mono
```

---

## 4. Layout

### App shell

```
Sidebar: fixed left, w-56 (224px)
  bg-[#0a0a0f]
  border-r border-[#1e1e2e]
  h-screen, flex flex-col

Main content: flex-1, overflow-y-auto, ml-56
  bg-[#0a0a0f]
```

### Sidebar — refined

```
Top section: pt-6 px-5 pb-5 border-b border-[#1e1e2e]
  "ClarityBot" — JetBrains Mono text-xl font-semibold text-[#00ff88]
  "AI Fact-Checker" — text-xs text-[#555570] mt-0.5

Section label: px-5 mt-6 mb-2
  "NAVIGATION" in text-[10px] uppercase tracking-[0.2em]
  font-mono font-semibold text-[#333348]

Nav items: flex flex-col gap-0.5 px-3

Bottom: mt-auto pb-6 px-5
  StatusDot component
```

### Sidebar nav items — with lucide icons

Install: npm install lucide-react

Icons per page:
  Check Claim:   <Search size={14} />
  History:       <Clock size={14} />
  Trend Report:  <BarChart2 size={14} />
  Agent Logs:    <Terminal size={14} />

Item layout:
```tsx
<NavLink to="/" className={({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
   transition-all duration-150 font-medium
   border-l-2
   ${isActive
     ? 'text-white bg-[#1a1a26] border-[#00ff88]'
     : 'text-[#8888aa] hover:text-white hover:bg-[#12121a] border-transparent'
   }`
}>
  <Search size={14} />
  Check Claim
</NavLink>
```

The border-l-2 is always present (transparent when inactive) to
prevent layout shift when the active border appears.

---

## 5. Component specifications

### ScoreBadge — the centerpiece

The current badge is a flat colored circle. The new badge is a
circular SVG progress ring with a glow that appears on reveal.
This is the moment non-tech people point at.

Structure: 80px × 80px (w-20 h-20) outer container, relative

SVG ring specs:
- viewBox="0 0 80 80"
- Background ring: cx=40 cy=40 r=34, stroke="#1e1e2e", strokeWidth=5,
  fill="none"
- Progress ring: same cx/cy/r, fill="none"
  strokeWidth=5
  strokeLinecap="round"
  strokeDasharray="213.6"   (circumference: 2 × π × 34 ≈ 213.6)
  strokeDashoffset: (1 - score/10) × 213.6
  stroke: ring color from color system
  style: transition strokeDashoffset 800ms cubic-bezier(0.4,0,0.2,1)
  transform: rotate(-90deg), transformOrigin: center
  (starts fill from the top, not the right)

Center content: absolute inset-0 flex items-center justify-center
  Score number: text-2xl font-bold font-mono, color from color system
  Fade in after 400ms delay (opacity transition)

Outer glow: applied to the SVG container div via inline style
  box-shadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColorDim}`
  Fade in at 600ms after score arrives (add a class after timeout)

Loading/null state:
  Show a partial spinning arc instead of a full ring
  strokeDasharray="53 160"
  CSS animation: ringSpinner 1.2s linear infinite

Entry animation on score reveal:
  1. Ring offset animates (800ms)
  2. Number fades in (delay 400ms)
  3. Glow fades in (delay 600ms)
  This staggered reveal is the visual payoff.

### VerdictTag

```
Base: px-3 py-1 rounded-md text-sm font-semibold font-mono uppercase
      tracking-wide border

Each verdict: pill bg + text + border from color system

null state: bg-[#1e1e2e] text-[#555570] border-[#2d2d40]
  Animated dots: cycle "checking." "checking.." "checking..."
  Use setInterval cycling through 3 strings, 400ms interval

ERROR: same as FALSE styling
```

### ResultCard — verdict-aware

The card should feel specific to its verdict, not generic.

```
Container:
  bg: verdict card bg color (e.g. #1a0505 for FALSE)
  rounded-xl
  border border-[#1e1e2e]
  border-l-4: verdict card border-l color (e.g. #ef4444 for FALSE)
  p-6
  box-shadow: verdict card glow
  transition-all duration-300

  Entry animation: cardReveal 400ms forwards

Layout:

Row 1 — flex items-center gap-5
  ScoreBadge w-20 h-20
  flex-1:
    VerdictTag
    timestamp: text-xs font-mono text-[#555570] mt-1.5
    claim preview (if collapsed in History)

Divider: mt-4 border-t border-[#1e1e2e] border-opacity-50

Row 2 — mt-4
  claim text: text-sm italic text-[#8888aa] leading-relaxed
  "Show more" toggle: text-[10px] font-mono text-[#00ff88] ml-2
    (inline — not on its own line)

Row 3 — mt-3
  explanation: text-sm text-[#d0d0e8] leading-relaxed
  (This is the key output — brightest text in the card after the score)

Row 4 — mt-4
  "SOURCES" label: text-[10px] uppercase tracking-[0.2em]
    font-mono text-[#555570] mb-2
  Each source link: flex items-center gap-1.5 py-0.5
    <ExternalLink size={11} className="text-[#555570] flex-shrink-0" />
    <a> text-sm text-[#00ff88] hover:text-white transition-colors
    Truncate title at 55 chars

Row 5 — mt-3
  "↗ share result" text-xs font-mono text-[#555570]
    hover:text-[#8888aa] transition-colors cursor-pointer
  "✓ copied" state: text-[#00ff88]
```

### Pipeline steps — connected timeline

This replaces the current flat rows.

```
Container: relative pl-10 mt-8 space-y-0

Vertical rail:
  position: absolute, left-[19px], top-5, bottom-5, w-px
  background: #1e1e2e
  The segment behind completed steps turns green: use a separate
  div that grows its height as steps complete, colored #00ff88 with
  opacity 0.3, transition height 400ms ease

Each step row: relative flex items-start gap-4 pb-7 last:pb-0

Step circle (on the rail):
  position: absolute, left-[-19px], top-0.5
  w-8 h-8 rounded-full flex items-center justify-center
  border-2, font-mono text-xs font-bold
  transition-all duration-300

  waiting:  border-[#2d2d40] bg-[#12121a]  text-[#555570]  no glow
  running:  border-[#f59e0b] bg-[#1a0f00]  text-[#fbbf24]
            box-shadow: 0 0 10px rgba(245,158,11,0.5)
            use animate-pulse on the glow (not the element — add
            a pseudo ring that pulses via a wrapper div)
  done:     border-[#22c55e] bg-[#001a0a]  text-[#86efac]
            box-shadow: 0 0 8px rgba(34,197,94,0.4)
            Show <Check size={14} /> instead of the number
  error:    border-[#ef4444] bg-[#1a0505]  text-[#fca5a5]
            Show <X size={14} /> instead of the number

Step content (right of circle): flex-1

  Step label: text-sm font-medium transition-colors
    waiting:  text-[#555570]
    running:  text-white font-semibold
    done:     text-[#555570]     (de-emphasize completed steps)
    error:    text-[#fca5a5]

  Step sublabel: text-xs font-mono text-[#555570] mt-0.5 min-h-[16px]
    Shows the actual message from the SSE log event
    e.g. "Found 4 sources" or "Support level: strong"
    Fade in when the message arrives (opacity 0 → 1, 200ms)
    This makes the pipeline feel transparent and intelligent
    Empty string when step is waiting

  Running step accent: add transition-all to step content wrapper
    When running: border-l border-[#f59e0b] pl-3 (subtle left accent)
```

### LogLine — color-coded terminal output

```
Container: flex items-start gap-2 py-0.5
  animation: logIn 150ms ease forwards on mount

Timestamp: text-[#333348] font-mono text-sm flex-shrink-0 w-[70px]
  "[12:56:14]"

Step label: font-mono text-sm flex-shrink-0 w-[84px]
  Color by step name (see color system section above)
  "[extractor]" "[searcher]" etc.

Status indicator: flex-shrink-0 w-4
  running: small animate-spin element
    w-3 h-3 border border-current rounded-full border-t-transparent
    color: same as step label color
  done: nothing (space preserved)
  error: nothing

Message: flex-1 font-mono text-sm
  done:    text-[#d0d0e8]
  running: text-[#8888aa]
  error:   text-[#fca5a5]
```

### StatusDot

```
Online: flex items-center gap-2 text-[10px] font-mono text-[#555570]
  Dot wrapper: relative w-2 h-2
    Inner dot: absolute inset-0 rounded-full bg-[#00ff88]
    Ping ring: absolute inset-0 rounded-full bg-[#00ff88]
               animate-ping opacity-75
  Text: "ONLINE" uppercase tracking-wider

Offline: no ping animation
  Dot: w-2 h-2 rounded-full bg-[#f87171]
  Text: "OFFLINE" text-[#f87171] uppercase tracking-wider
```

---

## 6. Page specifications

### Check Claim page

```
Max width: max-w-2xl
Padding:   pt-16 px-6 pb-24

1. Hero section — new, adds context for non-tech viewers
   "CLARITYBOT" — text-[10px] font-mono uppercase tracking-[0.3em]
                   text-[#00ff88] mb-4
   "Check any claim." — text-3xl font-bold text-white leading-tight
   Subtitle: text-sm text-[#8888aa] mt-2 leading-relaxed max-w-md
   "Paste a headline, rumor, or viral statement.
    Our AI searches primary sources and scores its credibility in seconds."

   Horizontal rule: border-t border-[#1e1e2e] my-8

2. Textarea — updated placeholder
   Rows: 4, w-full, resize-none, rounded-xl
   bg-[#12121a] border border-[#1e1e2e]
   text-[#f0f0ff] text-sm leading-relaxed p-5
   placeholder text-[#333348]
   Placeholder content (show all 3 demo topics):
     "Try:
      · The moon landing was staged in a Hollywood studio.
      · Vaccines have been proven to cause autism.
      · Napoleon Bonaparte was extremely short."
   focus: border-[#2a2a3d]
   focus box-shadow: 0 0 0 1px #2a2a3d inset

3. Submit button: mt-4 w-full
   Idle:     bg-[#00ff88] text-[#0a0a0f] font-semibold font-mono
             py-3.5 rounded-xl text-sm
             text: "→ Check Claim"
             hover: bg-[#00cc6a]
   Checking: bg-[#001a0a] border border-[#14532d]
             text-[#00ff88] font-mono
             text: "Analyzing..."
             Add a small spinning indicator before the text
   Do NOT use opacity-50 disabled state.

4. Pipeline steps: mt-10
   Use the connected timeline design from component specs.
   Only render when isChecking is true or result exists.

5. ResultCard: mt-10
   cardReveal animation on appear.
   After the card appears, the ScoreBadge ring animates in.
```

### History page

```
Max width: max-w-3xl
Padding:   pt-16 px-6

1. Header: flex items-baseline gap-3 mb-8
   "History" — text-3xl font-bold text-white
   Count badge: px-2 py-0.5 rounded-md bg-[#1e1e2e]
                text-[#8888aa] text-xs font-mono
                "25 claims"

2. Controls: flex gap-3 mb-6
   Search: flex-1
     relative (for icon positioning)
     Icon: absolute left-3.5 top-3 <Search size={14} text-[#555570] />
     Input: w-full pl-9 pr-4 py-2.5 rounded-xl text-sm
            bg-[#12121a] border border-[#1e1e2e]
            text-[#f0f0ff] placeholder-[#333348]
            focus: border-[#2a2a3d]

   Filter pills: flex gap-2 flex-shrink-0
     ALL pill:        active bg-[#00ff88] text-[#0a0a0f]
     FALSE pill:      active bg-[#450a0a] text-[#fca5a5] border border-[#7f1d1d]
     MISLEADING pill: active bg-[#431407] text-[#fcd34d] border border-[#78350f]
     UNVERIFIED pill: active bg-[#1e1e2e] text-[#a5b4fc] border border-[#3730a3]
     TRUE pill:       active bg-[#052e16] text-[#86efac] border border-[#166534]
     All inactive:    bg-[#12121a] border border-[#1e1e2e] text-[#8888aa]
     All pills:       px-3 py-1.5 rounded-lg text-xs font-mono font-semibold
                      transition-all duration-150

3. Claim list: space-y-3
   Collapsed state shows only:
     flex items-center gap-4 p-4
     ScoreBadge at w-14 h-14 (smaller — 56px)
     VerdictTag
     claim text preview truncated (text-[#8888aa] text-sm italic)
     timestamp right-aligned text-xs font-mono text-[#555570]
   Full ResultCard on expand.
   Expand: transition max-h from max-h-[72px] to max-h-[600px]
           duration-300 ease-in-out, overflow-hidden

4. Loading skeleton: 3 cards
   h-[72px] rounded-xl border border-[#1e1e2e]
   bg shimmer animation (see index.css)

5. Empty state: py-24 text-center
   "◎" text-5xl text-[#1e1e2e] mb-4
   "No claims checked yet." text-[#555570] font-mono text-sm
   "→ Check your first claim" text-[#00ff88] text-sm mt-3 block
```

### Trend Report page

```
Max width: max-w-3xl
Padding:   pt-16 px-6

1. Heading: "Trend Report" text-3xl font-bold mb-8

2. Stats: grid grid-cols-3 gap-4 mb-6
   Each card: bg-[#12121a] rounded-xl border border-[#1e1e2e] p-5

   Card 1 — Total:
     Value: text-4xl font-bold font-mono text-white
     Label: text-[10px] uppercase tracking-[0.2em] font-mono
            text-[#555570] mt-2
     "CLAIMS CHECKED"

   Card 2 — Avg score:
     Value: text-4xl font-bold font-mono
     Color: text-[#fca5a5] if avg < 4.0 / text-[#fcd34d] if < 7 / text-[#86efac] if >= 7
     Subtle card glow matching the score color
     Label: "AVG SCORE"

   Card 3 — Most common:
     VerdictTag (full component)
     Label: "MOST COMMON" mt-3 below the tag

3. Charts: grid grid-cols-2 gap-4
   Both cards: bg-[#12121a] rounded-xl border border-[#1e1e2e] p-6

   Donut chart:
     Heading: "Verdict Distribution" text-sm font-semibold text-[#f0f0ff] mb-5
     SVG viewBox="0 0 220 220"
     Circle: cx=110 cy=110 r=80
     Arcs: stroke-width=18, stroke-linecap="butt"
           Animate each arc's stroke-dashoffset on mount
           stagger: 0ms, 100ms, 200ms, 300ms
     Center text: total count, text-2xl font-bold font-mono text-white
     Legend: flex flex-wrap gap-x-4 gap-y-1.5 mt-4 justify-center
       Each item: flex items-center gap-1.5 text-xs font-mono text-[#8888aa]
       Colored dot w-2 h-2 rounded-full + label + percentage

   Bar chart:
     Heading: "Claims per Day" text-sm font-semibold text-[#f0f0ff] mb-5
     SVG viewBox="0 0 340 160"
     Bars: fill #00ff88 rx=4
           transform-origin: bottom of each bar
           scaleY animation from 0 to 1 on mount, staggered 50ms per bar
     X axis labels: font-mono text-[10px] fill="#555570"
     Hover: fill changes to #4ade80

4. Empty state: py-16 text-center
   "◎" text-5xl text-[#1e1e2e] mb-4
   "Check some claims to see trends." font-mono text-sm text-[#555570]
```

### Agent Logs page

The terminal is the strongest existing page. Enhance it.

```
Max width: max-w-3xl
Padding:   pt-16 px-6

1. Header: flex items-start justify-between mb-5
   Left:
     "Agent Logs" — text-2xl font-bold font-mono text-[#00ff88]
     "Live pipeline output from the NemoClaw sandbox" — text-sm
      text-[#555570] mt-1

   Right (only when streaming):
     flex items-center gap-2 text-xs font-mono text-[#fbbf24]
     Pulsing amber dot (same as StatusDot but amber color)
     "PROCESSING"

2. Terminal panel: bg-[#080810] rounded-xl border border-[#1e1e2e]
   overflow-hidden

   Terminal header bar:
     h-9 bg-[#0d0d18] border-b border-[#1e1e2e]
     flex items-center px-4 justify-between

     Left: 3 dots w-2.5 h-2.5 rounded-full bg-[#1e1e2e] gap-1.5
           (not traffic light colors — keep monochrome)

     Center: "claritybot — bash — 80×24"
             text-[10px] font-mono text-[#2d2d40]

     Right: "Clear" text-[10px] font-mono text-[#555570]
            hover:text-[#8888aa] cursor-pointer

   Log content: p-5 min-h-[320px] max-h-[480px] overflow-y-auto
     flex flex-col gap-0

     Blinking cursor line (shown when processing or as a baseline):
       "claritybot@agent:~$ ▋"
       text-[#00ff88] font-mono text-sm
       .cursor::after { animation: blink 1s step-end infinite }
       Show the cursor at the END after all log lines

     Empty state (no logs yet):
       text-[#333348] font-mono text-sm
       "claritybot@agent:~$ waiting for input..."

3. Metadata row (shows after logs exist): mt-3
   flex items-center gap-3 text-[10px] font-mono text-[#333348]
   "CLAIM ID {id_truncated_to_8_chars}"
   "·"
   "{count} events"
   "·"
   "{duration}s"
```

---

## 7. Spacing

```
Page padding top:    pt-16 (64px)
Max width narrow:    max-w-2xl (Check Claim)
Max width wide:      max-w-3xl (History, Trends, Logs)
Card internal:       p-5 or p-6 — be consistent within each page
Between cards:       gap-4
Between major sections: mb-8
Sidebar width:       w-56 (224px) — unchanged
```

---

## 8. Allowed effects

These effects are allowed because they communicate meaning:

- box-shadow glow on verdict cards and score badge
  (communicates verdict type and live state)
- animate-ping on StatusDot
  (communicates live connection)
- SVG stroke animation on score ring
  (communicates score revealing)
- animate-pulse on running pipeline step glow
  (communicates active processing)
- Shimmer animation on loading skeletons
  (communicates data loading)
- SVG scaleY animation on bar chart bars
  (communicates data populating)
- SVG strokeDashoffset animation on donut arcs
  (communicates data populating)
- One structural gradient: vertical rail on pipeline steps
  (linear-gradient to transparent — communicates direction)

Still banned:
- Gradient mesh backgrounds
- Gradient fills on cards
- Text gradients
- Box shadows that create elevation (material design style)
- Any animation without communicative purpose

---

## 9. Animation keyframes

Add all to frontend/src/index.css:

```css
@keyframes cardReveal {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes logIn {
  from { opacity: 0; transform: translateX(-4px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
.cursor::after {
  content: '▋';
  animation: blink 1s step-end infinite;
}

@keyframes ringSpinner {
  to { stroke-dashoffset: -213.6; }
}

@keyframes shimmer {
  from { background-position: -200% center; }
  to   { background-position: 200% center; }
}
.shimmer {
  background: linear-gradient(
    90deg,
    #12121a 25%,
    #1a1a26 50%,
    #12121a 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes barGrow {
  from { transform: scaleY(0); }
  to   { transform: scaleY(1); }
}
```

---

## 10. Installation checklist

Run these before Claude Code builds the pages:

```bash
npm install lucide-react
```

Add to index.html head:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Add to index.css body rule:
```css
body {
  font-family: 'Inter', system-ui, sans-serif;
}
```

---

## 11. Visual QA checklist before demo

Walk through every item on the actual running UI:

- [ ] ScoreBadge ring fills with animation when score arrives
- [ ] ScoreBadge glow appears with a slight delay after ring fills
- [ ] ScoreBadge null state shows spinning arc (not empty gray circle)
- [ ] VerdictTag has border + background + colored text (not just text color)
- [ ] ResultCard has verdict-colored left border (border-l-4)
- [ ] ResultCard has subtle verdict glow
- [ ] ResultCard entry animation fires (slide up from below)
- [ ] Pipeline steps have vertical rail connecting circles
- [ ] Running step circle has amber glow + pulsing ring
- [ ] Running step shows log message text below the label
- [ ] Completed steps de-emphasize (gray label, green circle)
- [ ] LogLine: step labels are different colors per step name
- [ ] LogLine: lines animate in from left on mount
- [ ] Terminal: has fake header bar with 3 dots + title
- [ ] Sidebar: has icons next to every nav label
- [ ] Sidebar: "ClarityBot" in JetBrains Mono
- [ ] Check Claim: hero section visible before the textarea
- [ ] Check Claim: textarea placeholder shows 3 demo claim examples
- [ ] Check Claim: button changes appearance (not opacity) when checking
- [ ] History: filter pills use verdict colors when active
- [ ] History: collapsed cards expand smoothly (not jump)
- [ ] History: empty state has ◎ icon
- [ ] Trend Report: bars animate up on page load
- [ ] Trend Report: donut arcs animate in with stagger
- [ ] Trend Report: avg score card color matches score value
- [ ] StatusDot: animate-ping ring visible when online
- [ ] Page background is #0a0a0f (not #111111 — slightly blue-tinted)
- [ ] No white backgrounds anywhere
- [ ] No plain text links — all source links have ExternalLink icon

---

## 12. Anti-patterns

- No white or light backgrounds
- No gradient fills on cards
- No CSS modules — Tailwind + inline style for dynamic values
- No charting library — SVG only
- No modal dialogs — inline states
- No toast notification stacks — inline feedback
- No pagination — scrollable lists
- No purple, pink, or teal base colors
  (indigo/violet only for [extractor]/[crossref] log labels and UNVERIFIED)
- No border-radius larger than rounded-xl on cards
- No generic opacity-50 disabled states — change the element's meaning