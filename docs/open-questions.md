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

## ARCH-002 — Next feature slice

**Status**: Open
**Question**: What do we build next? Candidates:
- Budget Dashboard (high value, but requires OAuth + Google/Meta/LinkedIn/TikTok API setup first)
- GTM Automation (API-based, no creative assets needed)
- Creative Asset Manager (requires storage + platform APIs)
**Recommendation**: GTM Automation — bounded scope, API-only, no OAuth credential complexity if using service accounts.
**Owner**: User

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

## Resolved

- **SETUP-001** — User has Vercel (connected to GitHub) and Supabase accounts. Resolved 2026-06-24.
- **SETUP-002** — Region: us-east-1. Supabase project `ad-op-tools` created. Resolved 2026-06-24.
- **SETUP-003** — Starting with one Supabase project. Will add dev/prod split before launch. Resolved 2026-06-24.
- **SETUP-004** — Vercel domains assigned: `ad-op-tools.vercel.app` (primary Site URL) and `ad-op-tools-mike-grigsby-s-projects.vercel.app`. Both `/auth/callback` URLs added to Supabase → Authentication → URL Configuration. Resolved 2026-06-24.
- **SETUP-005** — All three env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) added to Vercel project settings. Resolved 2026-06-24.
- **DATA-001** — Remote DB schema ahead of repo. Resolved 2026-06-25: two migrations now track `utm_templates`, `utm_history`, all columns, RLS, and prefix-search indexes.
- **ARCH-001** — First slice selection. Resolved 2026-06-25: UTM Generator built first.
