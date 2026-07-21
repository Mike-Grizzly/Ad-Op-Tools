# Ad Op Tools — Build Roadmap

> Authored 2026-06-25 from an `architect` + `planner` review (both ran independently and
> converged on the same build order). This is the sequencing source of truth. Per-phase
> detail lives in `docs/features/{name}.md`; decisions are logged in `docs/decision-log.md`;
> unresolved gating items are in `docs/open-questions.md`.

## Where we are

**Updated 2026-06-26:** Slices done — **UTM Generator** and **Phase 0+1 (integration foundation +
Budget Dashboard, Meta)** — both live and manually verified in production. The shared
OAuth/integration layer (`src/lib/integrations/`, `AdPlatformClient`, `platform_connections`,
app-side token encryption, Meta client) now exists and is proven end-to-end (real Meta connect +
sync). Remaining: **Phase 2** (next), **Phase 3**, **Phase 4**. The original framing below
(written 2026-06-25, when nothing ad-platform existed) is kept for context.

**Updated 2026-07-20:** The owner's external product spec (committed as
`docs/product-spec-2026-06.md`, with staleness annotations) was merged into this roadmap —
see "Product-spec merge" below. The core phase order is unchanged; the spec adds feature
clusters that slot in around it.

## Guiding principle

Build the integration foundation **through one real platform, not as a standalone
framework.** An OAuth layer with zero consumers can't be manually tested — and "nothing
is complete until manually tested" is a hard rule here. So the foundation ships *with*
the first feature that consumes it, validated by real data on screen. We do **not**
build all four platform clients up front (that would be speculative scaffolding, which
the working-style rules forbid).

## Phase order

| Phase | What | Risk | Size |
|-------|------|------|------|
| **0+1** ✅ | Integration foundation + **Budget Dashboard (Meta, read-only)** — **DONE & LIVE (2026-06-26)** | Read-only | XL |
| **2** ⬅ next | Widen the read-path: **add Google Ads** to Budget and/or **Custom Reporting** on the canonical data | Low — read-only, rides the same model | M each |
| **3** | **GTM Automation** — first write-path feature; reuses Google OAuth | Medium — writes to a live GTM workspace (never auto-publish) | L |
| **4** | **Creative Asset Manager** — last, by design | High — mutates live ad accounts, spends real money | XL |

LinkedIn and TikTok spend are not separate phases — each is "repeat the Phase 2 pattern"
(one client + one OAuth route) whenever wanted.

**Why this order:** Budget is the highest-value feature (it replaces the Excel sheet),
it's read-only so it's the safest place to prove the foundation, and it *defines* the
canonical `campaigns` / `budget_entries` model that Reporting and Creative inherit.
Reporting is nearly free afterward (read/aggregate over data that already exists). GTM is
dependency-isolated and write-oriented, so it's sequenced on value, not dependency, and
reuses OAuth machinery hardened by then. Creative is last because it has the highest blast
radius — build it only once token/refresh/rate-limit are battle-tested.

**Why NOT GTM first** (this overturns the earlier ARCH-002 lean): GTM's "no OAuth
complexity / use service accounts" rationale is wrong. The GTM API requires Google OAuth,
and service accounts are the wrong auth model for multi-tenant GTM (a service account is
*our* GTM, not the user's). GTM carries the same OAuth cost as the spend features but
unlocks only one feature — and it's write-path. Budget-first wins on value and de-risking.

## Product-spec merge (2026-07-20)

The committed spec (`docs/product-spec-2026-06.md`) introduces feature clusters with no prior
presence in the repo docs. They are merged here **by dependency, not by the spec's own sprint
plan** — the infra pre-work in `architecture-blueprint.md` §4 (org layer → factory seam →
sync-core → token refresh → Google Ads → cron → sync_jobs/Sentry → email) stays first because
nearly every spec feature depends on it. Per-feature specs get written at slice start (house
rule: spec before build), using the spec's sections as the product input.

| Spec feature (section) | Slots in | Hard prerequisites |
|---|---|---|
| **Clients + client dashboard** (§6.1) | Immediately after the org layer slice | Org layer (clients are org-scoped rows: org = paying tenant, client = the agency's customer) |
| **Campaign records + Checklist engine** (§2.1) | Any time after Clients; good early-value CRUD slice | Clients; no platform API needed (auto-complete hooks land as their integrations do) |
| **Campaign Naming Generator** (§2.2) | With or right after the checklist slice | Clients (per-client conventions) |
| **Negative Keyword Library** (§5.1) | Any time after Clients (pure CRUD + CSV export) | Clients |
| **Ad Copy Asset Bank + RSA Builder** (§4.1–4.2) | Any time after Clients; CSV export first, grade-sync later | Clients; performance-grade sync needs Google Ads client |
| **UTM extensions** (§0.1: per-client templates, validator, checklist hook) | Fold into a UTM maintenance pass after Clients | Clients (adds `client_id` to utm tables) |
| **Health monitors** (§3.1–3.3: disapprovals, landing pages, conversion tracking) | Phase 2.5 — after Google Ads client + cron + `sync_jobs` + email land | Google Ads client, Vercel Cron (blueprint §3.3), Resend (§3.10) |
| **Account Change Log** (§3.4) | With the monitors (same cron + platform-pull pattern) | Same as monitors (Google `ChangeEvent`, Meta `/activities`). Distinct from the app's own `audit_log` (§3.11) — both exist: change log = what changed *on the platforms*; audit log = what *this app* did |
| **Creative Fatigue Monitor** (§3.5) | After monitors pattern proven (Meta-side, needs metrics widening) | Cron + `ad_metrics` widening (`features/rules-engine.md` Phase A) |
| **Morning Digest email** (§7.2) | After ≥2 monitors exist (it aggregates them). Supersedes blueprint §5.5's "weekly digest" — daily, sectioned | Monitors + email infra |
| **Search Term Triage** (§5.2) | Phase 3+ — first Google Ads **write** surface (staged queue → Apply All) | Google Ads write scope; audit_log call sites; preview+confirm gate |
| **Account Health Audit** (§8.1) | Phase 3+ (on-demand read-only scan; LLM summary optional + labeled) | Google Ads client; several checks need metrics widening |
| **Alert Rules Builder** (§8.2) | **Folds into `features/rules-engine.md`** (repo spec is a superset; its Phase B notify-only rules = this feature) | Per rules-engine spec |
| **Pricing tiers** ($29/$59/$99, §Pricing) | Launch-readiness — recorded as the candidate tier structure for the Stripe work (blueprint §3.8); needs owner confirmation (open-questions PRODUCT-002) | Org layer, Stripe |
| **StackAdapt** (§1.1) | Per INT-002 — GraphQL API-key connect flow, **not** CSV-only (spec is stale here); CSV import optional fallback | Platform CHECK constraint change |

**Adopted from the spec's "Anti-Patterns to Avoid" (now standing guardrails):**
no autonomous bid/budget changes — every platform write is user-confirmed or an explicit
user-enabled rule; no campaign creation from scratch (checklists guide native-platform
creation); LLM features are additive, optional, and labeled — never the core value; flat
pricing only (no % of spend); reporting stays a focused view, not a Looker Studio clone.
These align with the rules-engine safety invariants already on file (off-by-default,
dry-run, audit, cooldown).

## Phase 2 is flexible

The architect put Custom Reporting at #2 (validates the canonical model with a second
consumer); the planner put "add Google Ads to Budget" at #2 (proves the `AdPlatformClient`
abstraction generalizes). Both are low-risk, read-only work on the same data — pick by
appetite. A sensible default: add Google to Budget first (it stress-tests the abstraction
against a structurally different API), then Reporting.

---

## Phase 0+1 — Integration Foundation + Budget Dashboard (Meta, read-only)

**Goal / value:** Connect a Meta Ads account via OAuth and see real spend in a unified
dashboard. First feature touching money data; the consumer that proves the foundation.

**Prerequisites (gating decisions confirmed 2026-06-26 — see decision-log):**
- First platform = **Meta** (confirmed).
- Token-at-rest encryption = **app-side AES-256-GCM** (confirmed); key in `TOKEN_ENCRYPTION_KEY` (server-only, per-env).
- **dev/prod Supabase split before this phase** (confirmed); migration targets the new dev project (SETUP-007).
- **Meta app registered** (SETUP-006, user action): App ID + Secret, redirect URI `…/api/integrations/meta/callback`.

**Work breakdown (vertical slice):**
- **Shared types** — `src/types/integrations.ts` (new): `AdPlatform` enum, `CanonicalSpendRow`
  (money as **integer minor units** `spend_micros` + per-row `currency`), `AdPlatformClient`
  interface with read-only methods only (`listCampaigns`, `getDailySpend`). No write methods
  until a real consumer (Creative) needs them.
- **Token store** — `src/lib/integrations/connections.ts` (new, server-only): `getConnection`,
  `saveConnection`, `markConnectionError`. Encrypt/decrypt token columns here.
- **Meta client** — `src/lib/integrations/meta/{client,types,transforms}.ts` (new). `transforms.ts`
  is the *only* place Meta-specific field mapping lives.
- **OAuth routes** — `src/app/api/integrations/meta/{connect,callback}/route.ts` (new). State/CSRF
  token tied to user; validate every callback param with Zod. Mirror `src/app/auth/callback/route.ts`.
- **Migration** — `platform_connections` + `budget_entries`, RLS enabled in the same migration,
  user-scoped (`auth.uid() = user_id`), per-operation policies. Idempotent upsert key on
  `budget_entries (user_id, platform, campaign_external_id, entry_date)`. Then hand-update
  `src/types/database.ts`. (`campaigns` table deferred until Creative/GTM need campaign objects.)
- **Feature module** — `src/features/budget/{validation,queries,actions,constants}.ts`:
  - `validation.ts`: `dateRangeSchema`, `syncBudgetSchema`, `oauthCallbackSchema`.
  - `queries.ts`: `getConnections` (never selects token columns), `getBudgetEntries`,
    `getSpendByPlatform`, `getSpendByCampaign`.
  - `actions.ts` (`"use server"`): `syncBudget` (auth-first → client → transform → upsert →
    `revalidatePath`), `disconnectPlatform`. Constants stay in `constants.ts`.
- **UI** — `src/app/(dashboard)/budget/page.tsx` (server, parallel fetch) + small client shell +
  presentational tiles (summary cards, platform breakdown, campaign table, connect card).
  Double permission check: auth-first in actions AND controls only render when appropriate.
  (`/budget` nav item already exists in `dashboard-shell.tsx`.)

**Manual test gate:**
1. Connect Meta via real OAuth → redirected back, shown as connected.
2. A second user cannot see user-one's connection or rows (RLS).
3. Sync → real spend lands in `budget_entries`; tiles match Meta Ads Manager for the same range.
4. Re-sync same range → no duplicates (upsert idempotency).
5. Token columns never appear in any browser payload.
6. Disconnect → connection removed, dashboard returns to connect-prompt state.

**Review agents:** `architect` (defines integration arch) up front; then `database-reviewer`
(token table + RLS + encryption), `security-reviewer` (OAuth + token storage + token-column
exclusion), `ad-platform-reviewer` (Meta client/transforms/refresh), `typescript-reviewer`,
`react-reviewer`, `code-reviewer`.

---

## Phase 2 — Read-path widen (Google Ads + / or Custom Reporting)

**Add Google Ads (M):** new `src/lib/integrations/google-ads/` implementing the *same*
`AdPlatformClient` (GAQL `cost_micros` by `segments.date`), new OAuth route, `syncBudget`
becomes platform-dispatched. Likely no migration (the `platform` column generalizes). This is
the step that confirms the abstraction holds — if it needs to change, that's an architecture
signal to log, not bend silently. **Start the Google Developer Token application during Phase 1**
— approval can take days and gates all Google testing.

**Custom Reporting (M–L):** read-only on top of `budget_entries` + a `reports` config table
(saved dashboard layouts). Aggregations + visualization. Light *because* the canonical model
already exists. Could lead Phase 2 if reporting is the higher priority.

**Review agents:** `ad-platform-reviewer` (Google client/GAQL) primary, `security-reviewer`
(second OAuth flow), `typescript-reviewer` (did the interface generalize?), `code-reviewer`;
`database-reviewer` if any column/table is added.

---

## Phase 3 — GTM Automation (first write-path)

**Goal / value:** A "New Campaign" wizard that creates the standard tag/trigger/conversion
stack in the user's GTM container in one click.

**Notes:** Reuses Phase 2's Google OAuth plumbing (different API + scopes). Writes to a GTM
**workspace** and never auto-publishes. `gtm_accounts` table + RLS. GTM client lives in
`src/lib/integrations/gtm/` but does **not** implement `AdPlatformClient` (different contract).
Add the missing `/gtm` nav item to `dashboard-shell.tsx` in this phase.

**Open spec gap:** the concrete "standard pixel stack" (which tags/triggers/conversions, for
which platforms) needs a product spec in `docs/features/gtm.md` before build.

**Review agents:** `architect` (write-path + idempotency), `ad-platform-reviewer` (GTM
write semantics) primary, `security-reviewer` (third OAuth + destructive write action),
`database-reviewer`, `react-reviewer`, `typescript-reviewer`, `code-reviewer`.

---

## Phase 4 — Creative Asset Manager (last)

Highest blast radius: reads + **writes/clones** to live ad accounts, plus Supabase Storage for
asset metadata and per-platform creative-spec divergence. `creative_assets` table + Storage
buckets. Build only after token/refresh/rate-limit are proven across Budget + Reporting so the
only *new* risk is the write/creative surface, isolated rather than compounded.

---

## Architectural guardrails (apply to every platform phase)

- **Money** is stored as integer minor units (`spend_micros`/`spend_cents`) + per-row `currency`. Never floats.
- **Idempotent upserts** on `(…, date)` keys so on-demand and scheduled syncs can't double-count.
- **Sync logic is transport-agnostic** — a pure function over an `AdPlatformClient`, callable from
  on-demand (Phase 1), Vercel Cron (Phase 1+), or a future queue. Start on-demand; defer cron;
  defer a queue until scale forces it.
- **Token columns** are encrypted at rest and never selected into anything the browser receives.
- **RLS** ships in the same migration as every table.
- **`transforms.ts`** is the only place platform-specific mapping is allowed — keeps consumers platform-blind.
