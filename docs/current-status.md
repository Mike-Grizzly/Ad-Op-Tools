# Current Status

## Project Phase
**Setup & Planning** — Foundation (Next.js + Supabase auth shell) is built. Repo, Supabase, and Vercel are linked and configured. No feature code yet. Next deliverable: a full-app plan before building any feature slices.

## What Exists — Code
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4
- `src/lib/supabase/server.ts` / `client.ts` — SSR + browser Supabase clients (`@supabase/ssr`)
- `src/middleware.ts` — auth gate; unauthenticated users redirected to `/login`
- `src/app/(auth)/login/` — login page + client form (`signInWithPassword`)
- `src/app/auth/callback/route.ts` — code → session exchange
- `src/app/(dashboard)/layout.tsx` — auth-protected shell with nav + sign-out
- `src/app/(dashboard)/dashboard/page.tsx` — placeholder dashboard (shows user email)
- `src/features/auth/` — sign-out server action + button
- `src/types/database.ts` — placeholder; regenerate from Supabase once schema settles
- `.env.example` — all env vars documented with placeholders

## What Exists — Infrastructure
- GitHub repo: `mike-grizzly/ad-op-tools`
- Supabase project `ad-op-tools` (us-east-1, id `fwzltthkcwthuuptqlby`)
- Vercel project linked to GitHub
  - Domains: `ad-op-tools.vercel.app` (primary) + `ad-op-tools-mike-grigsby-s-projects.vercel.app`
  - Env vars set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Supabase Auth URL config: Site URL + redirect URLs for both Vercel domains

## Database State
- Remote DB has two tables: `utm_templates`, `utm_history` (RLS enabled, 0 rows)
- NOTE: these tables are not tracked by any migration file (`supabase/migrations/` is empty). They were applied during the shelved UTM build and kept intentionally. Reconcile before UTM work resumes — add a matching migration, or drop and recreate via migration. RLS *policies* on these tables are unverified (RLS is enabled, but policy correctness has not been checked).

## Not Built Yet
- Any feature slices (UTM, budget, GTM, creative, reports)
- Ad platform integrations / OAuth
- Full-app plan (the next thing to produce)

## Last Updated
2026-06-24 — Vercel linked, Supabase auth configured, UTM code shelved; entering planning phase.
