# Current Status

## Project Phase
**Feature Slice 1: UTM Generator — Built, not yet manually tested in production.**
All code is on `main`, deployed to Vercel. Next deliverable: pick the next feature slice.

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
- `validation.ts` — Zod schemas for `utmParamsSchema` (includes `ad_set`, `creative`) and `saveTemplateSchema`
- `constants.ts` — `UTM_SOURCES`, `UTM_MEDIUMS` dropdown options
- `actions.ts` — four server actions:
  - `generateAndSaveURL` — builds and persists tagged URL
  - `saveTemplate` — saves reusable parameter template
  - `deleteTemplate` — removes template (user-scoped)
  - `getAutocompleteSuggestions` — prefix search on `campaign` or `base_url` with field whitelist
- `queries.ts` — `getUTMTemplates()`, `getUTMHistory(limit=500)`
- `components/utm-form.tsx` — form with `AutocompleteInput` on Campaign + Base URL, optional Ad Set + Creative fields, live URL preview, template load/save
- `components/utm-history-table.tsx` — Recent URLs sidebar; shows last 20; UTM tail + full URL copy buttons with 1.5s green checkmark feedback
- `components/utm-url-library.tsx` — spreadsheet table for all entries; group-by (All / Source / Campaign), collapsible headers, text filter, copy buttons
- `components/utm-page-client.tsx` — client shell wiring all components together
- `app/(dashboard)/utm/page.tsx` — server component fetching templates + history, rendering `UTMPageClient`

## What Exists — Infrastructure
- GitHub repo: `mike-grizzly/ad-op-tools`
- Supabase project `ad-op-tools` (us-east-1, id `fwzltthkcwthuuptqlby`)
- Vercel project linked to GitHub
  - Domains: `ad-op-tools.vercel.app` (primary) + `ad-op-tools-mike-grigsby-s-projects.vercel.app`
  - Env vars set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Supabase Auth URL config: Site URL + redirect URLs for both Vercel domains

## Database State
- Two migrations applied to remote DB (tracked in `supabase/migrations/`):
  - `20260624000000_create_utm_tables.sql` — creates `utm_templates` and `utm_history` with RLS
  - `20260625000000_utm_history_add_columns.sql` — adds `ad_set`, `creative` columns; adds prefix-search indexes
- RLS enabled on both tables; policies are user-scoped (`user_id = auth.uid()`)
- `src/types/database.ts` is hand-maintained (not auto-generated from Supabase CLI); reflects current schema

## Not Built Yet
- Budget dashboard (requires platform OAuth + API integrations)
- GTM automation
- Creative asset manager
- Custom reporting dashboards
- Ad platform integrations / OAuth
- Dev/prod Supabase project split

## Last Updated
2026-06-25 — UTM Generator feature slice complete: form, history sidebar, URL Library spreadsheet, autocomplete, Ad Set/Creative fields. All committed and pushed to main.
