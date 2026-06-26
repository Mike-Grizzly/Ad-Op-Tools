# Ad Op Tools — Claude Design Brief

Source brief for designing the app's UI/UX in Claude Design. Part 1 gives the whole-product
context so the design system, navigation, and shared patterns accommodate **every** feature
(not just the one being drawn today). Part 2 is the detailed brief for the **Budget Dashboard**
— the screen we're building first. Later features get their own Part-N sections as we reach them.

The existing app shell (dark sidebar + light content) and the UTM Generator screen are already
designed and built — **extend that system, don't reinvent it.**

---

## Part 1 — Product & information architecture (design around all of this)

**What Ad Op Tools is:** a SaaS that automates the repetitive manual steps of running digital ad
campaigns across Google Ads, Meta, LinkedIn, and TikTok. The user is a hands-on ad operator /
marketer who today juggles spreadsheets and four platform UIs. The product's job is to make the
tedious ops work fast and unified so they can focus on strategy and creative.

**The five product areas** (nav lives in the existing left sidebar):
1. **Budget Dashboard** — unified real-time spend across all connected platforms; replaces an Excel
   sheet that only tracked monthly caps. *(Designing now.)*
2. **UTM Generator** — template-based bulk UTM link creation + history/library. *(Already designed & built.)*
3. **GTM Automation** — a "New Campaign" wizard that creates the standard tag/trigger/conversion
   stack in Google Tag Manager in one click.
4. **Creative Asset Manager** — upload, swap, and clone ad creative across platforms.
5. **Custom Reporting** — Looker-Studio-style in-app dashboards built from platform data.

**Cross-cutting concepts the design system should support** (so they're consistent everywhere):
- **Platform connections**: connect/disconnect an ad platform via OAuth; each connection has a
  status (connected / expired / error) and a "last synced" time. This connect/status pattern
  recurs across Budget, Creative, and Reporting — design it **once** as a reusable component.
- **Platform identity**: a consistent visual treatment (logo chip + brand color) for Meta, Google
  Ads, LinkedIn, TikTok, used in tables, breakdowns, and connection cards everywhere.
- **Empty / connect-first states**: most screens start empty until a platform is connected — every
  feature needs a strong "connect to get started" state.
- **Sync + freshness**: a "Sync now" affordance + last-updated timestamp, reused across data screens.
- **Money & metrics**: spend, impressions, clicks, CTR, CPC, CPM, conversions — formatted
  consistently; spend may be in multiple currencies (see Budget brief).

**Visual system to match (already in the app):**
- Dark sidebar `#10121a`; indigo primary accent `#4f46e5`; app background `#f6f7f9`; primary text
  `#161922`; white card surfaces `#ffffff` with hairline borders `#e9ebef`; rounded corners ~9–12px;
  clean sans-serif; generous whitespace; a calm, data-dense-but-readable, modern SaaS feel (think
  Linear / Vercel dashboard restraint, not a flashy marketing site).
- Top header bar (~62px) with the page title left, primary actions right. Content area scrolls.

---

## Part 2 — Budget Dashboard (design this now)

**Goal:** one screen where the user sees, at a glance, where ad money is going across all platforms
and whether they're on pace against their monthly cap — replacing the spreadsheet. Phase 1 connects
**Meta** first (Google/LinkedIn/TikTok shown as "coming soon"), and is **read-only** (no editing
campaigns from here).

**Design as an additive feature inside the existing shell** (per `.claude/rules/working-style.md`
→ "Claude Design Exports — Additive, Never Replace"): the app already has a dark left sidebar +
top header and a built UTM screen. Design ONLY the Budget Dashboard content area that drops into
that shell — do not redesign the sidebar, header, nav, or any other page. This is a feature-scoped
mock, not an app redesign.

**Reuse existing patterns** for consistency: the white card + hairline-border style, the indigo
`#4f46e5` accent, the grouped/filterable/collapsible table from the UTM URL Library, and the
right-side slide-over detail drawer (a campaign row can open a drawer with that campaign's detail).

Design the following, including all states.

### A. Page header (inside the existing shell)
- Title "Budget Dashboard".
- **Date-range selector** (top-right): presets — Last 7 / 14 / 30 days, This month, Last month,
  Custom range.
- **"Sync now"** button + a subtle "Last synced 4m ago" timestamp.

### B. Empty state — no platform connected
- A centered prompt: "Connect an ad platform to see your spend."
- Four **platform connection cards** (Meta, Google Ads, LinkedIn, TikTok), each with logo + brand
  color. Meta = active "Connect" button; the other three = "Coming soon" (disabled/greyed).

### C. KPI summary row (4–5 cards across the top)
- **Total spend** for the selected range (large number; small delta vs. previous period).
- **Monthly cap pacing** — the spreadsheet replacement: spend-so-far this month vs. the cap, a
  progress bar, % of cap used, and a projected end-of-month spend with an on-track / over / under
  indicator. This is the hero metric — make it prominent.
- **Active campaigns** count.
- **Avg daily spend** (and/or **Impressions**, **Clicks**, **CTR**, **CPC** — pick the most useful
  4–5 total cards; design a couple of variants so we can choose).

### D. Spend over time
- A daily **area/line chart** across the selected range, optionally **stacked by platform**.
  Hover tooltip with per-day, per-platform spend.

### E. Spend by platform
- A **donut or horizontal bar** breakdown: each platform's total spend, % share, brand color, and a
  small connection-status chip. (With one platform connected it still reads well; design for 1 and
  for 3–4 connected.)

### F. Campaign spend table (the workhorse)
- Columns: Campaign name, Platform (logo chip), Status, Spend, Impressions, Clicks, CTR, CPC.
- **Sortable** columns; a **search/filter** box; a **group-by platform** toggle with collapsible
  group headers (mirror the UTM "URL Library" grouping pattern already in the app).
- Handles long lists: pagination or "load more".

### G. Monthly cap / pacing detail
- A widget to **set/edit the monthly cap** (overall, and optionally per-platform), with a progress
  bar toward the cap, days remaining in the month, and a clear pace signal. (Central to the value
  prop — the Excel sheet only did this; we do it live.)

### H. Connection management
- A panel (or a section reachable from the header) listing **connected accounts**: platform, account
  name/id, status (connected / expired / error), last synced, with **Sync** and **Disconnect**
  actions, and a **Reconnect** affordance when a token is expired/errored.

### States to design (not just the happy path)
- **Loading** (skeletons for cards/table/chart).
- **Syncing** (spinner/progress on the Sync button).
- **Error** (sync failed, or a connection's token expired → an inline "Reconnect" banner).
- **Connected but no spend** in the selected range (distinct from "not connected").
- **Multiple currencies**: if connected accounts report different currencies, design how spend is
  shown — e.g., a chosen display currency with a "mixed currencies" note, or native amounts per row
  with a combined estimate. Show your recommended treatment.

### Explicitly out of scope for this screen
- Editing/creating/pausing campaigns (read-only here).
- Creative management (separate Creative Asset Manager).
- Deep per-campaign drill-down pages (possible future; not now).

---

## How we'll use this with Claude Design
1. Paste **Part 1 + Part 2** into Claude Design and have it extend the existing Ad Op Tools system.
2. Iterate on the Budget screens + states.
3. Export the `.dc.html` into the design folder (source of visual truth), then convert to inline-style
   React components per the established workflow (decision-log "Design-First Workflow").
4. Repeat with a new Part-N brief per feature (Reports next, then GTM, then Creative). The Part-1
   overview stays stable so every feature shares one coherent system.
