# Design System — UI/UX Conventions

> Written 2026-07-21 from a full read of the shipped UI: `src/components/ui/dashboard-shell.tsx`,
> the Budget Dashboard (`src/features/budget/components/`), and the UTM Generator
> (`src/features/utm/components/`). Every value in this doc is extracted from that code —
> nothing is invented. It is **descriptive** of what exists and **prescriptive** for new
> feature slices (clients dashboard, checklists, reports): reuse these patterns before
> inventing new ones. Where Budget and UTM disagree, the dominant pattern is named and picked.

## 1. Purpose & scope

- The visual system originates from Claude Design exports converted to inline-style React
  components (see `docs/design/design-brief.md` and the decision-log "Design-First Workflow").
- Exports are **additive, never replace** — a new export is a feature-scoped mock, not an app
  redesign. Integrate it on top of what exists; never delete or restyle existing pages because
  a mock omits them. Full guardrail: `.claude/rules/working-style.md` → "Claude Design Exports
  — Additive, Never Replace".
- When a new export's styling conflicts with this doc, this doc + the shipped UI win for
  shared chrome (shell, tables, drawers, toasts); the export wins only for the new feature's
  own content, and any removal of existing behavior must be flagged first.

## 2. Foundations

### Color palette

Canonical tokens live in `src/app/globals.css` (`@theme inline`). Components currently repeat
the hexes inline — keep the values below exact.

| Token | Hex | Used for |
|---|---|---|
| Accent (brand indigo) | `#4f46e5` | Primary buttons, logo block, active-nav bar, eyebrow labels, progress bars, links/pills `rgba(79,70,229,.09)` tint |
| Sidebar / dark | `#10121a` | Sidebar, toast pill, chart tooltip |
| Dark inset panel | `#0f1118` border `#1d2030`, text `#cdd3e0` | URL preview card, drawer sparkline card |
| Body background | `#f6f7f9` | App/content background, active menu item |
| Surface | `#ffffff` | Cards, header, inputs |
| Border | `#e9ebef` | Card/input/header hairlines |
| Border subtle | `#f1f2f4` | Row dividers, neutral pill bg, progress-bar track |
| Input border | `#e1e4e9` | Form inputs (slightly darker than card border); dashed placeholders |
| Text primary | `#161922` | Headings, values |
| Text secondary | `#6b727f` | Labels, descriptions (also `#4b5563` on secondary buttons/labels, `#5b626e` for mono table values) |
| Text muted | `#9aa0aa` | Timestamps, hints, placeholders |
| Success green | `#16a34a` bg `rgba(22,163,74,.1)` | Status pills, positive deltas; `#22c55e` for toast dot / copied checkmark / live-preview dot |
| Error red | `#dc2626` bg `rgba(220,38,38,.1)` | Status pills, banners, negative deltas, destructive solid buttons; `#ef4444` for toast dot, delete accents; `#c2410c` inline warning text |
| Table header bg | `#f3f4f7` | Column header rows; group headers `#fbfbfc` (budget) / `#f3f4f7` (utm); zebra `#fafafa`; row hover `#f6f7ff` (`.utm-row`) |

Platform brand colors (with glyph chips) — `PLATFORM_META` in
`src/features/budget/components/budget-helpers.ts`: Meta `#0866FF` "M", Google Ads `#EA4335`
"G", LinkedIn `#0A66C2` "in", TikTok `#010101` "TT".

### Typography

- **Sans**: Manrope via `var(--font-sans)` (fallback `-apple-system, sans-serif`). **Mono**:
  JetBrains Mono via `var(--font-mono)`. Both set in `globals.css`.
- Budget scopes its own copies (`budget-fonts.ts`) and prop-drills `monoFont` — that was to
  match the approved export without touching globals. **New features should use the CSS vars
  (`var(--font-mono)`) like UTM does**; do not add per-feature font loads or a `monoFont` prop.
- Scale actually in use:

| Role | Spec |
|---|---|
| Page title (sub-header h2) | 25px / 800, letterSpacing `-0.02em` |
| Eyebrow | 12px / 600, uppercase, `0.06em`, indigo, with 6px indigo dot |
| Card title h3 | 14.5–16px / 700 |
| KPI value | 24px / 800 (hero 32px), letterSpacing `-0.02em` |
| Field label | 12.5px / 600, `#4b5563` or `#6b727f` |
| Body / row text | 13–14px; row primary 13.5 / 600 |
| Table column header | 10.5–11px / 700, uppercase, letterSpacing `0.06–0.07em`, `#6b727f` |
| Mono figures / timestamps | 10–12.5px, `var(--font-mono)` |
| Section label (drawer) | mono 10.5px / 600, uppercase, letterSpacing `.14em`, `#9aa0aa` |

### Radius, shadow, spacing

- Radii: buttons/inputs **8–9**; dropdown menus **10–11**; cards **14** (Budget) — UTM's older
  cards use 16; **use 14 for new cards**. Pills/progress bars `999`; toast 11; drawer inset
  cards 11–12.
- Shadows: card `0 1px 2px rgba(22,25,34,.04)`; menu `0 16px 40px -12px rgba(22,25,34,.28)`;
  toast `0 14px 40px -10px rgba(0,0,0,.4)`; drawer `-26px 0 54px -22px rgba(22,25,34,.45)`.
- Spacing: content container `maxWidth: 1240, margin: '0 auto', padding: '30px 32px'` (bottom
  60–90). Card padding 18–24; grid/card gap **14** (Budget) — UTM's two-panel grid uses 24.
  Section `marginBottom: 16`; sub-header `marginBottom: 24–26`.
- Buttons: primary = solid indigo, white text, 13–14px / 600–700, padding `~9px 14px`, radius
  9–10, `opacity .6–.75` + `cursor: not-allowed` when disabled; secondary = white bg,
  `1px solid #e9ebef`, `#4b5563` text; destructive = solid `#dc2626`/`#ef4444` or white with
  red text. Always `fontFamily: 'inherit'` on `<button>`.

### Inline style objects vs Tailwind

Tailwind is imported (`@import "tailwindcss"`) but **no component uses utility classes** —
everything is inline `style` objects (a byproduct of converting Claude Design exports), with
`globals.css` holding only the theme tokens, scrollbar styling, and shared keyframes/classes
(`shimmer`, `toast-in`, `drawer-in`, `backdrop-in`, `fadeUp`, `spin`, `.utm-row`).
**New feature UI should follow the inline-style convention** — consistency with the export
workflow and the existing components beats a mid-stream migration. Put reusable style objects
in module-level `const`s (`cardStyle`, `inputStyle` — see `budget-kpi-row.tsx`,
`utm-form.tsx`). Page-specific keyframes go in a scoped `<style>` tag (see `budgetBarflow` in
`budget-page-client.tsx`); shared ones go in `globals.css`.

## 3. App shell & page anatomy

### DashboardShell (`src/components/ui/dashboard-shell.tsx`)

- Dark sidebar `#10121a`, collapsible **248px ↔ 76px** (`transition: width 0.18s ease`),
  toggled by the hamburger in the header.
- Logo block: 32px square, radius 9, `#4f46e5`, white link icon; "Ad Op Tools" 15.5/800.
- `NAV` array: `{ id, href, label, icon }` with inline 19×19 SVG icons, `strokeWidth 1.9`.
  Active item = `rgba(255,255,255,0.07)` overlay + 3px indigo left bar, text `#f5f6f8`;
  inactive `#9aa1ad`.
- Header: 62px, white, `borderBottom: 1px solid #e9ebef`, page title left (18/700), user
  email + sign-out right. Title comes from the `PAGE_TITLES` record keyed by pathname.
- **Registering a new page**: add an entry to both `NAV` and `PAGE_TITLES` in
  `dashboard-shell.tsx` — a route missing from `PAGE_TITLES` falls back to "Ad Op Tools".
- Auth gate lives in `src/app/(dashboard)/layout.tsx`: `supabase.auth.getUser()` →
  `redirect('/login')`, then wraps children in the shell.

### Page anatomy: server `page.tsx` → `*-page-client.tsx`

Both features follow the same split (see `src/app/(dashboard)/budget/page.tsx` and
`utm/page.tsx`):

1. **Server `page.tsx`** — async RSC. Resolves `searchParams`, computes date ranges/`nowIso`
   server-side, fetches everything via the feature's `queries.ts` in one `Promise.all`, and
   renders the client orchestrator with plain serializable props. No UI here.
2. **`*-page-client.tsx` orchestrator** — `'use client'`. Owns page-level state (toast, drawer
   selection, busy flags, `useTransition` for route changes), memoizes derived data, calls
   server actions from `actions.ts`, and composes the presentational child components. Heavy
   derivations live in a plain `*-helpers.ts` module, not in components.
3. **Child components** — one file each, kebab-case, props-only, under 300 lines.

### Sub-header pattern

Below the shell header, each page renders its own intro block: indigo eyebrow (dot + uppercase
micro-label), 25/800 `h2`, one-sentence 14px `#6b727f` description (max-width ~580–640), with
page-level controls right-aligned (date-range dropdown, mono "Synced Xm ago" timestamp,
primary action button). Budget extracts this to `budget-sub-header.tsx`; UTM inlines it.
**Extracting it as `{feature}-sub-header.tsx` is the standard for new pages.** Dropdown menus:
white card, radius 11, menu shadow, `fadeUp .16s`, close on outside `mousedown` + Escape,
active row `#f6f7f9` bg + indigo ✓.

## 4. Core component patterns

| Pattern | Reference file | Reuse when |
|---|---|---|
| KPI row / cards | `budget/components/budget-kpi-row.tsx` | Any dashboard summary strip |
| Data table (grid rows) | `budget/components/budget-campaign-table.tsx` | ≤8 columns, no horizontal scroll |
| Data table (`<table>`) | `utm/components/utm-url-library.tsx` | Many columns, sticky header + `overflowX` scroll |
| Detail drawer | `utm/components/utm-detail-drawer.tsx` (full CRUD), `budget-detail-drawer.tsx` (read-only) | Row click-through detail |
| Copy button | `utm-url-library.tsx` `CopyButton` | Any copyable value |
| Autocomplete / combobox | `utm/components/utm-form.tsx` | Free-text with history or fixed suggestions |
| Settings widget | `budget/components/budget-cap-widget.tsx` | Inline view↔edit config cards |
| Line/area chart | `budget-spend-chart.tsx` + `buildChartGeometry` | Time series |
| Donut + legend | `budget-platform-donut.tsx` | Share-of-total breakdowns |
| Connections panel | `budget-connections.tsx` | Any per-platform account management |

- **KPI cards**: CSS grid (`'1.9fr 1fr 1fr 1fr 1fr'`), shared `cardStyle` (white, border,
  radius 14, padding 18, card shadow, column flex, gap 10). Label 12.5/600 → value 24/800 →
  muted footnote pinned with `marginTop: 'auto'`. Hero card is wider with a 9px progress bar
  (`#f1f2f4` track, indigo fill, `#dc2626` when over), a 2px `#161922` projected-EOM marker,
  and a tone pill (`TONE_COLORS`: good/bad/neutral).
- **Tables**: card wrapper with `overflow: hidden`; header row = title + count pill
  (`#f1f2f4`, radius 999) left, group-by toggle + search input (magnifier SVG absolutely
  positioned, input `height 34`, `padding 0 12px 0 33px`) right. Sortable column headers are
  clickable divs appending `↑`/`↓`; toggling resets pagination. Group-by renders collapsible
  section headers (`▸/▾` chevron, platform chip or label, count, right-aligned mono subtotal).
  Rows get `className="utm-row"` for the shared hover, `onClick` opens the drawer,
  `title=` attr on truncated cells. Pagination: "Load more" button appending `PAGE_SIZE = 12`.
- **Detail drawer**: fixed backdrop `rgba(0,0,0,.35)` (`backdrop-in`), `zIndex: 90`,
  right-aligned `<aside>` 440px (`maxWidth: 100vw`), `drawer-in` animation, drawer shadow,
  `role="dialog" aria-modal`, `stopPropagation` on the panel, Escape + backdrop click close
  (UTM's Escape unwinds layers: delete-confirm → edit → close). Structure: bordered header
  (title, chips, 32px ghost close button) → scrollable body → sticky footer. Body starts with
  the dark inset card (`#0f1118`); UTM's has a header Copy button, Budget's a 14-day
  sparkline. Edit mode swaps rows for inputs with **live URL preview**, disabled Save
  (`#a5a3e8`) until valid; delete uses an **inline confirm strip** (red-tinted footer,
  "This can't be undone", spinner-in-button while busy) — never `window.confirm`. Future
  features get **placeholder slots**: dashed-border cards at `opacity: 0.5` with a mono
  "Coming soon" pill (see the Analytics section in `utm-detail-drawer.tsx`).
- **Copy buttons**: 28px square, `1px solid #e9ebef`, radius 7, copy-icon `#9aa0aa` →
  checkmark `#22c55e` for **1.5s** via a `useRef` timer (single `copiedId` state per table);
  `e.stopPropagation()` inside clickable rows. Text variant: "Copy" → "✓ Copied".
- **AutocompleteInput** (in `utm-form.tsx`): 200ms debounced fetch after ≥2 chars, dropdown
  with "from your history" caption, ArrowUp/Down + Enter + Escape, active row indigo-tinted,
  `onMouseDown` + `preventDefault` so blur doesn't eat the click. `Combobox` is the
  fixed-options variant. Promote to `src/components/ui/` when a second feature needs them.
- **Cap/settings widget**: card with title + description left, "Edit" secondary button right;
  edit mode (`fadeUp`) swaps in mono inputs with an absolutely-positioned `$` prefix and
  Save/Cancel; view mode is a stat grid with `borderLeft: 1px solid #f1f2f4` column dividers.
- **Charts are hand-built SVG — no chart library.** `buildChartGeometry`
  (`budget-helpers.ts`) maps a daily series into line/area paths over a `680×190` viewBox
  with 3 gridlines + ≤5 x-labels. Area fill is a vertical gradient of the series color
  (platform brand color for platform data); hover uses an invisible flex-column overlay, a
  9px dot, and a dark `#10121a` tooltip. Donut: stroked circles `r=54, strokeWidth 18` with
  dasharray/rotation accumulation, center total, legend rows with 9px color squares, status
  pills, and 6px share bars.

## 5. Cross-cutting treatments

- **Platform identity**: always the glyph chip — rounded square in the brand color, white
  800-weight glyph. Sizes in use: 16px/r5 (table cell), 20px/r6 (group header), 26px/r7
  (coming-soon), 34px/r9 (connection row), 40px/r11 (empty-state card). Helpers:
  `platformLabel/platformColor/platformGlyph`. These currently live in
  `budget-helpers.ts` — lift to a shared module when a second feature needs them rather than
  duplicating the map.
- **Connection status**: pill from `STATUS_STYLES` (`budget-connections.tsx`) — connected
  green, expired/error red, revoked gray. Every connection row shows mono
  `account id · currency · synced {relativeTime}`. Affordances: secondary "Sync" (busy →
  "Syncing…" + disabled), "Disconnect" with inline Yes/No confirm, solid-red "Reconnect" when
  expired/error/revoked. Non-connectable platforms render as dashed "Coming soon" cards.
  Freshness: `relativeTime()` (`just now / 5m ago / 3h ago / 2d ago / never`) + the
  sub-header "Sync now" button with spinning icon.
- **Money**: spend is stored as **integer micros** with per-row currency (see
  `docs/architecture-blueprint.md` §2 — this is a standing guardrail). Display only via
  `formatMoneyMicros(micros, currency, { compact? })` → `Intl.NumberFormat` en-US currency;
  compact for KPIs/subtotals (`$1.2K`), standard 2-decimal for row values. Counts use
  `formatInt` / `formatCompactInt`; percentages `formatPct` (0 decimals ≥10%, else 1). Mixed
  currencies: totals render in `dominantCurrency()` with a muted mono note ("Multiple
  currencies in range (…) — totals shown in USD"). Never float-multiply money; platform
  transforms do string math to micros. Numeric figures render in `var(--font-mono)`,
  right-aligned in tables.

## 6. States

- **Empty / connect-first**: `budget-empty-state.tsx` — centered 54px icon tile
  (`rgba(79,70,229,.09)`, radius 14, indigo icon), 21/800 headline, muted description, then
  a 2-col grid of platform cards (Connect primary button vs mono "Coming soon" badge).
  In-table empties are lighter: bold one-liner + muted sentence, message varying by cause
  ("No campaigns match your search." vs "No campaign spend in this range yet.").
- **Loading**: skeletons via the `.shimmer` class (see `SkeletonRow` in
  `utm-history-table.tsx`); route/data transitions show a 3px indeterminate top progress bar
  (indigo on `rgba(79,70,229,.16)`, `budgetBarflow`); in-button spinners (`spin` keyframe)
  with label swap to "Saving… / Syncing… / Deleting…"; disable + reduce opacity while busy.
- **Error**: page-level = `budget-error-banner.tsx` (white card, `borderLeft: 3px solid
  #dc2626`, red-tinted `!` circle, title + detail with last-synced, solid-red action).
  Field-level = red input border + `#c2410c` hint row with `!` badge. Drawer-level = a red
  12.5/600 line above the footer. Action failures surface as error toasts.
- **Toast**: no library. Local `useState<Toast>` (`{ msg, type: 'success' | 'error' }`) + a
  `useRef` timer, **3s auto-clear** (UTM's older 2.6s — use 3s), cleared on unmount. Fixed
  top-right (18px), `zIndex: 80`, dark `#10121a` pill radius 11, 20px colored dot
  (`#22c55e` / `#ef4444`) with white check/cross SVG, `toast-in` animation.
- **Data updates**: server actions return `ActionResult<T>` and call `revalidatePath`.
  Client-side, **server-derived data refreshes via `router.refresh()`** after a successful
  action (Budget); user-owned CRUD lists may update local state optimistically for instant
  feedback (UTM history add/edit/delete). Either way: toast on success, error toast + no
  state change on failure.

## 7. New-feature checklist

Before building UI for a new slice, walk this list:

1. Register the route in `NAV` + `PAGE_TITLES` (`dashboard-shell.tsx`) with a 19px inline SVG
   icon, `strokeWidth 1.9`.
2. Server `page.tsx` fetches via `queries.ts` (`Promise.all`), passes serializable props +
   `nowIso` to a `{feature}-page-client.tsx` orchestrator.
3. Content wrapper: `maxWidth 1240, padding '30px 32px'`; sub-header with eyebrow / h2 /
   description / right-aligned controls.
4. Reuse before inventing: KPI cards, table (grid or `<table>` variant), drawer, copy button,
   autocomplete, settings widget, SVG charts — reference files in the §4 table. Promote
   shared pieces to `src/components/ui/` instead of copy-pasting a third time.
5. Use the exact tokens: indigo `#4f46e5`, borders `#e9ebef`/`#f1f2f4`, text
   `#161922`/`#6b727f`/`#9aa0aa`, card radius 14 + `0 1px 2px rgba(22,25,34,.04)`, gap 14.
6. Inline style objects, `var(--font-sans)`/`var(--font-mono)`, no new fonts, no new
   libraries (charts included) without approval.
7. Design all states: empty/connect-first, loading (shimmer + busy buttons), error (banner /
   field / toast), and success toast (3s).
8. Platform-touching UI uses the glyph chip, status pills, `relativeTime` freshness, and
   micros-based money formatting — never a second formatting path.
9. New Claude Design export? Diff against current UI, extract only the new feature, keep
   everything else (working-style.md guardrail).
