# Working Style — Ad Op Tools

Carry-over from Proscene. These rules govern how we plan, build, and close out every session.

## Before Touching Any Code

- For feature work: read `docs/current-status.md`, the relevant feature spec, and any affected architecture docs first.
- For small fixes: scale reading to the task — do not read 7 files to fix a typo.
- Summarize your understanding and identify the exact files you will touch before making any changes.
- If the task conflicts with documented architecture, flag it before coding — do not silently work around it.

## Planning & Approval (owner rule, 2026-07-23)

- Every slice plan is presented with a **plain-terms explanation first**: what we are
  building, why it matters to the app, and why the slice is tackled the way it is —
  before the technical outline. No jargon-only plans.
- After presenting a plan, **wait for the owner's explicit "go"** before writing any
  code. Plan-mode approval signals alone are not sufficient (they have misfired twice).
- Checkpoints stay owner-gated: plan approval → build → migration apply → merge.

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

## Quality Bar & Agent Usage

The standing bar for every change: clean, safe, stable architecture. The mechanics are spread through this file; this section codifies how the review agents enforce that bar and when to escalate vs. decide.

### Review agents — invoke proactively (judgment, not a fixed pipeline)
- **Before non-trivial work** — `architect` or `planner` to scope the slice and surface architectural impact.
- **After substantive code changes** — `code-reviewer`, plus `typescript-reviewer` / `react-reviewer` when the diff warrants.
- **Auth, user input, or API endpoints** — `security-reviewer`.
- **Ad platform API / OAuth / token / spend code** — `ad-platform-reviewer`.
- **Migrations or schema changes** — `database-reviewer`; RLS ships in the same migration, never a table left open.

Scale to the task — a one-line fix does not need the architect; a feature slice does.

### Pre-commit gate
`npm run type-check`, `npm run lint`, and `npm run build` must pass before committing. Never commit red.

### Decide vs. escalate
- **Decide without asking** — execution details: naming, file layout, which helper, how a query is structured.
- **Surface first** — anything that changes architecture, adds a dependency, or trades off security or data integrity. Flag it and get a call before acting; never work around documented architecture silently.

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

## Claude Design Exports — Additive, Never Replace (Guardrail)

Design exports live in `Ad Op Tools UI Design/`. Each new export (often a numbered `(N)` subfolder) is a **feature-scoped mock** of the thing it was prompted for — it usually shows only that feature and may omit, simplify, or restyle existing UI. It is NOT a new full-page design.

- Never delete or overwrite existing components, pages, or the original design files because a new export looks different. Integrate the export **on top of** what exists.
- Diff a new export against the current UI; extract only the new/changed feature and build that. Preserve all existing functionality unless the user explicitly asks to drop it. If an export removes a feature (e.g. the table group-by), flag it and confirm before removing.
- Keep the original full-page design as the source of truth. Store feature mocks in clearly-named subfolders; do **not** auto-replace the parent design folder with a numbered export.

## Session Closeout (required at end of every session)

1. Update `docs/current-status.md` — what changed, what is incomplete.
2. Update the relevant feature spec in `docs/features/` — status, test results, edge cases found.
3. Update `docs/decision-log.md` if any architecture or product decisions were made.
4. Update `docs/open-questions.md` if risks, bugs, or unresolved questions surfaced.
5. Do not mark a feature complete unless it has been manually tested.

## Source of Truth

The `docs/` directory is the source of truth for project state. Rehydrate context from those files, not from memory or assumptions. Keep them current — stale docs are worse than no docs.
