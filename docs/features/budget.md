# Feature: Budget Dashboard

**Status**: ✅ **COMPLETE & LIVE** — manually verified in production **2026-06-26**: connected a real
Meta account via OAuth and Sync pulled real spend into the dashboard on `ad-op-tools.vercel.app`.
Integration foundation + budget data/sync/OAuth layer + monthly caps + the full `/budget` UI; passed
database + security×2 + ad-platform + react/code reviews (type-check/lint/build green); migrations
applied to `ad-op-tools` (RLS verified). Gating decisions (settled): Meta first; app-side AES-256-GCM
token encryption; one shared Supabase project for now (dev/prod split deferred to launch).
**Future (backlog):** user wants small Budget Dashboard customization features after more is built
(open-questions BUDGET-002). See `docs/roadmap.md`.

## Goal & user value

Pull real spend from connected ad platforms into one unified view, replacing the Excel sheet
that only tracks monthly caps. First slice ships **Meta, read-only**: connect an account, sync,
see real numbers. Read-only means the worst failure is a wrong number on screen — never a
mutated live campaign — which is why it's the right place to prove the integration layer.

## Scope (Phase 1: Meta only)

In: Meta OAuth connect/disconnect, on-demand spend sync, unified spend views (summary, by
platform, by campaign), date-range selection. Out (later phases): Google/LinkedIn/TikTok
(Phase 2), scheduled background sync (Phase 1+ via Vercel Cron), writes of any kind.

## Architecture / foundation introduced here

- `src/types/integrations.ts` — `AdPlatform` enum, `CanonicalSpendRow` (money as integer
  `spend_micros` + per-row `currency`), `AdPlatformClient` interface (**read-only methods only**:
  `listCampaigns`, `getDailySpend`).
- `src/lib/integrations/connections.ts` — server-only token store (`getConnection`,
  `saveConnection`, `markConnectionError`); encrypt/decrypt token columns here.
- `src/lib/integrations/meta/{client,types,transforms}.ts` — Meta Graph API wrapper; `transforms.ts`
  is the only place Meta-specific mapping lives.
- `src/app/api/integrations/meta/{connect,callback}/route.ts` — OAuth flow; state/CSRF tied to
  user; Zod-validate every callback param; mirror `src/app/auth/callback/route.ts`.

## Data model (migration + RLS in the same file)

- `platform_connections` — `id`, `user_id` (FK `auth.users`, cascade), `platform`,
  `external_account_id`, encrypted token columns + `token_expires_at`, `status`, `scopes`,
  timestamps. Unique `(user_id, platform, external_account_id)`; index `(user_id, platform)`.
- `budget_entries` — `id`, `user_id` (FK, cascade), `platform`, `account_id`, `campaign_external_id`,
  `campaign_name`, `entry_date`, `spend_micros bigint`, `currency`, `impressions`, `clicks`,
  `synced_at`. Unique `(user_id, platform, campaign_external_id, entry_date)` for idempotent
  upserts; index `(user_id, entry_date desc)`.
- RLS enabled on both, all four operations, `auth.uid() = user_id`. Then hand-update
  `src/types/database.ts`. (`campaigns` table deferred — not needed until Creative/GTM.)

## Feature module (`src/features/budget/`)

- `validation.ts` — `dateRangeSchema`, `syncBudgetSchema`, `oauthCallbackSchema`.
- `queries.ts` — `getConnections` (**never selects token columns** — explicit column list),
  `getBudgetEntries`, `getSpendByPlatform`, `getSpendByCampaign`.
- `actions.ts` (`"use server"`) — `syncBudget` (auth-first → load connection → Meta client →
  `getDailySpend` → transform → upsert → `revalidatePath('/budget')`), `disconnectPlatform`.
- `constants.ts` — platform display metadata, default sync window. (Never in the `"use server"` file.)
- `components/` — small client shell + presentational tiles (summary cards, platform breakdown,
  campaign table, connect-platform card).
- Route: `src/app/(dashboard)/budget/page.tsx` (server component, parallel fetch). Nav item
  already present in `dashboard-shell.tsx`.

Double permission check: auth-first in actions (security) AND controls render only when
appropriate (UX).

## Manual test gate (nothing is "complete" until these pass)

1. Connect Meta via real OAuth → redirected back, shown connected.
2. Second user cannot see user-one's connection or rows (RLS).
3. Sync → real rows in `budget_entries`; tiles match Meta Ads Manager for the same range.
4. Re-sync same range → no duplicates (upsert idempotency holds).
5. Token columns never appear in any browser payload.
6. Disconnect → connection removed; dashboard returns to connect-prompt state.

## Review agents

`architect` up front (defines integration architecture for all later phases), then
`database-reviewer` (token table + RLS + encryption), `security-reviewer` (OAuth + token storage +
token-column exclusion), `ad-platform-reviewer` (Meta client/transforms/refresh),
`typescript-reviewer`, `react-reviewer`, `code-reviewer`.

## Risks / unknowns

- Token-at-rest encryption (SEC-001) is a security boundary — settle before any token is written.
- Meta API permission level (`ads_read`) may gate real-data testing — confirm app access first.
- Multi-currency accounts: `spend_micros` + per-row `currency` stores correctly, but summing
  across currencies in the UI needs a display decision.
- This is the first phase writing live tokens to the DB — strengthens the case for the dev/prod
  split first (INFRA-001).

## Sizing

XL — this is two features' worth: the whole integration foundation + a full Budget slice.

## Update 2026-07-22 — sync architecture

The sync loop no longer lives in `actions.ts`. `src/features/budget/sync-core.ts`
(`syncConnections`) owns connection lookup → client dispatch → spend upsert →
status marking, with the Supabase client and session-bound helpers injected
(`SyncDeps`). `syncBudget` is a thin session shim: auth/org + zod + default range +
mapping the core's typed errors to user-facing strings. Platform dispatch goes through
`src/lib/integrations/factory.ts` (blueprint §3.2) — adding a platform never touches
this feature. The future cron route calls the same core with a service-role client
(blueprint §3.3; see the seam note there about connections.ts variants).

## Update 2026-07-23 — token refresh seam

`syncBudget` now injects `getFreshConnectionWithTokens` (blueprint §3.4): the token's
`token_expires_at` is checked before sync, and platforms with a registered refresher
(`src/lib/integrations/refresh.ts` — none yet; Google next slice) get a silent refresh
inside a 5-min pre-expiry window. Meta has no refresh path: nothing changes until a
token is genuinely past expiry, at which point it is marked `expired` before the API
call instead of after a failed one — same user-visible outcome (failure count + a
"reconnect" status pill).
