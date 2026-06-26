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

**Status**: Open
**Question**: The UTM Generator has not been manually tested end-to-end in the Vercel production deployment.
**Action**: Open `ad-op-tools.vercel.app/utm`, generate a URL, verify it saves to history, appears in the URL Library, and copies correctly.
**Owner**: User

---

## SETUP-006 — Meta app registration (Phase 1 prerequisite, user action)

**Status**: In progress — user **registered the Meta app 2026-06-26** (has dashboard access). Remaining before wiring OAuth: provide `META_APP_ID` / `META_APP_SECRET`, add the redirect URIs (Facebook Login → Settings), and confirm the `ads_read` permission. One-time, **once-per-platform** setup — later features add OAuth *scopes* to the same app, never a new registration (see decision-log "One App Per Platform; Scopes Per Feature").
**Context**: The Meta Marketing API requires a registered Meta app (App ID + Secret) to power the OAuth "Connect" flow. This is the product-side app behind the connect button (cf. a Looker Studio Meta connector or the Claude GitHub App — the vendor registers it once, users authorize it per account). Created once for the whole product; per-account connection is the OAuth click-flow.
**Action**: User creates a Meta app at developers.facebook.com (type **Business** → add the **Marketing API** product), sets the OAuth redirect URI to `…/api/integrations/meta/callback` for both Vercel domains, and provides `META_APP_ID` / `META_APP_SECRET`. Phase 1 (owner's own ad account, dev mode) needs **no Meta App Review**; App Review + Business Verification are required later to onboard external paying users.
**Owner**: User

---

## SETUP-007 — Create dev Supabase project (Phase 1 prerequisite)

**Status**: Open — required before Phase 1 (per INFRA-001, now resolved).
**Question**: Who creates the new dev Supabase project — user via the dashboard, or Claude via the Supabase tool (note: a new project may incur cost; would be confirmed first)?
**Action**: Stand up a second Supabase project for development; the Phase 1 migration targets it. Set a distinct `TOKEN_ENCRYPTION_KEY` per environment.
**Owner**: User to decide creation path.

---

## TEST-001 — Testing posture (no test runner installed)

**Status**: Open
**Question**: `package.json` has no Vitest/Playwright despite docs referencing them, and there are no `test`/`test:e2e` scripts. The real quality gate today is manual testing + `type-check`/`lint`/`build`.
**Action**: Confirm manual-only is acceptable for the upcoming slices, or budget a sub-task to stand up Vitest for the highest-value pure functions (the per-platform `transforms.ts` spend mappers, where an off-by-1000 currency error is exactly the kind of bug a unit test catches cheaply).
**Owner**: User

---

## NAV-001 — Dead nav links in the dashboard shell

**Status**: Open (cosmetic; resolves as features land)
**Question**: `src/components/ui/dashboard-shell.tsx` links to `/budget`, `/campaigns`, `/creative`, `/reports` — all 404 today — and has **no** `/gtm` link. Clicking them shows a 404.
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
- **INFRA-001** — dev/prod Supabase split. Resolved 2026-06-26: **split before Phase 1** confirmed. Execution tracked in SETUP-007. See decision-log.
- **ARCH-002** — Next feature slice. Resolved 2026-06-25: **Budget Dashboard (Meta, read-only) next**, behind a thin integration foundation built through one platform. Full order in `docs/roadmap.md`. The prior GTM-first recommendation was rejected — its "no OAuth complexity / use service accounts" premise is incorrect: the GTM API requires Google OAuth, and service accounts are the wrong auth model for multi-tenant GTM (a service account is *our* GTM, not the user's). See decision-log "Build Roadmap & Feature Order."
