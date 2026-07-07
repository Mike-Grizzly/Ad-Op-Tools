# Architecture Blueprint — Systems to Build & How

> Written 2026-07-07 from a full architecture review (`architect` agent + manual code reading
> of every integration/budget/auth file). **This document is self-contained on purpose** — it
> is written for a future build session that has no memory of this review. Read it together
> with `docs/roadmap.md` (phase order) and `docs/security-plan.md` (the security counterpart
> produced in the same review). When an item here is built, update this doc and
> `docs/current-status.md`.

## How to read this

- **Section 1** — where the codebase stands and what was verified.
- **Section 2** — the verdict: what holds up, what will break in Phase 2+.
- **Section 3** — the systems to build, each with a concrete build recipe (files, tables,
  routes, order) and a size (S ≈ half–one session, M ≈ 1–2, L ≈ 3–5).
- **Section 4** — sequencing table merging these systems into the existing roadmap.
- **Section 5** — product feature suggestions beyond the current roadmap.
- **Section 6** — decisions the owner must make (mostly new-dependency approvals; the
  working-style rules forbid adding libraries without explicit approval).

---

## 1. Where the project stands (verified 2026-07-07)

Live in production (`ad-op-tools.vercel.app`, Vercel + Supabase project `ad-op-tools`),
manually verified:

- **UTM Generator** (`src/features/utm/`) — form, templates, history, URL Library, detail
  drawer with edit/delete.
- **Budget Dashboard, Meta read-only** (`src/features/budget/`) — real Meta OAuth connect,
  on-demand sync pulling real spend, caps, full dashboard UI.
- **Integration foundation** — `AdPlatformClient` interface (`src/types/integrations.ts`),
  AES-256-GCM token store (`src/lib/integrations/token-crypto.ts` + `connections.ts`), Meta
  Marketing API client (`src/lib/integrations/meta/`), Meta OAuth routes
  (`src/app/api/integrations/meta/{connect,callback}/route.ts`).
- **Tables** (all RLS-enabled, all scoped `user_id = auth.uid()`): `utm_templates`,
  `utm_history`, `platform_connections`, `budget_entries`, `budget_caps`.

Not built: everything in Phases 2–4 of `docs/roadmap.md`, plus every cross-cutting SaaS
system in Section 3 below. There is no signup page (login only), no password reset, no test
runner, no CI workflows, no background jobs, no billing.

## 2. Verdict on the current architecture

**The data model is sound and Phase-2-ready. The orchestration and tenancy layers are the
gaps.** Specifically:

### Holds up — do not rework
- Canonical spend model: integer `spend_micros` + per-row `currency`, idempotent upsert key
  `(user_id, platform, external_account_id, campaign_external_id, entry_date)`. Correct;
  keep as the standing guardrail.
- Platform mapping confined to each platform's `transforms.ts`. The Meta `spendToMicros`
  does string math (no float multiply) — replicate that in every future platform transform.
- Token-at-rest crypto: AES-256-GCM, fresh IV per encrypt, AAD binds ciphertext to
  `user:platform:account`, key-versioned (`token_key_id`), tag-mismatch throws. Solid.
- The `platform` CHECK constraints in the three tables already enumerate all four planned
  platforms (`meta, google_ads, linkedin, tiktok`) — **adding Google Ads requires no
  constraint migration**. Only a 5th, unplanned platform would.

### Will break or hurt in Phase 2+ — fix before adding Google
1. **No platform dispatch.** `syncBudget` (`src/features/budget/actions.ts`) hardcodes
   `if (platform !== 'meta')` and calls `createMetaClient(accessToken, appSecret)` directly.
   The `AdPlatformClient` interface exists but nothing dispatches on it, and the factory
   signature leaks Meta-shaped credentials (Google needs `developer_token` +
   `login_customer_id` instead of an app secret).
2. **No token refresh.** `getConnectionWithTokens` decrypts and returns; nothing reads
   `token_expires_at`. Fine for Meta (~60-day long-lived token, no refresh token). **Google
   access tokens expire in ~1 hour** — Google sync is hard-blocked on a refresh lifecycle.
3. **Sync is inline, synchronous, user-triggered only.** The whole loop lives inside the
   `"use server"` action: bounded by the Vercel function timeout, and data is only as fresh
   as the last manual "Sync" click. The roadmap's own guardrail ("sync is a pure function
   over an `AdPlatformClient`") is stated but not honored by the code.
4. **Everything is `user_id`-scoped — no organization/workspace layer.** Billing, teams, and
   shared connections all need an org concept, and every table Phases 2–4 add will need
   retrofitting if this isn't done first. Today the tables are near-empty and there is one
   user: this change is nearly free now and expensive forever after.

## 3. Systems to build (with build recipes)

### 3.1 Organization / workspace layer — **build FIRST, before Phase 2** (M)

**Why:** multi-tenant SaaS needs orgs (teams, billing per company, shared platform
connections). Retrofitting later means data backfill, Stripe-customer coordination, and
rewriting every query added in the meantime. Now it is a pure schema/RLS indirection; the UI
can remain single-user (one implicit personal org).

**Build recipe:**
1. Migration (one file, RLS in the same migration per house rules):
   - `organizations` — `id uuid pk`, `name text`, `created_at`.
   - `organization_members` — `org_id fk`, `user_id fk`, `role text check (role in ('owner','admin','member'))`, unique `(org_id, user_id)`.
   - SQL helper `public.is_org_member(org uuid) returns boolean` (`security definer`, pinned
     `search_path` — copy the pattern from `20260626020000_harden_set_updated_at_search_path.sql`).
   - Add `org_id uuid not null references organizations` to `platform_connections`,
     `budget_entries`, `budget_caps`, `utm_templates`, `utm_history`.
   - Rewrite RLS policies from `(select auth.uid()) = user_id` to
     `is_org_member(org_id)` (keep `user_id` columns as "created by").
   - Append-only `audit_log` table (see 3.10) — land it in this same migration.
2. Auto-create a personal org + owner membership on signup (Postgres trigger
   `handle_new_user` on `auth.users`, or in `src/app/auth/callback/route.ts`).
   Backfill the one existing user's rows with their personal org id.
3. New `src/features/org/{queries,actions,validation}.ts` (get current org, invite member —
   invites can be a later slice; the schema is the point now).
4. Update every existing `queries.ts`/`actions.ts` to resolve and scope by org, and
   hand-update `src/types/database.ts`.

### 3.2 Platform client factory / dispatch seam — **before Google** (S)

Replace the hardcoded Meta wiring with one seam:

```
src/lib/integrations/factory.ts
  getClientForConnection(conn: ConnectionWithTokens): AdPlatformClient
```

Each branch assembles its own app-level credentials internally (Meta: `META_APP_SECRET`;
Google: `GOOGLE_ADS_CLIENT_ID/SECRET` + `GOOGLE_ADS_DEVELOPER_TOKEN`). `syncBudget` (and the
future cron) call the factory and stay platform-blind. Delete the
`if (platform !== 'meta')` guard only when the factory throws a typed "unsupported
platform" error instead.

### 3.3 Transport-agnostic sync core + scheduled background sync — **Phase 2** (M)

**Decision recommended: Vercel Cron hitting an internal API route.** Rationale: sync code,
crypto, and platform clients are Node/TS in this repo with all secrets already in Vercel.
Supabase Edge Functions run Deno with a separate secret store — the crypto + client layer
would have to be duplicated in a second runtime. A queue (Inngest/QStash) is premature at
this scale; adopt one only when users × accounts × platforms exceeds the function time
budget per invocation.

**Critical wrinkle:** cron has no user session, so it cannot use the SSR client + RLS. It
must use the **service-role key** (already set in Vercel, currently unused by design) and
scope every query explicitly in code, because service role bypasses RLS.

**Build recipe (order matters):**
1. Extract the loop body of `syncBudget` into
   `src/features/budget/sync-core.ts` — a pure function
   `syncConnections(supabase, scope, opts)` taking a Supabase client + org/user scope.
   The server action becomes a thin caller passing the session client.
2. `src/lib/supabase/service.ts` — service-role client. Add a top-of-file comment: **only
   importable from cron/webhook routes, never from user-request paths, and it must never
   SELECT token columns beyond what `connections.ts` needs.**
3. `src/app/api/cron/sync/route.ts` — rejects requests unless
   `Authorization: Bearer ${CRON_SECRET}` matches (Vercel sends this automatically for cron
   when `CRON_SECRET` env var is set; document it in `.env.example`). Iterates orgs with
   connected platforms, calls the sync core with a small date range (e.g. last 3 days —
   platforms restate recent spend), throttled to a few accounts in parallel.
4. `vercel.json` — `{"crons": [{"path": "/api/cron/sync", "schedule": "0 6 * * *"}]}`
   (daily is enough to start; hourly later).

### 3.4 Token refresh lifecycle — **Phase 2, hard-blocks Google** (S–M)

Add to `src/lib/integrations/connections.ts`:

```
getFreshConnectionWithTokens(platform, externalAccountId)
```

- Reads `token_expires_at`; if within a skew buffer (e.g. 5 min) of expiry, calls a
  per-platform `refreshAccessToken(conn)` hook: Meta = none (mark `expired`; user must
  reconnect), Google = POST `https://oauth2.googleapis.com/token` with the stored refresh
  token (`src/lib/integrations/google-ads/refresh.ts`), then re-encrypt + persist via the
  existing `saveConnection`, and flip `status` to `'expired'` when refresh fails.
- Switch `sync-core.ts` to call this instead of `getConnectionWithTokens`. Because the seam
  is added before Google exists, Google drops in without touching call sites.

### 3.5 Sync-job status & observability — **Phase 2, same slice as cron** (M)

Unattended cron without run history is flying blind. Migration: `sync_jobs`
(`id, org_id, user_id, platform, external_account_id, trigger 'manual'|'cron',
status 'pending'|'running'|'success'|'error', rows_synced int, error_message text,
started_at, finished_at`; RLS `is_org_member(org_id)`). `sync-core.ts` writes one row per
run. Budget UI shows "last synced / last failure" from `getSyncJobs()` in
`src/features/budget/queries.ts`.

### 3.6 Error tracking — **before unattended cron matures** (S)

Add `@sentry/nextjs` (**new dependency — needs owner approval**, see Section 6). Instrument
server actions, the cron route, and OAuth callbacks. Without it, cron failures are invisible
(`console.log` is banned and `ActionResult` strings evaporate).

### 3.7 Rate limiting — two different problems (S + M)

- **Platform-API quota (M, Phase 2):** the Meta client already retries/backs off; give
  Google the same. In `sync-core.ts`, cap concurrent account syncs (simple
  `Promise`-pool of 2–3) so multi-account fan-out doesn't burn one platform's quota.
- **App-endpoint abuse (S, launch-readiness):** `syncBudget` and the OAuth routes are
  unthrottled. Simplest: a per-user cooldown column check (`last_synced_at` within N
  minutes → refuse). A proper limiter (Upstash `@upstash/ratelimit`) is a new dependency —
  needs approval.

### 3.8 Billing / subscriptions (Stripe) — **launch-readiness** (L)

Must be **org-scoped** (another reason 3.1 goes first). Build: `stripe` +
`@stripe/stripe-js` deps (**approval needed**); `subscriptions` table keyed by `org_id`
(`stripe_customer_id, stripe_subscription_id, price_id, status, current_period_end`; RLS);
webhook route `src/app/api/webhooks/stripe/route.ts` (must read the **raw body** for
signature verification — do not JSON-parse first); server actions for Checkout session +
Customer Portal; a `getPlan(orgId)` helper for feature gating. Env:
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — add to
`.env.example`.

### 3.9 Onboarding & account management — **launch-readiness** (M)

Today there is a login page only — **no signup page exists** (middleware already allows
`/signup`), and no password reset/change (tracked as AUTH-001 in `docs/open-questions.md`).
Build: `(auth)/signup` page; `resetPasswordForEmail` + reset page + change-password screen;
personal-org creation hook (ties to 3.1); a first-run checklist on the dashboard (connect a
platform → run first sync → generate first UTM). Confirm Supabase SMTP is configured for
auth emails (or use magic-link OTP which needs no custom SMTP).

### 3.10 Transactional email — **launch-readiness; first message wanted in Phase 2** (S–M)

Recommend Resend (`resend` dep — **approval needed**) behind `src/lib/email/`. The first
high-value message is "your Meta connection expired / sync failed — reconnect", which pairs
directly with 3.4/3.5. Later: welcome email, billing receipts (Stripe sends its own).

### 3.11 Audit logging — **table now, call sites from Phase 3** (S, then ongoing)

Append-only `audit_log` (`id, org_id, actor_user_id, action text, target text, metadata
jsonb, created_at`; RLS: members can read their org's log; INSERT via server code only).
Land the table in the 3.1 migration; add a `logAudit()` helper; begin writing entries at
every mutation once write-path features exist (GTM publish, creative clone, disconnects,
cap changes). GTM/Creative mutate live ad accounts that spend real money — "who did what
when" is not optional there.

## 4. Sequencing — merged with the existing roadmap

| Order | Item | Size | Blocks |
|-------|------|------|--------|
| 1 (pre-Phase-2) | Org/workspace layer + `audit_log` table (3.1, 3.11) | M | Billing, teams; every future table |
| 2 (pre-Phase-2) | Client factory seam (3.2) | S | Google client |
| 3 (pre-Phase-2) | Extract `sync-core.ts` from the action (3.3 step 1) | S–M | Cron, refresh |
| 4 (Phase 2) | Token refresh lifecycle (3.4) | S–M | Google sync at all |
| 5 (Phase 2) | Google Ads client + OAuth route (existing roadmap) | M | — |
| 6 (Phase 2) | Vercel Cron background sync + service client (3.3) | M | Fresh data, alerts |
| 7 (Phase 2) | `sync_jobs` observability (3.5) + Sentry (3.6) | M+S | Unattended cron |
| 8 (Phase 2) | Custom Reporting on `budget_entries` (existing roadmap) | M–L | — |
| 9 (Phase 3) | GTM automation (existing roadmap) + audit-log call sites | L | — |
| 10 (launch) | Signup/reset/onboarding (3.9), Stripe (3.8), email (3.10), endpoint rate limits (3.7), dev/prod Supabase split | L total | Paying users |
| 11 (Phase 4) | Creative Asset Manager (existing roadmap) | XL | — |

Also fold in (small, opportunistic): extend `token-crypto.getKey()` to a key map before any
rotation; migrate `middleware.ts` to Next 16's `proxy` convention; switch
`src/types/database.ts` to `supabase gen types` at the dev/prod split (blocked until the
UTM-004 policy-shape divergence is reconciled).

## 5. Product suggestions beyond the current roadmap

Grounded in what the data model already supports:

1. **Budget pacing alerts** (after 3.3 + 3.10): caps already exist in `budget_caps`; once
   sync runs on cron, evaluate pace (spend-to-date vs cap × day-of-month fraction) and email
   "you'll blow the Meta cap by the 22nd". This is the single feature that most turns the
   dashboard from a viewer into a tool that earns its subscription.
2. **Connection-health surface**: `platform_connections.status` already tracks
   `expired`/`error` — show a banner + send the 3.10 email. Cheap, high trust value.
3. **UTM ↔ spend linking**: `utm_history.campaign` and `budget_entries.campaign_name` can be
   joined loosely — a report of "spend by UTM campaign" bridges the two shipped features and
   is a unique selling point over a plain spend dashboard.
4. **CSV export** of `budget_entries` and the URL Library — trivial (a route handler
   streaming CSV), disproportionately requested by ops users who live in spreadsheets.
5. **Weekly email digest** (after 3.10): spend by platform, pace vs caps, top movers.
6. **Display-currency normalization**: rows keep native `currency` (correct at rest); add a
   per-org display currency + daily FX rate table for the dashboard totals when mixed
   currencies appear.
7. **Saved views / dashboard customization** — already user-requested (BUDGET-002).

Added 2026-07-07 (user direction — see open-questions PRODUCT-001 / INT-002):

8. **Automated rules engine** (Revealbot/Bïrch-style): user-defined rules like "pause ad
   when 3-day ROAS < 1.8" evaluated on a schedule against synced metrics, executing
   platform write actions with full audit logging. Prerequisites: conversion/lead metrics
   in the sync (today only spend/impressions/clicks), ad-group/ad-level granularity in
   `budget_entries` (today campaign-level), write scopes (`ads_management` etc.), write
   methods on `AdPlatformClient`, and the cron infrastructure (3.3). This is Phase 3–4
   territory; the rules engine is also the execution layer the AI assistant (below) needs.
9. **In-app Claude assistant**: natural-language commands mapped to the app's existing
   server actions via Claude API tool use (Anthropic TypeScript SDK, server-side only).
   Two risk tiers: read-side (edit report configs — "add a chart showing top ad groups by
   leads") executes freely because a report config is just Zod-validated JSON; write-side
   ("pause all ads with ROI < 0.7") must always preview the affected entities and require
   explicit user confirmation before executing, and every execution is audit-logged. The
   feature-module pattern (auth-checked, Zod-validated server actions) maps 1:1 to tool
   definitions, so the assistant is a thin layer once the underlying capabilities exist.
   Sequence: read-side after Custom Reporting ships (Phase 2); write-side after the rules
   engine / write path. New server-only env var `ANTHROPIC_API_KEY`; new dependency
   `@anthropic-ai/sdk` (approved category: needs the same owner sign-off as other deps).
10. **StackAdapt integration**: feasible — StackAdapt has a GraphQL Public API
    (docs.stackadapt.com) + official TypeScript SDK covering campaign management and
    reporting. Differences from Meta/Google: auth is an **API key requested from
    StackAdapt** (account-tied, not a self-serve OAuth app), so the connect flow is
    "paste API key" (encrypted with the existing token store) instead of an OAuth
    redirect, and the `platform` CHECK constraints in 3 tables must gain a
    `'stackadapt'` value (the first platform outside the original four).

## 6. Decisions the owner must make before building

The working-style rules forbid new libraries without approval. Approvals needed, by phase:

| Dependency | For | Phase |
|------------|-----|-------|
| `@sentry/nextjs` | Error tracking (3.6) | Phase 2 |
| `resend` | Transactional email (3.10) | Phase 2–launch |
| `stripe`, `@stripe/stripe-js` | Billing (3.8) | Launch |
| `@upstash/ratelimit` + `@upstash/redis` (or accept cooldown-column approach) | Rate limiting (3.7) | Launch |
| `vitest` | Unit tests for transforms + token-crypto (TEST-001) | Any time |

Non-dependency decisions:
- Confirm org layer now vs later (this doc strongly recommends **now** — Section 3.1).
- Confirm Vercel Cron (vs Supabase Edge Functions / queue) for background sync — Section 3.3.
- Phase 2 lead: Google Ads first or Custom Reporting first (roadmap default: Google first).
- Start **Google Ads Developer Token application** and **Meta App Review + Business
  Verification** now — both have multi-day/week lead times and gate Phase 2 testing and
  external users respectively.
