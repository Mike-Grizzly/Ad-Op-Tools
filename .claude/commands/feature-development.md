---
name: feature-development
description: Standard feature implementation workflow for Ad Op Tools.
allowed_tools: ["Bash", "Read", "Write", "Edit", "Grep", "Glob"]
---

# /feature-development

Vertical slice delivery: schema → queries → server actions → UI. Nothing is done until manually tested.

## Before Writing Code

1. Read `docs/current-status.md` and the relevant feature spec.
2. State your understanding of the task and list the exact files you will touch.
3. If anything conflicts with documented architecture, flag it — do not work around it silently.

## Build Sequence

### 1. Schema (if needed)
- Create `supabase/migrations/<timestamp>_<name>.sql`
- RLS policies in the same migration — never leave a table without RLS
- Run through `database-reviewer` agent before committing

### 2. Types
- Update or create types in `src/types/`
- `src/types/database.ts` is auto-generated — never hand-edit
- Zod schemas for API boundaries go in `src/features/{name}/validation.ts`

### 3. Queries (`src/features/{name}/queries.ts`)
- Server-only data fetching — no `"use server"` directive here
- Each function gets the Supabase server client from `src/lib/supabase/server.ts`
- Explicit return types on every async function

### 4. Server Actions (`src/features/{name}/actions.ts`)
```typescript
"use server";

import { z } from "zod";

type ActionResult<T> = { data?: T; error?: string };

export async function doSomething(input: unknown): Promise<ActionResult<Thing>> {
  // 1. Auth / permission check — early return if denied
  const user = await requireAuth(); // throws or returns user
  if (!hasPermission(user, "thing:write")) {
    return { error: "Unauthorized" };
  }

  // 2. Validate input
  const parsed = ThingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.message };

  // 3. Business logic

  // 4. Revalidate
  revalidatePath("/dashboard/things");

  return { data: result };
}
```

### 5. UI (`src/app/(dashboard)/{feature}/`)
- Server Component fetches data via `queries.ts`
- Client Component receives data as props — no direct DB calls
- Permission check in UI mirrors the server action check (UX gate, not security gate)
- Loading and error states required

### 6. Before Committing
```bash
npm run type-check   # must pass
npm run lint         # must pass
npm run build        # must pass (catch RSC boundary errors)
```

## Session Closeout

After the feature is done (or at end of session):
- Update `docs/current-status.md`
- Update `docs/features/{name}.md` — status, test results, edge cases found
- Update `docs/decision-log.md` if any architectural decisions were made
- Update `docs/open-questions.md` if anything is unresolved
- Do not mark complete unless manually tested

## What Not to Do

- Do not introduce new libraries without approval
- Do not expand schema speculatively beyond what the slice requires
- Do not clean up unrelated code while building the feature
- Do not export constants from `"use server"` files
