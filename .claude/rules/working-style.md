# Working Style

These conventions carry over from prior collaborative work. Follow them exactly.

## Before Touching Any Code

- For feature work: read `docs/current-status.md`, the relevant feature spec in `docs/features/`, and any referenced architecture sections in `CLAUDE.md` first.
- For small fixes: scale reading to the task. Don't read 7 files to fix a typo.
- Summarize your understanding and identify the exact files you'll touch before making any changes.
- If the task conflicts with documented architecture, **flag it before coding** — do not silently work around it.

## Feature Module Structure

All feature code lives in `src/features/{name}/`. Every feature is a vertical slice — schema → queries → actions → UI, complete end-to-end. No half-finished implementations.

```
src/features/{name}/
  queries.ts      # Data fetching (server-side DB calls)
  actions.ts      # Server actions ("use server", typed results)
  validation.ts   # Zod schemas for this feature
  constants.ts    # Feature constants — NEVER export from "use server" files
```

## Server Actions Pattern

```typescript
"use server";

type ActionResult<T> = { data: T; error?: never } | { data?: never; error: string };

export async function doSomething(input: Input): Promise<ActionResult<Output>> {
  // 1. Permission check — early return if unauthorized
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // 2. Validate input
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.message };

  // 3. Do the work
  const result = await queries.doSomething(parsed.data, user.id);

  // 4. Invalidate cache
  revalidatePath("/relevant-path");

  return { data: result };
}
```

## Permission Checks Happen Twice

- **In server actions**: security enforcement — always, no exceptions.
- **In UI components**: UX (hide buttons/routes the user can't access).

Never only one. Never skip the server-side check because the UI already hides it.

## Server-First Default

- Default to Server Components for data fetching and logic.
- Use `'use client'` only for interactivity (forms, state, event handlers).
- Never fetch data in a Client Component when a Server Component can do it.

## Code Style

- No comments unless the WHY is non-obvious: a hidden constraint, a subtle invariant, a workaround for a specific bug.
- No error handling for scenarios that can't happen. Trust internal code and framework guarantees.
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

## Session Closeout (Required)

At the end of every session, update these four files before stopping:

| File | Update when |
|------|-------------|
| `docs/current-status.md` | Always — what changed, what's incomplete |
| `docs/features/{name}.md` | After any feature work — status, test results, edge cases |
| `docs/decision-log.md` | Any architecture or product decision was made |
| `docs/open-questions.md` | Any risk, bug, or unresolved question surfaced |

**Do not mark a feature complete unless it has been manually tested.**

## Source of Truth

Docs are the source of truth, not the code. Rehydrate context from `docs/` at the start of each session. When docs and code disagree, fix the docs to match reality or flag the discrepancy — do not assume the code is wrong.
