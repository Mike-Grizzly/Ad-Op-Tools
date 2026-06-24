# Working Style — Ad Op Tools

Carry-over from Proscene. These rules govern how we plan, build, and close out every session.

## Before Touching Any Code

- For feature work: read `docs/current-status.md`, the relevant feature spec, and any affected architecture docs first.
- For small fixes: scale reading to the task — do not read 7 files to fix a typo.
- Summarize your understanding and identify the exact files you will touch before making any changes.
- If the task conflicts with documented architecture, flag it before coding — do not silently work around it.

## How We Build

### Vertical slices
Every feature is complete end-to-end: schema migration → queries → server actions → UI. No half-finished implementations. Nothing is marked complete unless it has been manually tested.

### Feature module structure
All feature code lives in `src/features/{name}/`:

```
src/features/{name}/
  queries.ts      # Data fetching (server-side only)
  actions.ts      # Server actions ("use server")
  validation.ts   # Zod schemas for this feature
  constants.ts    # Feature-scoped constants
```

- `actions.ts` must start with `"use server"`.
- Never export constants from a `"use server"` file — keep them in `constants.ts`.
- `queries.ts` contains only read functions; no mutations.

### Server actions pattern

```typescript
"use server"

type ActionResult<T> = { data: T; error?: never } | { data?: never; error: string }

export async function doSomething(input: unknown): Promise<ActionResult<OutputType>> {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.message }

  // ... do work ...

  revalidatePath('/relevant-path')
  return { data: result }
}
```

### Permission checks happen twice
1. **In server actions** — auth check as the first early return (security boundary).
2. **In UI components** — do not render actions or controls the user cannot perform (UX boundary).
Never only one.

### Server-first
Default to React Server Components for data fetching and rendering. Add `'use client'` only when interactivity requires it. Keep client components small.

## Code Style

- No comments unless the WHY is non-obvious: a hidden constraint, a workaround, a subtle invariant.
- No error handling or validation for scenarios that cannot happen.
- Three similar lines is better than a premature abstraction.
- Prefer editing existing files over creating new ones.
- TypeScript strict throughout — no `any`, no `@ts-ignore` without a documented reason.

## What Not To Do

- Do not introduce new libraries without approval.
- Do not rewrite working systems unless explicitly asked.
- Do not expand schema, permissions, or abstractions speculatively.
- Do not clean up unrelated code during feature work.
- Do not silently introduce new patterns — flag and discuss first.
- Ask before broad refactors.

## Session Closeout (required at end of every session)

1. Update `docs/current-status.md` — what changed, what is incomplete.
2. Update the relevant feature spec in `docs/features/` — status, test results, edge cases found.
3. Update `docs/decision-log.md` if any architecture or product decisions were made.
4. Update `docs/open-questions.md` if risks, bugs, or unresolved questions surfaced.
5. Do not mark a feature complete unless it has been manually tested.

## Source of Truth

The `docs/` directory is the source of truth for project state. Rehydrate context from those files, not from memory or assumptions. Keep them current — stale docs are worse than no docs.
