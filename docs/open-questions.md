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

## INT-001 — First platform to integrate (Phase 1)

**Status**: Open — recommended path documented; confirm before Phase 1 build.
**Question**: Which ad platform do we integrate first behind the new foundation?
**Recommendation**: **Meta.** Marketing API yields a usable long-lived token immediately. Google Ads requires a Developer Token approval (can take days) that blocks all testing. If Google is preferred instead, start that application today.
**Action**: Confirm Meta (or Google). Either way, start the Google Developer Token application during Phase 1 so it's ready for Phase 2.
**Owner**: User

---

## SEC-001 — OAuth token encryption at rest

**Status**: Open — recommended path documented; **security boundary, must be settled before the first token is written.**
**Question**: How are OAuth access/refresh tokens protected at rest in `platform_connections`? RLS controls who can *read a row* but does not encrypt the stored bytes — anyone with the service-role key or DB/backup access would see plaintext.
**Recommendation**: **App-side AES-256-GCM** — encrypt token columns in server code before insert, key in a server-only env var (e.g. `TOKEN_ENCRYPTION_KEY`, never `NEXT_PUBLIC_*`), distinct per environment; RLS stays on as defense-in-depth. Alternatives: Supabase Vault / `pgcrypto` (DB-side; confirm plan-tier support). RLS-only is **not** acceptable for token columns.
**Action**: Confirm the mechanism — it changes the `platform_connections` migration.
**Owner**: User

---

## INFRA-001 — dev/prod Supabase split timing

**Status**: Open — recommended path documented; confirm before Phase 1 build.
**Question**: When do we split into separate dev/prod Supabase projects? (decision-log "No Local Supabase" / SETUP-003 deferred this to "before launch.")
**Recommendation**: **Before Phase 1.** Phase 1 is the first phase that writes live OAuth tokens and churns schema (`platform_connections`). UTM was safe on one shared project; credentials are not. Use a distinct `TOKEN_ENCRYPTION_KEY` per environment so a leaked dev key can't decrypt prod tokens.
**Action**: Confirm we do the split now, or accept and document the risk of deferring.
**Owner**: User

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

## Resolved

- **SETUP-001** — User has Vercel (connected to GitHub) and Supabase accounts. Resolved 2026-06-24.
- **SETUP-002** — Region: us-east-1. Supabase project `ad-op-tools` created. Resolved 2026-06-24.
- **SETUP-003** — Starting with one Supabase project. Will add dev/prod split before launch. Resolved 2026-06-24.
- **SETUP-004** — Vercel domains assigned: `ad-op-tools.vercel.app` (primary Site URL) and `ad-op-tools-mike-grigsby-s-projects.vercel.app`. Both `/auth/callback` URLs added to Supabase → Authentication → URL Configuration. Resolved 2026-06-24.
- **SETUP-005** — All three env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) added to Vercel project settings. Resolved 2026-06-24.
- **DATA-001** — Remote DB schema ahead of repo. Resolved 2026-06-25: two migrations now track `utm_templates`, `utm_history`, all columns, RLS, and prefix-search indexes.
- **ARCH-001** — First slice selection. Resolved 2026-06-25: UTM Generator built first.
- **ARCH-002** — Next feature slice. Resolved 2026-06-25: **Budget Dashboard (Meta, read-only) next**, behind a thin integration foundation built through one platform. Full order in `docs/roadmap.md`. The prior GTM-first recommendation was rejected — its "no OAuth complexity / use service accounts" premise is incorrect: the GTM API requires Google OAuth, and service accounts are the wrong auth model for multi-tenant GTM (a service account is *our* GTM, not the user's). See decision-log "Build Roadmap & Feature Order."
