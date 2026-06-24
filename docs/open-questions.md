# Open Questions

Unresolved questions, risks, and decisions that need to be made. Resolve and move to the bottom section when closed.

---

## DATA-001 — Remote DB schema is ahead of the repo

**Status**: Open
**Question**: The remote Supabase DB has `utm_templates` and `utm_history` tables (RLS enabled, 0 rows), but `supabase/migrations/` is empty — no migration tracks them. They were applied during the shelved UTM build and kept on purpose.
**Risk**: Schema drift. A fresh environment (or `supabase db reset`) would not recreate these tables. RLS policy correctness is unverified.
**Action**: Before UTM work resumes, either (a) write a migration that exactly matches the existing tables and policies, or (b) drop the tables and recreate them via a tracked migration. Verify RLS policies are user-scoped.
**Owner**: Claude (when UTM slice is picked up)

---

## ARCH-001 — First slice selection

**Status**: Open
**Question**: Which feature do we build first? Recommendation is UTM Generator (no OAuth dependencies, bounded scope, validates the full stack end-to-end).
**Alternatives**: Budget dashboard (higher value but requires OAuth + platform API setup first).
**Blocking**: Feature planning and scope definition.
**Owner**: User
**Note**: To be resolved as part of the full-app planning pass.

---

## Resolved

- **SETUP-001** — User has Vercel (connected to GitHub) and Supabase accounts. Resolved 2026-06-24.
- **SETUP-002** — Region: us-east-1. Supabase project `ad-op-tools` created. Resolved 2026-06-24.
- **SETUP-003** — Starting with one Supabase project. Will add dev/prod split before launch. Resolved 2026-06-24.
- **SETUP-004** — Vercel domains assigned: `ad-op-tools.vercel.app` (primary Site URL) and `ad-op-tools-mike-grigsby-s-projects.vercel.app`. Both `/auth/callback` URLs added to Supabase → Authentication → URL Configuration. Resolved 2026-06-24.
- **SETUP-005** — All three env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) added to Vercel project settings. Resolved 2026-06-24.
