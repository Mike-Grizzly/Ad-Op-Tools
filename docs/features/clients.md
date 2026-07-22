# Feature Spec — Clients (Book of Business)

**Status**: Merged to main (PR #9, 2026-07-22). Production verification round 1 found one
blocking UI bug — **"Create client" stayed disabled when the budget was typed with a
comma/`$` (strict `Number()` parsing) and no field showed an invalid state**. Fixed
2026-07-22: tolerant `parseAmount` (accepts `5,000` / `$5,000`), per-field red border +
hint feedback in the create form and budget editor, "(1 = calendar month)" label copy,
8 parser unit tests (41 total). Same round: UTM base URLs now auto-prepend `https://`
for bare domains (scheme requirement is structural — absolute URLs only — but typing it
is no longer required). **Pending: owner merges the fix PR, then re-runs verification
steps 6–13.**
**Product input**: `docs/product-spec-2026-06.md` §1.1–1.2 and §6.1 cluster, superseded
where the shipped canonical model differs (org scoping per decision-log 2026-07-20;
integer micros; existing `budget_entries` rather than the spec's `budget_snapshots`).
**Owner decisions (2026-07-21)**: full vertical slice (CRUD + dashboard + spend rollup);
spend attribution via **ad-account→client assignment**; **per-platform budget overrides
included**; UI built to `docs/design-system.md`.

## What it is

Clients are the org's customers (org = paying tenant — the agency; client = the agency's
customer). Nearly every later product-spec feature (campaign records + checklists, naming
generator, negative keywords, copy bank, health monitors) is per-client. This slice ships:

1. **Clients CRUD** — name, monthly budget (total), budget reset day, currency; optional
   per-platform budget overrides.
2. **Ad-account assignment** — each connected platform account belongs to at most one
   client; all its synced spend rolls up to that client.
3. **Book-of-business dashboard** (`/clients`) — card grid, one card per client: monthly
   budget, cycle-to-date spend, % paced, days remaining, trend arrow, platform chips,
   status-colored pacing bar with projected marker. Sort: most-at-risk / alphabetical /
   highest spend. Click card → detail drawer (per-platform breakdown, budget + overrides
   editing, account assignment, delete).

## Data model (migration `20260722000000_create_clients.sql`, additive-only)

- **`clients`**: `org_id` (RLS scope, immutable), `user_id` (created by, immutable),
  `name` (non-empty), `monthly_budget_micros bigint null` (null = no budget yet — card
  shows neutral "No budget" state), `budget_reset_day int not null default 1 check
  (between 1 and 28)` (1..28 cap sidesteps Feb/31st math), `currency` (ISO-4217 check,
  default USD), timestamps + `set_updated_at`. `unique (org_id, id)` as composite-FK
  target. RLS: house org-member per-verb policies; `prevent_tenant_rebinding('pin_user')`.
  **No status column** — v1 is hard delete; archive would be speculative schema.
- **`client_platforms`** (per-platform overrides): `org_id` carried explicitly (direct
  RLS, no join), `client_id` via **composite FK `(org_id, client_id) →
  clients(org_id, id) on delete cascade`** — same-org membership is a constraint, not a
  trigger. `platform` (4-platform check), `monthly_budget_override_micros bigint not
  null` (a row exists iff an override exists), `unique (client_id, platform)`.
  **No `user_id`** — deliberate deviation from the tenant-table shape: child settings row,
  attribution lives on the parent client.
- **`platform_connections.client_id uuid null`** + composite FK `(org_id, client_id) →
  clients(org_id, id)` with **`on delete set null (client_id)`** (column-list form,
  PG 15+; verified against the live project before apply — fallback is a same-org
  validation trigger). Deleting a client detaches its accounts and cascades its
  overrides; spend rows are untouched.

Spend attribution join: `budget_entries` rows map to a client through the assigned
connection's `(platform, external_account_id)` pair. No `client_id` lands on
`budget_entries` (spend stays a fact about an ad account).

## Pacing model

**Billing cycle**: `billingWindow(resetDay, now)` — the cycle containing `now`, starting
on the most recent `budget_reset_day` and ending the day before the next one (UTC).
Default 1 ≡ calendar month (parity with the Budget page's month-to-date math).

**Bands (resolves a spec inconsistency — decision-log 2026-07-21)**: the spec's red
condition "projected to exceed budget" is, under linear projection, equivalent to being
any amount over ideal pace, which would make the yellow band unreachable. Adopted:

- `ideal = budget × (dayOfCycle / daysInCycle)`; `deviation = (spend − ideal) / ideal`
- **green** |deviation| ≤ 10% · **yellow** 10% < |deviation| ≤ 25% ·
  **red** |deviation| > 25% **or spend ≥ budget** · **none** (gray) when no budget set
- Projection for the card marker: `(spend / dayOfCycle) × daysInCycle`
- Per-platform: same bands against each override; platforms with spend but no override
  render spend-only (status none)
- Trend arrow: spend last 7 days vs prior 7 days (null when prior window is 0)

## v1 limitations (documented, not bugs)

- Pacing assumes a client's accounts share the client's currency (owner is USD-only
  today); totals display via `dominantCurrency`.
- Assignment UI lives in the client drawer only (not on the Budget connections panel).
- Client detail is a drawer, not a `/clients/[id]` route — route upgrade later if needed.
- Early-cycle deviations are volatile by construction (day 1–2); no smoothing.
- Duplicate client names allowed (no unique constraint).

## UI pattern mapping (per `docs/design-system.md`)

| Component | Pattern |
|---|---|
| `clients-sub-header.tsx` | Sub-header (eyebrow/h2/description + right controls) |
| `client-card.tsx` | KPI hero-card (progress bar + projected marker + tone pill) |
| `clients-empty-state.tsx` | Empty state (icon tile + CTA) |
| `client-drawer.tsx` | Detail drawer, full-CRUD variant (create + detail modes) |
| `client-budget-editor.tsx` | Cap-widget view↔edit settings card |
| `client-accounts-panel.tsx` | Connections rows (assign/unassign) |
| `clients-page-client.tsx` | Page orchestrator (toast/drawer/sort state) |

**New token**: amber `#d97706` on `rgba(217,119,6,.1)` for the yellow band (design system
had no warning color) — added to `docs/design-system.md` at closeout.
**Lift**: `PLATFORM_META` + `platformLabel/Color/Glyph` move to `src/lib/platform-meta.ts`
(this slice is the designated second consumer); `budget-helpers.ts` re-exports.

## Verification checklist

- [ ] database-reviewer + security-reviewer on the migration; code/typescript reviewers on
      logic; react + code reviewers on UI
- [ ] type-check / lint / test / build green at every commit
- [ ] **CHECKPOINT: owner approves migration apply** (additive-only — no deploy window)
- [ ] Post-apply probes: PG version ≥ 15; RLS + policies on both tables; cross-org FK
      violations rejected (override + assignment); org_id immutability; client delete →
      connections detached, overrides cascaded, spend intact; advisors clean
- [ ] **CHECKPOINT: owner inspects PR and merges**
- [ ] Manual production verification (owner): add client → budget + override → assign the
      live Meta connection → card shows real rollup, correct band/marker/trend →
      reset-day 15 shifts the window → all three sorts → unassign → delete (confirm
      strip) → toasts → nav active state

## Test results (2026-07-21)

- **Reviews** (all findings applied): database-reviewer — migration correct on all checks
  incl. composite-FK/`set null (client_id)` syntax; dropped a redundant org_id index;
  accepted-as-designed notes recorded (client_id mutability on overrides, org FK NO
  ACTION). security-reviewer — no CRITICAL/HIGH; composite-FK cross-org isolation
  confirmed sound; carry-forwards honored (name length bounded in Zod; all rollup joins
  org-filtered). typescript-reviewer — 1 HIGH fixed (fail-safe upsert-then-delete-stale
  override replace), duplicate-platform Zod refine, NaN band guard. react-reviewer — 2
  HIGH fixed (budget editor keeps draft on save failure via Promise contract; 3-layer
  Escape/backdrop unwind with lifted edit state), sort-menu keyboard access added;
  accepted: single coarse `isPending` (per-control granularity deferred), `createClient`
  action name (no collision).
- **Unit tests**: 24 pacing tests (billing windows incl. year-boundary/leap/reset-day
  edges, all band thresholds, overrides, client join, trend) — 37 total green.
- **Gate**: type-check clean, lint 0 errors, build clean (`/clients` dynamic route).
- **Migration applied** to `ad-op-tools` (PG 17.6) and probed: cross-org override insert
  → FK violation ✓; cross-org connection assignment → FK violation ✓; client delete →
  overrides cascaded, connection detached, 71 spend rows untouched ✓; org_id change →
  "org_id is immutable" ✓; org-with-clients delete blocked (NO ACTION, by design) ✓;
  probe rows cleaned up (final state: 1 org, 0 clients, 3 connections, 71 entries);
  security advisors clean except the two accepted standing items.
