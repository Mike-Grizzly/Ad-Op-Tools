# Current Status

## Project Phase
**Feature Slice 1: UTM Generator — Built and manually tested in production. Complete.**
UTM generator + URL Library + edit/delete + detail drawer verified working in production by the
user (2026-06-26).

**Phase 0+1 — integration foundation + Budget Dashboard (Meta, read-only): COMPLETE & LIVE.**
(`docs/roadmap.md`). Shipped to production (`main` → `ad-op-tools.vercel.app`) and **manually verified
end-to-end on 2026-06-26**: connected a real Meta account via OAuth and Sync pulled real spend into the
dashboard. Backend + UI were reviewed (database + security×2 + ad-platform + react/code); migrations
applied to `ad-op-tools` (RLS verified). Includes AES-256-GCM token store, Meta Marketing API client,
budget queries/actions (sync/disconnect/setCaps), Meta OAuth routes, monthly caps, and the full
`/budget` UI.
Phase 1 gating decisions (settled): Meta first; app-side AES-256-GCM token encryption; one shared
Supabase project for now (dev/prod split deferred to launch). **Next:** Phase 2 — widen the read-path
(add Google Ads and/or Custom Reporting). User also wants small Budget Dashboard customization features
later (after more is built) — see open-questions BUDGET-002.

## What Exists — Code

### Foundation
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4
- `src/lib/supabase/server.ts` / `client.ts` — SSR + browser Supabase clients (`@supabase/ssr`)
- `src/middleware.ts` — auth gate; unauthenticated users redirected to `/login`
- `src/app/(auth)/login/` — login page + client form (`signInWithPassword`)
- `src/app/auth/callback/route.ts` — code → session exchange
- `src/app/(dashboard)/layout.tsx` — auth-protected shell with nav + sign-out
- `src/features/auth/` — sign-out server action + button
- `src/types/database.ts` — hand-maintained (see database state below)
- `.env.example` — all env vars documented with placeholders

### UTM Generator (`src/features/utm/`)
- `validation.ts` — Zod schemas: `utmParamsSchema` (includes `ad_set`, `creative`), `saveTemplateSchema`, `utmHistoryIdSchema` (uuid for edit/delete)
- `constants.ts` — `UTM_SOURCES`, `UTM_MEDIUMS` dropdown options
- `actions.ts` — six server actions:
  - `generateAndSaveURL` — builds and persists tagged URL
  - `updateUTMHistory` — edits a history entry's params, rebuilds `generated_url` server-side (user-scoped)
  - `deleteUTMHistory` — removes a history entry (user-scoped)
  - `saveTemplate` — saves reusable parameter template
  - `deleteTemplate` — removes template (user-scoped)
  - `getAutocompleteSuggestions` — prefix search on `campaign` or `base_url` with field whitelist
- `url.ts` — shared client-side preview URL builder (`buildPreviewUrl`), used by the form and the detail drawer
- `queries.ts` — `getUTMTemplates()`, `getUTMHistory(limit=500)`
- `components/utm-form.tsx` — form with `AutocompleteInput` on Campaign + Base URL, optional Ad Set + Creative fields, live URL preview, template load/save
- `components/utm-history-table.tsx` — Recent URLs sidebar; shows last 20; UTM tail + full URL copy buttons with 1.5s green checkmark feedback
- `components/utm-url-library.tsx` — spreadsheet table for all entries; group-by (All / Source / Campaign), collapsible headers, text filter, copy buttons; rows are clickable and open the detail drawer
- `components/utm-detail-drawer.tsx` — right-side slide-over styled to the `Ad Op Tools UI Design/detail-drawer/` Claude Design export; view all params, edit any field (live preview, rebuilds URL on save), delete with inline confirm; disabled analytics placeholder for later
- `components/utm-page-client.tsx` — client shell wiring all components together; owns drawer state + optimistic update/delete
- `app/(dashboard)/utm/page.tsx` — server component fetching templates + history, rendering `UTMPageClient`

### Budget Dashboard (Phase 0+1) — COMPLETE & LIVE (manually verified in production 2026-06-26)
Reviewed by database, security (token layer + OAuth), ad-platform, and react/code agents;
type-check/lint/build green. Migrations applied to `ad-op-tools`; Meta OAuth connect + Sync verified
pulling real spend on `ad-op-tools.vercel.app`.
- `src/types/integrations.ts` — `AD_PLATFORMS`/`AdPlatform`, `CanonicalSpendRow` + `CanonicalCampaign` (mirror `budget_entries`), `AdPlatformClient` interface (read-only)
- `src/lib/integrations/token-crypto.ts` — AES-256-GCM encrypt/decrypt (fresh IV, AAD-bound, key-versioned via `token_key_id`)
- `src/lib/integrations/connections.ts` — server-only token store + sole decrypt path: `getConnectionWithTokens`, `saveConnection`/`saveConnections`, `markConnectionStatus`
- `src/lib/integrations/meta/{client,types,transforms,constants}.ts` — Meta Marketing API client (`AdPlatformClient`): campaigns + daily spend; typed `MetaApiError`, retry/backoff, `appsecret_proof`
- `src/features/budget/{validation,constants,queries,actions}.ts` — Zod schemas; `getConnections` (token-free) + `getBudgetEntries` + `getCaps`; `syncBudget` + `disconnectPlatform` + `setCaps`
- `src/app/api/integrations/meta/{connect,callback}/route.ts` — Meta OAuth: CSRF state, code → long-lived token, save a connection per ad account
- `src/app/(dashboard)/budget/page.tsx` + `src/features/budget/components/*` — full dashboard UI: pacing hero, KPI row, spend-over-time chart, by-platform donut, monthly-cap widget (view/edit), grouped/sortable/searchable campaign table, connection management, per-campaign detail drawer. Built from `Ad Op Tools UI Design/budget/`; additive (shell/login/UTM untouched). Two files modestly exceed the 300-line convention (campaign-table 346, helpers 362) — cohesive; flagged for optional later extraction.

## What Exists — Infrastructure
- GitHub repo: `mike-grizzly/ad-op-tools`
- Supabase project `ad-op-tools` (us-east-1, id `fwzltthkcwthuuptqlby`)
- Vercel project linked to GitHub
  - Domains: `ad-op-tools.vercel.app` (primary) + `ad-op-tools-mike-grigsby-s-projects.vercel.app`
  - Env vars set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - Budget env vars set: `TOKEN_ENCRYPTION_KEY` (32-byte base64), `APP_ORIGIN` (= `https://ad-op-tools.vercel.app`), `META_APP_ID`, `META_APP_SECRET`
  - **`ad-op-tools.vercel.app` is the production alias for `main`** (Option A; the alias had drifted to a stale deployment and was re-pointed — the cause of the earlier prod 404s)
- Supabase Auth URL config: Site URL + redirect URLs for both Vercel domains
- Meta app registered (dev mode, owner's own ad account); OAuth redirect URI `https://ad-op-tools.vercel.app/api/integrations/meta/callback` registered. `ads_read` scope.

## Database State
- Migrations tracked in `supabase/migrations/`:
  - `20260624000000_create_utm_tables.sql` — creates `utm_templates` and `utm_history` with RLS
  - `20260625000000_utm_history_add_columns.sql` — adds `ad_set`, `creative` columns; adds prefix-search indexes
  - `20260626000000_utm_history_update_policy.sql` — granular UPDATE RLS policy on `utm_history` (for the edit feature). **Not applied to remote** — see note below.
  - `20260626000000_create_platform_connections_and_budget.sql` — `platform_connections` (encrypted OAuth tokens, key-versioned, `set_updated_at` trigger) + `budget_entries` (spend, idempotent upsert key); RLS on both with `(select auth.uid())`. **Applied to `ad-op-tools` 2026-06-26.**
  - `20260626010000_create_budget_caps.sql` — `budget_caps` (monthly cap per user per scope, amount in micros; RLS + `set_updated_at` trigger). **Applied to `ad-op-tools` 2026-06-26.**
  - `20260626020000_harden_set_updated_at_search_path.sql` — pins `set_updated_at` `search_path` (Supabase security advisor 0011). **Applied 2026-06-26.**
- RLS enabled on both tables; policies are user-scoped (`user_id = auth.uid()`)
- **Tracked-vs-remote RLS divergence**: the remote DB was provisioned manually with a single consolidated `FOR ALL` policy per table (`users manage own utm_*`, `USING`/`WITH CHECK = auth.uid() = user_id`), which already permits UPDATE/DELETE. The tracked migrations instead use granular per-command policies. Effective permissions are identical; the new UPDATE-policy migration keeps the granular tracked lineage complete for fresh environments (e.g. dev/prod split). Do not `supabase db pull` over the tracked migrations. See decision-log 2026-06-26 and open-questions UTM-004.
- `src/types/database.ts` is hand-maintained (not auto-generated from Supabase CLI); reflects current schema

## Not Built Yet
(See `docs/roadmap.md` for build order.)
- Custom reporting / additional platforms (Phase 2 — next)
- Budget Dashboard customization features (user-requested; backlog after more is built — see open-questions BUDGET-002)
- GTM automation (Phase 3)
- Creative asset manager (Phase 4)
- Dev/prod Supabase project split (deferred to launch — one shared project for now, per user 2026-06-26)

## Planning Coverage Index (as of 2026-07-07)

Where the build steps and security treatment for everything planned actually live:

| Item | Build steps | Security treatment |
|---|---|---|
| Security hardening (open redirect, query scoping, headers, CI, tests) | `security-plan.md` §4 "Now" items 1–7 | is the security doc |
| Org/workspace layer + audit_log | `architecture-blueprint.md` §3.1, 3.11 | RLS rewrite spec'd in same section |
| Client factory / sync-core / token refresh / service client | blueprint §3.2–3.4 + §4 | service-role discipline: security-plan §3 last bullet |
| Vercel Cron background sync + sync_jobs + Sentry | blueprint §3.3, 3.5, 3.6 | CRON_SECRET guard + service-role rules in recipe |
| Google Ads (Phase 2) | roadmap Phase 2 + blueprint §3.2/3.4 | second OAuth flow follows the audited Meta pattern; state user-binding noted in BUDGET-001 |
| ad_metrics widening (conversions, ad-level) | `features/rules-engine.md` Phase A | RLS/no-delete/micros in spec |
| Rules engine (notify → write) | `features/rules-engine.md` Phases B–C | safety invariants section (off-by-default, dry-run, audit, cooldown) |
| AI assistant | `features/ai-assistant.md` | safety model section (tool tiers, no-execute-tool design, injection test gate) |
| Billing (Stripe), onboarding/auth, email, rate limiting | blueprint §3.7–3.10 | webhook signature, reset-flow items in security-plan §4 launch gate |
| StackAdapt | open-questions INT-002 (pattern + API-key connect flow) | key stored via existing encrypted token store |
| Custom Reporting (Phase 2) | roadmap Phase 2 (light) — **write `features/reports.md` at slice start** (per working-style: spec before build) | report configs are Zod-validated JSON; share-links get their own review |
| GTM automation (Phase 3) | roadmap Phase 3 — **blocked on a product spec** (`features/gtm.md`): the concrete tag/trigger/conversion stack needs user definition | write-path review agents mandated in roadmap |
| Creative Asset Manager (Phase 4) | intentionally unspecced until Phase 3 done (highest blast radius; spec then) | sequencing itself is the mitigation |

## Next Session — Kickoff

Paste-ready prompt for the next working session:

> Read `docs/current-status.md`, `docs/security-plan.md` §4, and `docs/open-questions.md`
> (SEC-002). Build the **security hardening slice**: items 1–7 of the "Now" checklist in
> `docs/security-plan.md` — fix the `/auth/callback` open redirect; add auth checks +
> explicit user scoping to `src/features/utm/queries.ts` and `src/features/budget/queries.ts`;
> enable Supabase Auth leaked-password protection; add security headers in `next.config.ts`
> (CSP report-only first); add a GitHub Actions CI workflow (type-check, lint, build,
> npm audit) + Dependabot; stand up Vitest with tests for `spendToMicros` and a
> token-crypto round-trip/tamper case. Run the `security-reviewer` agent on the diff
> before committing. Then, if time remains, start the **org/workspace layer** per
> `docs/architecture-blueprint.md` §3.1.

After that slice, the standing order is the sequencing table in
`docs/architecture-blueprint.md` §4.

## Last Updated
2026-07-07 (later) — **Planning completed and closed out.** Owner confirmed ARCH-003 decisions (org layer before Phase 2; Vercel Cron; dependency approvals). Added product direction (PRODUCT-001 rules engine + AI assistant, INT-002 StackAdapt) and full build specs: `docs/features/rules-engine.md` (metrics widening → notify rules → write actions) and `docs/features/ai-assistant.md` (Claude tool-use assistant; model never gets an execute tool). Added the Planning Coverage Index above and this kickoff prompt. **All of this lives on branch `claude/project-architecture-security-fclnow` — merge it to `main` before the next session, or the next session won't see the plan.**
2026-07-07 — **Architecture + security review session (no code changes).** Ran the `architect` and `security-reviewer` agents over the full codebase and synthesized two leave-behind docs: `docs/architecture-blueprint.md` (systems to build for the remaining phases + SaaS launch — org layer, client factory, sync-core extraction, token refresh, Vercel Cron background sync, sync-job observability, Sentry, Stripe, onboarding, email, audit logging — each with a concrete build recipe and sequencing) and `docs/security-plan.md` (verified strengths; 3 code findings incl. a HIGH open redirect in `/auth/callback`; prioritized pre-launch checklist). New open questions: SEC-002 (pending security fixes), ARCH-003 (owner decisions: org-layer timing, cron choice, dependency approvals, start Google Developer Token + Meta App Review now).
2026-06-26 — **Budget Dashboard SHIPPED & manually verified in production.** Merged the slice to `main`; fixed the production domain alias (Option A — `ad-op-tools.vercel.app` re-pointed to serve `main`, which was the cause of the prod 404s); set the 4 Budget env vars; connected a real Meta account via OAuth and Sync pulled real spend into the dashboard. **Phase 0+1 COMPLETE.** (Operational learning: the OAuth flow needs `APP_ORIGIN` + the Meta redirect URI + the login domain to be the same working origin — see decision-log.)
2026-06-26 — Applied the budget migrations to `ad-op-tools` (`platform_connections`, `budget_entries`, `budget_caps` + RLS; hardened `set_updated_at` search_path per the security advisor). `/budget` now loads (connect/empty state) — the earlier production 500 was the missing tables. Security advisors clean except a pre-existing Auth "leaked password protection" toggle. Remaining to go live: env vars + Meta creds.
2026-06-26 — Phase 0+1 Budget Dashboard COMPLETE (backend + UI). Added the caps backend (`budget_caps` + `getCaps`/`setCaps`) and built the full `/budget` UI from the Claude Design export (pacing hero, KPI row, spend-over-time chart, by-platform donut, monthly-cap widget, grouped/sortable campaign table, connection management, per-campaign detail drawer). Additive; reviewed by database (caps) + react/code agents; type-check/lint/build green. Both budget migrations still UNAPPLIED. Remaining to go live: apply migrations to `ad-op-tools`, set env vars + Meta creds, live OAuth + sync test.
2026-06-26 — Phase 0+1 backend COMPLETE: integration foundation (canonical types, AES-256-GCM token crypto + connection store), Meta Marketing API client, budget queries/actions (sync + disconnect), and Meta OAuth routes. Reviewed by database + security (token layer & OAuth) + ad-platform agents — all findings applied (incl. 2 CRITICAL OAuth fixes). type-check/lint/build green; migration NOT yet applied. Pending: `/budget` UI (Claude Design export), apply migration to `ad-op-tools`, set env vars (`TOKEN_ENCRYPTION_KEY`/`APP_ORIGIN`/`META_APP_ID`/`META_APP_SECRET`) + live test. Branch synced with main; budget design brief written.
2026-06-26 (final) — User manually verified the URL Library detail drawer + inline editing in production; all working. Marked the UTM edit/delete slice complete and merged `claude/quirky-dirac-o95ke7` → `main`.
2026-06-26 (later) — Merged the new Claude Design export (URL Library + drawer) from main and reskinned `utm-detail-drawer.tsx` to match it; the grouped URL Library table and the generator form were left untouched, per direction (only the drawer was in scope). Added a guardrail in `.claude/rules/working-style.md` so design exports are integrated additively, never used to wholesale-replace existing UI. Renamed the export subfolder → `Ad Op Tools UI Design/detail-drawer/`.
2026-06-26 — UTM history edit/delete + detail drawer added on branch `claude/quirky-dirac-o95ke7`. New `updateUTMHistory`/`deleteUTMHistory` actions, `utm-detail-drawer.tsx`, shared `url.ts`, UPDATE-policy migration (tracked only). type-check/lint/build green; reviewed by security/react/code/database agents.
2026-06-25 — Roadmap session: `architect` + `planner` review set the build order (`docs/roadmap.md`); ARCH-002 re-resolved to Budget-first; gating decisions recorded.
2026-06-25 — UTM Generator feature slice complete: form, history sidebar, URL Library spreadsheet, autocomplete, Ad Set/Creative fields. All committed and pushed to main.
