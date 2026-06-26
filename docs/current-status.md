# Current Status

## Project Phase
**Planning locked; building the multi-client foundation next.**
UTM Generator (Slice 1) is complete and live on `main`. A full product roadmap is now the plan of
record — see `docs/roadmap.md` (decisions + architecture corrections) and `docs/product-spec.md`
(external feature spec, archived). Next deliverable: the **multi-client foundation** (`clients`
entity, `platform_connections` + RLS, client CRUD) — needs no external API access — followed by
the no-API feature wave (checklist engine, naming generator, negative-keyword library,
ad-copy / RSA builder) while Google Ads + Meta API approvals are pending. The earlier
"next slice = user-features / password reset (AUTH-001)" candidate is deferred behind the
foundation.

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

## What Exists — Infrastructure
- GitHub repo: `mike-grizzly/ad-op-tools`
- Supabase project `ad-op-tools` (us-east-1, id `fwzltthkcwthuuptqlby`)
- Vercel project linked to GitHub
  - Domains: `ad-op-tools.vercel.app` (primary) + `ad-op-tools-mike-grigsby-s-projects.vercel.app`
  - Env vars set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Supabase Auth URL config: Site URL + redirect URLs for both Vercel domains

## Database State
- Migrations tracked in `supabase/migrations/`:
  - `20260624000000_create_utm_tables.sql` — creates `utm_templates` and `utm_history` with RLS
  - `20260625000000_utm_history_add_columns.sql` — adds `ad_set`, `creative` columns; adds prefix-search indexes
  - `20260626000000_utm_history_update_policy.sql` — granular UPDATE RLS policy on `utm_history` (for the edit feature). **Not applied to remote** — see note below.
- RLS enabled on both tables; policies are user-scoped (`user_id = auth.uid()`)
- **Tracked-vs-remote RLS divergence**: the remote DB was provisioned manually with a single consolidated `FOR ALL` policy per table (`users manage own utm_*`, `USING`/`WITH CHECK = auth.uid() = user_id`), which already permits UPDATE/DELETE. The tracked migrations instead use granular per-command policies. Effective permissions are identical; the new UPDATE-policy migration keeps the granular tracked lineage complete for fresh environments (e.g. dev/prod split). Do not `supabase db pull` over the tracked migrations. See decision-log 2026-06-26 and open-questions UTM-004.
- `src/types/database.ts` is hand-maintained (not auto-generated from Supabase CLI); reflects current schema

## Not Built Yet
- Budget dashboard (requires platform OAuth + API integrations)
- GTM automation
- Creative asset manager
- Custom reporting dashboards
- Ad platform integrations / OAuth
- Dev/prod Supabase project split

## Last Updated
2026-06-26 (final) — User manually verified the URL Library detail drawer + inline editing in production; all working. Marked the UTM edit/delete slice complete and merged `claude/quirky-dirac-o95ke7` → `main`.
2026-06-26 (later) — Merged the new Claude Design export (URL Library + drawer) from main and reskinned `utm-detail-drawer.tsx` to match it; the grouped URL Library table and the generator form were left untouched, per direction (only the drawer was in scope). Added a guardrail in `.claude/rules/working-style.md` so design exports are integrated additively, never used to wholesale-replace existing UI. Renamed the export subfolder → `Ad Op Tools UI Design/detail-drawer/`.
2026-06-26 — UTM history edit/delete + detail drawer added on branch `claude/quirky-dirac-o95ke7`. New `updateUTMHistory`/`deleteUTMHistory` actions, `utm-detail-drawer.tsx`, shared `url.ts`, UPDATE-policy migration (tracked only). type-check/lint/build green; reviewed by security/react/code/database agents. Pending manual test.
2026-06-25 — UTM Generator feature slice complete: form, history sidebar, URL Library spreadsheet, autocomplete, Ad Set/Creative fields. All committed and pushed to main.
