---
name: feature-development
description: Standard feature implementation workflow for Ad Op Tools.
allowed_tools: ["Bash", "Read", "Write", "Edit", "Grep", "Glob"]
---

# /feature-development

Use this workflow when implementing a new feature in Ad Op Tools.

## Goal

Deliver a production-grade feature end-to-end: data model → API route → UI component → tests.

## Common Files

- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — Shared UI components
- `src/lib/` — Business logic and integrations
- `supabase/migrations/` — Database schema changes
- `src/types/` — TypeScript type definitions

## Suggested Sequence

1. Define or update types in `src/types/`.
2. Write or update the Supabase migration if schema changes are needed.
3. Implement the server-side logic in `src/lib/` or `src/app/api/`.
4. Build the UI component in `src/components/` or `src/app/`.
5. Add integration tests where applicable.
6. Run `npm run build` and `npm run type-check` before committing.

## Typical Commit Signals

- `feat(scope): add ...` for new capabilities
- `fix(scope): ...` for bug fixes
- `refactor(scope): ...` for non-breaking rework

## Notes

- Follow TypeScript strict mode — no `any`, no `as` casts without justification.
- All Supabase queries must use Row Level Security; never bypass with service role in client code.
- Keep API routes thin — move business logic to `src/lib/`.
- Update this command if the workflow evolves materially.
