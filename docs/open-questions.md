# Open Questions

Unresolved questions, risks, and decisions that need to be made. Resolve and move to the bottom section when closed.

---

## UTM-001 — No clipboard fallback for insecure contexts

**Status**: Open
**Question**: `navigator.clipboard.writeText` requires a secure context (HTTPS or localhost). If a user somehow accesses the app over HTTP, copy buttons silently fail.
**Risk**: Low — Vercel always serves HTTPS. No action needed until a non-HTTPS deployment scenario arises.
**Owner**: Claude (if/when relevant)

---

## UTM-002 — URL Library pagination

**Status**: Open
**Question**: `getUTMHistory(500)` fetches all rows on every page load. This will degrade as history grows.
**Action**: Add cursor-based pagination to `getUTMHistory` and infinite-scroll or "load more" to `UTMUrlLibrary` when a user accumulates 500+ entries.
**Owner**: Claude (next UTM maintenance pass)

---

## UTM-003 — Manual test in production not yet done

**Status**: Resolved 2026-06-26 — user signed into the live app and verified the URL Library, detail drawer, and inline editing work end-to-end. The tagged URL updates correctly on save.
**Owner**: User

---

## SETUP-006 — Meta app registration (Phase 1 prerequisite, user action)

**Status**: ✅ Resolved 2026-06-26 — Meta app live: `META_APP_ID`/`META_APP_SECRET` set in Vercel, redirect URI `https://ad-op-tools.vercel.app/api/integrations/meta/callback` registered, `ads_read` working. Connected a real ad account + synced real spend in production. One-time, **once-per-platform** setup — later features add OAuth *scopes* to the same app, never a new registration (see decision-log "One App Per Platform; Scopes Per Feature").
**Context**: The Meta Marketing API requires a registered Meta app (App ID + Secret) to power the OAuth "Connect" flow. This is the product-side app behind the connect button (cf. a Looker Studio Meta connector or the Claude GitHub App — the vendor registers it once, users authorize it per account). Created once for the whole product; per-account connection is the OAuth click-flow.
**Action**: User creates a Meta app at developers.facebook.com (type **Business** → add the **Marketing API** product), sets the OAuth redirect URI to `…/api/integrations/meta/callback` for both Vercel domains, and provides `META_APP_ID` / `META_APP_SECRET`. Phase 1 (owner's own ad account, dev mode) needs **no Meta App Review**; App Review + Business Verification are required later to onboard external paying users.
**Owner**: User

---

## SETUP-007 — Create dev Supabase project (Phase 1 prerequisite)

**Status**: Resolved 2026-06-26 — NOT creating a separate dev project now. Per user, we build and test on the single shared `ad-op-tools` project (RLS isolates per user), and stand up a clean production project at launch (when real users exist). The Phase 1 migration will be applied to `ad-op-tools`. Set a distinct `TOKEN_ENCRYPTION_KEY` per environment when the split happens. See decision-log "Supabase: One Shared Project Now."
**Owner**: User

---

## TEST-001 — Testing posture (Vitest now installed)

**Status**: Mostly resolved 2026-07-07 — Vitest (`^3.2.7`, dev-only, approved under ARCH-003)
stood up with `vitest.config.ts` (node env, `@` alias) and `test`/`test:watch` scripts. First
tests cover the two highest-value pure functions: `spendToMicros` (`meta/transforms.test.ts`, 7
cases incl. the off-by-1000 / large-spend / negative-credit paths) and token-crypto
(`token-crypto.test.ts`, 6 cases: round-trip, fresh-IV, tamper, AAD row-binding, unknown-key-id,
bad-tag-length). 13 tests, all green; wired into CI. Playwright/E2E still not set up.
**Action**: Add tests opportunistically as new pure logic lands; stand up Playwright when a flow
warrants an E2E gate.
**Owner**: Claude

---

## NAV-001 — Dead nav links in the dashboard shell

**Status**: Open (cosmetic; resolves as features land). `/budget` is now live; `/campaigns`, `/creative`, `/reports` still 404.
**Question**: `src/components/ui/dashboard-shell.tsx` links to `/campaigns`, `/creative`, `/reports` (still 404 until their phases) and has **no** `/gtm` link.
**Action**: These resolve naturally as phases land (Budget in Phase 1, etc.). Add the `/gtm` nav item in Phase 3. If a 404 in the meantime is undesirable, gate the unbuilt links or add "coming soon" placeholder routes — flag if you want this done now.
**Owner**: Claude (per phase)

---

## QUAL-001 — Pre-existing lint errors block the "lint passes" gate

**Status**: Resolved 2026-07-07 — the ~35 errors were all in non-application-source files:
`scripts/**` (ECC hook tooling, legitimately CommonJS `require()`) and `Ad Op Tools UI Design/**`
(vendored Claude Design mockups). Both are now in `eslint.config.mjs` `globalIgnores`, so the
Next.js/TS ruleset only lints real app source. `npm run lint` now exits 0 (errors) with 7
pre-existing UTM **warnings** remaining (unused vars, `react-hooks/exhaustive-deps` — non-blocking;
tracked in UTM-005). Lint is now a real, green CI gate.
**Owner**: Claude (UTM warnings fold into UTM-005)

---

## UTM-004 — Tracked-vs-remote RLS policy shape divergence

**Status**: Open
**Question**: Remote uses one consolidated `FOR ALL` policy per UTM table; the tracked migrations use granular per-command policies (now including UPDATE). Effective permissions match, but the shapes differ.
**Risk**: Low. `supabase db pull` would overwrite the granular tracked lineage with the consolidated form. A fresh environment built from the tracked migrations gets the granular policies (correct, UPDATE included).
**Action**: At the dev/prod Supabase split, pick one canonical policy shape and reconcile. Until then, do not `db pull` over `supabase/migrations/`.
**Update 2026-07-21**: Substantially resolved by the org-layer migration
(`20260721000000_create_org_layer.sql`) — it drops both naming lineages (`drop policy if
exists` across the union) and creates one canonical org-scoped policy set, so tracked and
remote now converge. This unblocks switching `src/types/database.ts` to `supabase gen types`
at the dev/prod split.
**Owner**: Claude (at dev/prod split)

---

## UTM-005 — Minor tech debt surfaced in 2026-06-26 review

**Status**: Open
**Items** (none blocking, found while adding edit/delete):
- `deleteTemplate` takes `id: string` with no uuid validation, unlike the new `deleteUTMHistory` (`utmHistoryIdSchema`). Align for consistency.
- `utm_history.template_id` FK has no index; add a `(template_id)` index in a future migration.
- `utm_templates.updated_at` has no auto-update trigger; the value never changes after insert unless set in app code.
- `utm-page-client.tsx` stores the toast timer in `useState` (should be `useRef`); causes a spurious re-render per toast. Pre-existing.
- `utm-url-library.tsx` computes an unused `totalFiltered`; dead code.
**Owner**: Claude (next UTM maintenance pass)

---

## AUTH-001 — No in-app password reset / change flow

**Status**: Open (deferred to a user-features slice, per user 2026-06-26)
**Question**: The app has only a login page — no "Forgot password" or "Change password" UI. A locked-out user can't self-serve; recovery currently requires an admin password set directly on `auth.users`.
**Context**: On 2026-06-26 the user's password was reset via an admin `UPDATE auth.users SET encrypted_password = crypt(...)` (bcrypt, pgcrypto in the `extensions` schema) as a one-off stopgap to regain access.
**Action**: In the user-features slice, add `resetPasswordForEmail` + a reset page and an account "Change password" screen. Confirm Supabase SMTP for reset-link delivery, or use magic-link/OTP sign-in (works without custom SMTP).
**Security note**: The temporary admin-set password is visible in session chat history — rotate it once the change-password flow exists.
**Owner**: User / Claude (next user-features slice)

---

## BUDGET-001 — Phase 1 backend follow-ups (deferred, non-blocking)

**Status**: Open (deferred; captured from the database/security/ad-platform review passes)
**Items**:
- Meta OAuth `state` is not user-bound (defense-in-depth only — the callback re-auths, so the connection is always attributed to the logged-in user). Consider embedding the user id in `state`.
- Campaigns use raw `status`, not `effective_status` — decide whether delivery-state accuracy matters for the dashboard before relying on it.
- **Verify against the live API once Meta creds exist**: `date_start` returned with `time_increment=1`; `v21.0` still in Meta's support window; default `/campaigns` excludes deleted; the BUC rate-limit header name.
- Next 16 deprecates the `middleware` file convention in favor of `proxy` (pre-existing build warning). Migrate when convenient.
- Key rotation: `token-crypto.getKey()` is single-key (`v1`); extend it to a key map before the first rotation.
- Platform values are CHECK-constrained in three tables (`platform_connections`, `budget_entries`, `budget_caps`); adding a platform means updating all three in sync. Consider a lookup table or domain type when the next platform is added.
**Owner**: Claude (during Budget UI / pre-launch hardening)

---

## SEC-002 — Security findings from the 2026-07-07 audit (hardening slice shipped 2026-07-07)

**Status**: Mostly resolved 2026-07-07. The three code findings are fixed and reviewed:
(1) **HIGH** open redirect — `next` now validated as a same-origin relative path in
`src/app/auth/callback/route.ts`; `security-reviewer` fuzzed it (backslashes, `%2F`, tab/CRLF,
userinfo `@`) and **confirmed no bypass** (it holds because the target is concatenated onto an
already-trusted origin). (2) **MEDIUM** `utm/queries.ts` — auth guard + explicit
`.eq('user_id', user.id)` added. (3) **LOW** `budget/queries.ts` — explicit `.eq('user_id', …)`
added. §4 "Now" items 1–3, 5, 6, 7 all shipped this slice (headers report-only CSP, CI +
Dependabot, Vitest + 13 tests).
**Remaining (small follow-ups, non-blocking)**:
- **Item 4 — Supabase leaked-password protection**: dashboard Auth toggle, not settable via the
  Supabase MCP (no auth-config tool). **User action** — Dashboard → Authentication → Policies →
  enable "Leaked password protection." Surfaced in `docs/session-alerts.md`.
- **CSP report sink**: the CSP ships report-only but has no `report-to`/`report-uri` yet, so it
  collects no violations (reviewer MEDIUM, functional-not-exploitable). Wire it when Sentry lands
  (blueprint §3.6), then enforce (§4 launch-gate item 20).
- ~~**Query contract style**~~: Resolved 2026-07-21 (org-layer slice) — `utm/queries.ts` now
  throws `Unauthorized` like `budget/queries.ts` (see decision-log 2026-07-21 item 5).
**Owner**: Claude (follow-ups) / User (item 4 toggle)

---

## ARCH-003 — Blueprint decisions needing owner sign-off

**Status**: Mostly resolved 2026-07-07 — user confirmed (1) org layer before Phase 2, (2) Vercel Cron for background sync, (3) all dependency approvals per blueprint §6 (`vitest`, `@sentry/nextjs`, `resend`, `stripe`, `@upstash/ratelimit` — add each when its phase needs it). See decision-log "Blueprint Decisions Confirmed."
**Remaining**: (4) User to start the **Google Ads Developer Token application** and **Meta App Review + Business Verification** — user acknowledged the long lead times and will start soon. Keep this open until both applications are submitted.
**Owner**: User (item 4 only)

---

## PRODUCT-001 — Rules engine + in-app Claude assistant (user direction 2026-07-07)

**Status**: Open (direction confirmed by user; sequencing in blueprint §5 items 8–9)
**Context**: User wants (a) Revealbot/Bïrch-style automated rules ("pause all ads with ROI < 0.7") and (b) a natural-language Claude assistant in-app for both report editing and ad actions. Feasible; the server-action architecture maps 1:1 to Claude tool definitions.
**Data prerequisite (blocks both)**: sync currently stores campaign-level spend/impressions/clicks only. Rules and "top ad groups by leads" need **conversion/lead metrics** and **ad-group/ad-level granularity** added to `budget_entries` (or a sibling table) — fold into Phase 2 sync widening.
**Safety rule (standing)**: AI/rule-triggered write actions on live ad accounts always preview affected entities + require explicit confirmation (assistant) or an explicit user-enabled rule (engine), and are always audit-logged.
**Owner**: Claude (build per blueprint sequencing) / User (approve `@anthropic-ai/sdk` dependency when the slice starts)

---

## INT-002 — StackAdapt integration (user-requested platform)

**Status**: Open (feasibility confirmed 2026-07-07)
**Context**: StackAdapt exposes a GraphQL Public API (docs.stackadapt.com) + official TS SDK (`@stackadapt/pa-typescript-sdk`) covering campaign management and reporting. Auth is an account-tied **API key requested from StackAdapt** (contact their team), not self-serve OAuth.
**Action**: When prioritized: user requests a GraphQL API key from StackAdapt; build follows the standard platform pattern but with a paste-API-key connect flow (encrypt via the existing token store; no OAuth routes) and a `'stackadapt'` value added to the platform CHECK constraints in `platform_connections`/`budget_entries`/`budget_caps` (consider the lookup-table refactor from BUDGET-001 at that point).
**Owner**: User (key request + prioritization) / Claude (build)

---

## BUDGET-002 — Budget Dashboard customization features (backlog)

**Status**: Open (backlog; user-requested 2026-06-26 — revisit after more is built)
**Question**: User wants small customization features for the Budget Dashboard. Specifics TBD.
**Action**: Pick up after Phase 2; gather the concrete wishlist from the user then (likely candidates: configurable/reorderable KPI tiles, a default date range, per-platform cap presets, saved views, column visibility).
**Owner**: User (define) / Claude (build later)

---

## PRODUCT-002 — Pricing tiers need owner confirmation before the Stripe slice

**Status**: Open
**Context**: The committed product spec (`docs/product-spec-2026-06.md`) proposes flat tiers:
Solo $29/mo (3 clients, 2 platform accounts), Pro $59/mo (10 clients, unlimited accounts),
Team $99/mo (5 users, unlimited clients), 14-day full-Pro trial, no card. Recorded as the
candidate structure for blueprint §3.8 (Stripe), which needs tier definitions to build
`getPlan(orgId)` feature gating.
**Action**: Owner confirms (or revises) tiers + limits before the billing slice starts. Limits
imply enforcement points (client count, connection count, member count) — cheap if known early.
**Owner**: User

---

## PRODUCT-003 — Checklist template content: seeding and editability

**Status**: Open
**Context**: The spec ships two detailed default checklist templates (Google Search 18 items,
Meta Lead Gen 15 items) and says templates are stored in DB and user-editable. Questions for
slice start: are the spec's defaults seeded per-org (copy-on-create) or global rows? Can users
edit the defaults or only clones? Same question applies to the pre-seeded negative-keyword
vertical lists (§5.1).
**Action**: Decide at the checklist-engine slice; default recommendation — seed as global
read-only defaults, copy-on-first-edit into the org.
**Owner**: User (product call) / Claude (default if unanswered)

---

## DEBT-001 — Minor flags from the 2026-07-20 architecture review (non-blocking)

**Status**: Open (tracking only; none block current work)
**Items**:
- **Duplicate migration timestamp prefix**: `20260626000000_create_platform_connections_and_budget.sql`
  and `20260626000000_utm_history_update_policy.sql` share a prefix; ordering relies on
  lexical filename sort. Harmless today (both applied); avoid reusing timestamps going
  forward, and consider renaming the policy file if a fresh-environment build ever misorders.
- **Files over the 300-line guideline (5)**: `budget-helpers.ts` (362), `budget-campaign-table.tsx`
  (346), `utm-form.tsx` (338), `budget-page-client.tsx` (306), `utm-url-library.tsx` (303).
  Already flagged in current-status for the budget pair; extract on next touch, not as a
  dedicated refactor.
- **Test coverage is pure-functions-only**: no tests for server actions, OAuth routes, or
  auth guards. Add action-level tests opportunistically (TEST-001), prioritizing `syncBudget`
  and the OAuth callback validators when Phase 2 touches them.
- **CSP still report-only with `unsafe-inline`/`unsafe-eval`** and no report sink — already
  tracked in SEC-002; listed here only for completeness of the review record.
- **`src/hooks/` doesn't exist** though conventions reference it — fine (no shared hooks yet);
  create it only when a real shared hook appears.
**Owner**: Claude (opportunistic)

---

## ORG-001 — Org-shared connections: dedupe/adoption + single-row assumption (surface at invites slice)

**Status**: Open (landmine documented 2026-07-21 during the org-layer slice; harmless until teams exist)
**Context**: `platform_connections` deliberately kept its `(user_id, platform, external_account_id)`
unique key (token AAD is user-bound — see decision-log 2026-07-21 item 1). Once an org has two
members, the same ad account could be connected by both, creating two rows in one org.
**Items**:
- `getConnectionWithTokens` uses `.maybeSingle()` filtered by `(org_id, platform, external_account_id)` —
  two same-account rows in one org would make it throw. Decide precedence (newest? owner's?) or
  dedupe/adopt at connect time.
- Decide the product story for a member leaving an org whose connection others rely on
  (re-encrypt/adopt via the `token_key_id` rotation mechanism, or force reconnect).
**Already closed in the org migration** (security review 2026-07-21): cross-org row
reassignment and `user_id`/AAD drift are blocked by the `prevent_tenant_rebinding` trigger
(org_id immutable on all 5 tenant tables; user_id immutable on platform_connections and the
utm tables), and `syncBudget` now treats a failed decrypt as a per-account failure instead
of aborting the loop.
**Owner**: Claude (at the invites slice)

---

## ORG-002 — `utm_templates` has no unique name constraint (dead 23505 branch)

**Status**: Open (found 2026-07-21 during org-layer recon)
**Context**: `saveTemplate` handles error code `23505` with "A template with that name already
exists", but neither the remote DB nor the tracked migrations define ANY unique constraint on
`utm_templates` — the branch is dead code and duplicate template names are currently allowed.
**Action**: Owner call: add `unique (org_id, name)` (templates are org-shared now) in a future
migration, or drop the dead branch. Not changed during the org slice to avoid an unrequested
product-behavior change.
**Owner**: User (product call) / Claude (implement)

---

## DEBT-002 — Minor flags from the 2026-07-21 clients-slice reviews (non-blocking)

**Status**: Open (tracking only)
**Items**:
- `budget-sub-header.tsx` sort-menu items are mouse-only (no role/tabIndex/keyboard) —
  the clients copy was fixed in-slice; fix budget's twin on next touch, or extract a
  shared `SortMenu` primitive when a third consumer appears (react-reviewer 2026-07-21).
- `clients-page-client.tsx` uses one coarse `isPending` for create/delete/assign (update
  has its own draft-preserving contract) — per-control busy granularity like
  budget-page-client's `busyId` pattern is a nice-to-have (accepted simplification).
- `createClient` server action name collides conceptually with the Supabase factory
  `createClient` — no import collision exists; rename to `addClient` only if it ever
  confuses.
**Owner**: Claude (opportunistic)

---

## Resolved

- **SETUP-001** — User has Vercel (connected to GitHub) and Supabase accounts. Resolved 2026-06-24.
- **SETUP-002** — Region: us-east-1. Supabase project `ad-op-tools` created. Resolved 2026-06-24.
- **SETUP-003** — Starting with one Supabase project. Will add dev/prod split before launch. Resolved 2026-06-24.
- **SETUP-004** — Vercel domains assigned: `ad-op-tools.vercel.app` (primary Site URL) and `ad-op-tools-mike-grigsby-s-projects.vercel.app`. Both `/auth/callback` URLs added to Supabase → Authentication → URL Configuration. Resolved 2026-06-24.
- **SETUP-005** — All three env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) added to Vercel project settings. Resolved 2026-06-24.
- **DATA-001** — Remote DB schema ahead of repo. Resolved 2026-06-25: two migrations now track `utm_templates`, `utm_history`, all columns, RLS, and prefix-search indexes.
- **ARCH-001** — First slice selection. Resolved 2026-06-25: UTM Generator built first.
- **INT-001** — First platform. Resolved 2026-06-26: **Meta** confirmed by user. See decision-log "Phase 1 Gating Decisions Confirmed."
- **SEC-001** — OAuth token encryption at rest. Resolved 2026-06-26: **app-side AES-256-GCM** confirmed (key in `TOKEN_ENCRYPTION_KEY`, server-only, per-env; RLS stays on as defense-in-depth; RLS-only not acceptable for token columns). See decision-log.
- **INFRA-001** — dev/prod Supabase split. Re-resolved 2026-06-26: **one shared `ad-op-tools` project for now; dev/prod split deferred to launch** (per user — RLS gives per-user isolation and there is no real production data yet). Supersedes the earlier "split before Phase 1." See decision-log "Supabase: One Shared Project Now."
- **ARCH-002** — Next feature slice. Resolved 2026-06-25: **Budget Dashboard (Meta, read-only) next**, behind a thin integration foundation built through one platform. Full order in `docs/roadmap.md`. The prior GTM-first recommendation was rejected — its "no OAuth complexity / use service accounts" premise is incorrect: the GTM API requires Google OAuth, and service accounts are the wrong auth model for multi-tenant GTM (a service account is *our* GTM, not the user's). See decision-log "Build Roadmap & Feature Order."
