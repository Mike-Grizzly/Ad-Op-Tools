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

## TEST-001 — Testing posture (no test runner installed)

**Status**: Open
**Question**: `package.json` has no Vitest/Playwright despite docs referencing them, and there are no `test`/`test:e2e` scripts. The real quality gate today is manual testing + `type-check`/`lint`/`build`.
**Action**: Confirm manual-only is acceptable for the upcoming slices, or budget a sub-task to stand up Vitest for the highest-value pure functions (the per-platform `transforms.ts` spend mappers, where an off-by-1000 currency error is exactly the kind of bug a unit test catches cheaply).
**Owner**: User

---

## NAV-001 — Dead nav links in the dashboard shell

**Status**: Open (cosmetic; resolves as features land). `/budget` is now live; `/campaigns`, `/creative`, `/reports` still 404.
**Question**: `src/components/ui/dashboard-shell.tsx` links to `/campaigns`, `/creative`, `/reports` (still 404 until their phases) and has **no** `/gtm` link.
**Action**: These resolve naturally as phases land (Budget in Phase 1, etc.). Add the `/gtm` nav item in Phase 3. If a 404 in the meantime is undesirable, gate the unbuilt links or add "coming soon" placeholder routes — flag if you want this done now.
**Owner**: Claude (per phase)

---

## QUAL-001 — Pre-existing lint errors block the "lint passes" gate

**Status**: Open
**Question**: `npm run lint` currently reports ~35 errors + warnings that pre-date Phase 1 — mostly `require()`-style imports in `scripts/lib/resolve-formatter.js` (ECC hook tooling, CommonJS), plus a few UTM warnings (unused vars, `react-hooks/exhaustive-deps`). `npm run type-check` is clean.
**Impact**: The working-style pre-commit gate expects lint to pass. New code is kept lint-clean, but the gate can't be honestly green until these are resolved or scoped out.
**Action**: Address separately from feature work (not during a slice) — e.g. an eslint override/ignore for ECC `scripts/` tooling + fix the UTM warnings, or formally accept lint-as-advisory. Do not bundle into Phase 1.
**Owner**: Claude (separate cleanup pass)

---

## UTM-004 — Tracked-vs-remote RLS policy shape divergence

**Status**: Open
**Question**: Remote uses one consolidated `FOR ALL` policy per UTM table; the tracked migrations use granular per-command policies (now including UPDATE). Effective permissions match, but the shapes differ.
**Risk**: Low. `supabase db pull` would overwrite the granular tracked lineage with the consolidated form. A fresh environment built from the tracked migrations gets the granular policies (correct, UPDATE included).
**Action**: At the dev/prod Supabase split, pick one canonical policy shape and reconcile. Until then, do not `db pull` over `supabase/migrations/`.
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

## SEC-002 — Security findings from the 2026-07-07 audit (fixes pending)

**Status**: Open
**Context**: A full architecture + security review (2026-07-07) produced `docs/security-plan.md`. Three concrete code findings await fixes: (1) **HIGH** — open redirect via the unvalidated `next` param in `src/app/auth/callback/route.ts` (exploitable once reset/magic-link emails ship); (2) **MEDIUM** — `src/features/utm/queries.ts` has no auth check and relies on RLS alone; (3) **LOW** — `src/features/budget/queries.ts` lacks explicit `.eq('user_id', ...)` scoping. All sized S.
**Action**: Apply the "Now" checklist in `docs/security-plan.md` §4 (items 1–7) in a small hardening slice.
**Owner**: Claude (next session; user to approve the Vitest dependency)

---

## ARCH-003 — Blueprint decisions needing owner sign-off

**Status**: Mostly resolved 2026-07-07 — user confirmed (1) org layer before Phase 2, (2) Vercel Cron for background sync, (3) all dependency approvals per blueprint §6 (`vitest`, `@sentry/nextjs`, `resend`, `stripe`, `@upstash/ratelimit` — add each when its phase needs it). See decision-log "Blueprint Decisions Confirmed."
**Remaining**: (4) User to start the **Google Ads Developer Token application** and **Meta App Review + Business Verification** — user acknowledged the long lead times and will start soon. Keep this open until both applications are submitted.
**Owner**: User (item 4 only)

---

## BUDGET-002 — Budget Dashboard customization features (backlog)

**Status**: Open (backlog; user-requested 2026-06-26 — revisit after more is built)
**Question**: User wants small customization features for the Budget Dashboard. Specifics TBD.
**Action**: Pick up after Phase 2; gather the concrete wishlist from the user then (likely candidates: configurable/reorderable KPI tiles, a default date range, per-platform cap presets, saved views, column visibility).
**Owner**: User (define) / Claude (build later)

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
