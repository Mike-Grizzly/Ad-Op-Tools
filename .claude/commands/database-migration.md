---
name: database-migration
description: Supabase database schema migration workflow for Ad Op Tools.
allowed_tools: ["Bash", "Read", "Write", "Edit", "Grep", "Glob"]
---

# /database-migration

Use this workflow when making schema changes to the Supabase database.

## Goal

Safe, reversible schema changes with generated TypeScript types.

## Common Files

- `supabase/migrations/` — SQL migration files (timestamped)
- `src/types/database.ts` — Generated Supabase types
- `supabase/seed.sql` — Seed data for local dev

## Suggested Sequence

1. Create a new migration file: `supabase migration new <name>`.
2. Write the forward migration SQL (and rollback comments).
3. Always add RLS policies for every new table.
4. Apply locally: `supabase db reset` or `supabase db push`.
5. Regenerate types: `supabase gen types typescript --local > src/types/database.ts`.
6. Update any TypeScript code that consumes the changed schema.
7. Run `npm run type-check` to confirm no type errors.

## Typical Commit Signals

- `feat(db): add <table_name> table`
- `fix(db): correct <column> constraint`
- `refactor(db): rename <old> to <new>`

## Notes

- Never drop columns or tables without a multi-step migration (add nullable → backfill → make required → later drop).
- All tables must have RLS enabled and at least one policy.
- Use `uuid_generate_v4()` for primary keys.
- Add `created_at` / `updated_at` timestamps to every table.
- Include the generated `database.ts` in the commit so types stay in sync.
