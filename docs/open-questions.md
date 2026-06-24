# Open Questions

Unresolved questions, risks, and decisions that need to be made. Resolve and move to decision-log.md when closed.

---

## SETUP-004 — Vercel deployment URL + Supabase auth redirect

**Status**: Open
**Question**: What is the Vercel deployment URL for this project? Needed to configure Supabase Authentication → URL Configuration (Site URL + Redirect URLs).
**Blocking**: Auth callback won't work on production until redirect URL is added in Supabase dashboard.
**Action**: User adds URL to Supabase → Authentication → URL Configuration → Redirect URLs: `https://<your-vercel-url>/auth/callback`
**Owner**: User

---

## SETUP-005 — Vercel environment variables

**Status**: Open
**Question**: Have `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` been added to Vercel project settings?
**Blocking**: First deployment will build but auth won't function without these.
**Action**: Vercel → Project → Settings → Environment Variables. Service role key found at supabase.com → project → Settings → API.
**Owner**: User

---

## ARCH-001 — First slice selection

**Status**: Open
**Question**: Which feature do we build first? Recommendation is UTM Generator (no OAuth dependencies, bounded scope, validates full stack).
**Alternatives**: Budget dashboard (higher value but requires OAuth + platform API setup first).
**Blocking**: Feature planning and scope definition.
**Owner**: User

---

## Resolved

- **SETUP-001** — User has Vercel (connected to GitHub) and Supabase accounts. Resolved 2026-06-24.
- **SETUP-002** — Region: us-east-1. Supabase project `ad-op-tools` created. Resolved 2026-06-24.
- **SETUP-003** — Starting with one Supabase project. Will add dev/prod split before launch. Resolved 2026-06-24.
