# Feature: UTM Generator

## Status
**Built — not yet manually tested in production.** All code is on `main`.

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
- History persisted per-user in Supabase

### Out of scope (by design)
- Bulk generation from CSV
- Sharing URLs across team members (single-user for now)
- Editing or deleting history entries

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
  └── UTMPageClient                   ← 'use client' shell
        ├── UTMForm                   ← form with AutocompleteInput sub-component
        ├── UTMHistoryTable           ← recent 20 sidebar
        └── UTMUrlLibrary             ← spreadsheet for all entries
```

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
- Auto-generated `generated_url` is built client-side for preview but re-built server-side on save — both paths should produce identical output; not explicitly tested

## Migrations
- `supabase/migrations/20260624000000_create_utm_tables.sql`
- `supabase/migrations/20260625000000_utm_history_add_columns.sql`

## Test Status
- TypeScript: passes `tsc --noEmit` clean
- Manual: not yet tested in production (Vercel deploy pending verification)
- No unit tests written
- No E2E tests written
