> Project-specific rules for Ad Op Tools. Extends guardrails.md.

## Stack

- **Framework**: Next.js 14+ App Router (React Server Components)
- **Language**: TypeScript 5+ strict mode
- **Database / Auth**: Supabase (PostgreSQL + Auth + Storage)
- **Styling**: Tailwind CSS
- **Package manager**: npm (or pnpm if lock file present)

## File Conventions

- `src/app/` — Pages, layouts, API routes (App Router)
- `src/components/` — Reusable UI components (`*.tsx`)
- `src/components/ui/` — Headless/primitive components
- `src/hooks/` — React hooks (`use-*.ts`)
- `src/lib/` — Business logic, utilities, integrations
- `src/lib/integrations/<platform>/` — One folder per ad platform
- `src/types/` — Shared TypeScript types and Supabase generated types
- `supabase/migrations/` — Timestamped SQL migration files
- `supabase/seed.sql` — Local dev seed data

## TypeScript Rules

- Strict mode: `"strict": true` in tsconfig.json — no exceptions.
- Prefer `type` over `interface` for data shapes; use `interface` for extension contracts.
- Use Zod for runtime validation at API boundaries.
- Generated Supabase types live in `src/types/database.ts` — do not hand-edit.
- Always type async function return values explicitly.

## Next.js Patterns

- Server Components: fetch data directly with Supabase server client.
- Client Components: prefix file with `'use client'`; keep them small and push data down from server.
- API routes: use `NextResponse` and always validate request body with Zod.
- Never put secrets in `NEXT_PUBLIC_*` env vars.
- Use `next/cache` `revalidatePath` / `revalidateTag` for cache invalidation after mutations.

## Supabase Patterns

- Create server client with `createServerComponentClient` or `createRouteHandlerClient`.
- Always call `supabase.auth.getUser()` server-side to verify auth — never trust cookies alone.
- Row-Level Security must be enabled on every table.
- Keep Supabase queries in dedicated data-access functions, not inline in components.

## Testing

- Unit tests: Vitest
- Integration/E2E: Playwright
- Test files: `*.test.ts` / `*.test.tsx` co-located or in `__tests__/`
- Run `npm run type-check` before committing TypeScript changes.

## Code Style

- No `console.log` in committed code — use a proper logger.
- Async/await over raw Promises.
- Early returns to reduce nesting.
- Extract magic strings/numbers to named constants.
