# Feature: UTM Generator

## Status
**Built — not yet manually tested in production.** Base feature on `main`; edit/delete + detail drawer on branch `claude/quirky-dirac-o95ke7` (pending manual test).

## Problem
Every new campaign requires constructing tagged URLs by hand — copy-pasting base URLs, appending `?utm_source=...` etc., and keeping naming consistent across team members and platforms. Mistakes mean broken attribution.

## Solution
A form that auto-populates parameters from saved templates, generates the full URL, saves it to history, and presents a spreadsheet view for browsing and re-copying past URLs.

## Scope

### In scope
- Template-based URL generation (save, load, delete templates)
- Required fields: Source, Medium, Campaign, Base URL
- Optional fields: Content, Term, Ad Set, Creative
- Autocomplete on Campaign and Base URL (prefix search against history)
- Recent URLs sidebar (last 20 entries, UTM tail + full URL copy)
- URL Library spreadsheet (all entries, group-by, filter, copy)
- Click a spreadsheet row → detail drawer showing every parameter
- Edit any parameter in the drawer — `generated_url` rebuilds server-side on save
- Delete a history entry from the drawer (inline confirm)
- History persisted per-user in Supabase

### Out of scope (by design)
- Bulk generation from CSV
- Sharing URLs across team members (single-user for now)
- Per-UTM analytics in the drawer (placeholder shown; "coming soon")

## Data Model

### `utm_templates`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK | `auth.users.id` |
| name | text | unique per user |
| source | text | nullable |
| medium | text | nullable |
| campaign | text | nullable |
| content | text | nullable |
| term | text | nullable |
| created_at | timestamptz | |

### `utm_history`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK | `auth.users.id` |
| base_url | text | |
| source | text | |
| medium | text | |
| campaign | text | |
| content | text | nullable |
| term | text | nullable |
| ad_set | text | nullable — appended as `utm_adset` |
| creative | text | nullable — appended as `utm_creative` |
| generated_url | text | full URL with all utm params |
| created_at | timestamptz | |

### Indexes
- `(user_id, campaign text_pattern_ops)` — supports `LIKE 'prefix%'` autocomplete
- `(user_id, base_url text_pattern_ops)` — supports `LIKE 'prefix%'` autocomplete

## UTM Parameter Mapping
| Form field | URL parameter |
|-----------|--------------|
| source | `utm_source` |
| medium | `utm_medium` |
| campaign | `utm_campaign` |
| content | `utm_content` |
| term | `utm_term` |
| ad_set | `utm_adset` (non-standard, widely supported) |
| creative | `utm_creative` (non-standard, widely supported) |

## Component Architecture

```
app/(dashboard)/utm/page.tsx          ← server component; fetches templates + history
  └── UTMPageClient                   ← 'use client' shell; owns drawer state + optimistic update/delete
        ├── UTMForm                   ← form with AutocompleteInput sub-component
        ├── UTMHistoryTable           ← recent 20 sidebar
        ├── UTMUrlLibrary             ← spreadsheet; rows clickable → onRowClick(entry)
        └── UTMDetailDrawer           ← slide-over: view / edit / delete, mounted with key={entry.id}; styled to the detail-drawer/ design export
```

Shared helper: `url.ts` `buildPreviewUrl` (client-side live preview, used by the form and the drawer).

### Edit / delete flow
- Clicking a URL Library row sets `selectedId`; the drawer is rendered only when an entry is selected and is keyed by `entry.id` (so opening a different row resets local state without an effect).
- Edit mode renders an input per parameter with a live preview. On save, `updateUTMHistory` validates, rebuilds `generated_url` via the strict server `buildUTMUrl`, persists, and returns the full row; the client patches its `entries` state in place (the entry re-groups automatically if its source/campaign changed).
- Delete uses an inline confirm in the drawer; `deleteUTMHistory` removes the row (user-scoped) and the client drops it from `entries` and closes the drawer.

### Data flow
- Page server component passes `initialTemplates` and `initialHistory` to `UTMPageClient`
- History limit is 500 (enough for the spreadsheet; sidebar slices to 20 client-side)
- `handleGenerated` prepends new entries to client state — no full page reload on submit
- Autocomplete calls `getAutocompleteSuggestions` server action on each keystroke (debounced 200ms, 2+ chars minimum)

## Security
- Every server action calls `supabase.auth.getUser()` as the first operation and returns `{ error: 'Unauthorized' }` if no session
- All DB queries include `.eq('user_id', user.id)` — no cross-user data access
- `getAutocompleteSuggestions` validates `field` against a hardcoded whitelist `['campaign', 'base_url']` before using it as a query column — prevents arbitrary column access
- All inputs validated through Zod schemas before hitting the DB
- `src/types/database.ts` is kept in sync manually; `supabase-js` parameterizes all values so SQL injection is not possible

## Known Gaps / Edge Cases
- URL Library group-header chevron icon does not animate smoothly in Safari (CSS `transition` on SVG `transform` behaves differently)
- If `navigator.clipboard.writeText` is unavailable (insecure context), copy silently fails — no fallback `document.execCommand` shim
- `getUTMHistory(500)` fetches all rows on every page load; no pagination yet
- Preview vs persisted URL encoding differs cosmetically: the client preview (`buildPreviewUrl`) renders spaces in campaign/content/term/ad_set/creative as `_`, while the server (`buildUTMUrl` via `URL.searchParams`) renders them as `+`. Both decode identically in analytics tools. Most visible in the drawer when editing a value containing spaces (edit preview shows `_`, saved view shows `+`). Pre-existing; unify the two builders if it becomes confusing.

## Migrations
- `supabase/migrations/20260624000000_create_utm_tables.sql`
- `supabase/migrations/20260625000000_utm_history_add_columns.sql`
- `supabase/migrations/20260626000000_utm_history_update_policy.sql` — granular UPDATE RLS policy (tracked lineage only; remote already permits UPDATE via a consolidated `FOR ALL` policy, so not applied to remote)

## Test Status
- TypeScript: passes `tsc --noEmit` clean; `eslint` clean on the feature; `next build` passes
- Reviewed by security-, react-, code-, and database-reviewer agents (2026-06-26) — no blocking findings; fixes applied (hook deps, copyTimer cleanup, a11y dialog role + labels, Fragment key)
- Manual: edit/delete + drawer **not yet manually tested** (page is auth-gated; verify in a browser with a logged-in session — generate a URL, click its row, edit a field, confirm the URL updates, then delete)
- No unit tests written
- No E2E tests written
