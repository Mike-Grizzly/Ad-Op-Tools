# Ad Op Tools — SaaS Ad Operations Platform

A production-grade SaaS tool that automates the repetitive manual steps in digital ad campaign operations. Built for the first user today, designed for paid users from day one.

## Problem

Every new campaign requires 10–20 repeated manual steps across multiple platforms. Ad Op Tools automates the tedious ops work so focus stays on creative and strategy.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14+ App Router |
| Language | TypeScript strict |
| Database / Auth | Supabase (PostgreSQL + Auth + Storage) |
| Styling | Tailwind CSS |
| Package manager | npm |

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Login / signup pages
│   ├── (dashboard)/            # Main app (requires auth)
│   │   ├── budget/             # Budget dashboard
│   │   ├── campaigns/          # Campaign management
│   │   ├── utm/                # UTM generator
│   │   ├── gtm/                # GTM automation
│   │   ├── creative/           # Creative asset manager
│   │   └── reports/            # Custom reporting
│   └── api/                    # API routes
│       └── integrations/       # Platform OAuth + sync
├── components/
│   └── ui/                     # Shared primitive/headless components only
├── features/                   # Vertical slice modules
│   └── {name}/
│       ├── queries.ts          # DB queries and data fetching
│       ├── actions.ts          # Server actions ("use server")
│       ├── validation.ts       # Zod schemas for this feature
│       ├── constants.ts        # Feature constants (never "use server")
│       └── components/         # Feature-specific UI (if needed)
├── hooks/                      # Shared React hooks (use-*.ts)
├── lib/
│   ├── integrations/           # Ad platform API clients (shared infra)
│   │   ├── google-ads/
│   │   ├── meta/
│   │   ├── linkedin/
│   │   └── tiktok/
│   └── supabase/               # DB client helpers
└── types/
    ├── database.ts             # Supabase generated types (do not hand-edit)
    └── integrations.ts         # Shared integration types

supabase/
└── migrations/                 # Timestamped SQL migrations

docs/
├── current-status.md           # What's built, what's in progress
├── decision-log.md             # Architecture and product decisions
├── open-questions.md           # Unresolved questions and risks
└── features/                   # Per-feature specs and status
```

## Core Features

### 1. Budget Dashboard
Pull real-time spend data from Google Ads, Meta, LinkedIn, and TikTok into a unified view. Replaces the Excel spreadsheet that only tracks monthly caps. Shows where money is actually going and how it's distributed across platforms and campaigns.

### 2. UTM Generator
Template-based bulk UTM creation. Select a campaign type → all parameters auto-populate systematically. Stores templates and generation history.

### 3. GTM Automation
Uses the GTM API to create tags, triggers, and conversion events programmatically. A "New Campaign" wizard fires off and creates the standard pixel stack in one click. No more manual setup for every campaign.

### 4. Creative Asset Manager
Upload and swap creative assets across ad platforms (Meta, Google, TikTok) via their APIs. Clone existing ads with new creative without recreating them from scratch.

### 5. Custom Reporting Dashboards
Looker Studio–style reporting built in-app. Pulls from ad platform APIs. Clean, fast, and actually usable — not Looker Studio itself.

## Known Constraints (Intentionally Manual)

These tasks stay manual by design — automation is not currently feasible or practical:

- **Initial pixel creation** on platforms requires their UIs (not exposed in APIs)
- **First-time OAuth connection** per platform requires human interaction
- **GTM snippet deployment** to websites is manual unless the site is also controlled by this system

## Development Conventions

### TypeScript
- Strict mode (`"strict": true`) — no `any`, no `@ts-ignore` without justification
- Prefer `type` over `interface` for data shapes
- Use Zod for runtime validation at all API boundaries
- Always type async function return values explicitly
- `src/types/database.ts` is auto-generated — never hand-edit

### Next.js
- Server Components by default; use `'use client'` only when needed
- Keep client components small — push data down from server
- API routes: always validate request body with Zod before processing
- Never put secrets in `NEXT_PUBLIC_*` env vars
- Use `revalidatePath` / `revalidateTag` for cache invalidation after mutations

### Supabase
- All DB queries go through server-side code (server components or API routes)
- Service role key is never exposed to the client
- Row-Level Security (RLS) must be enabled on every table
- Always call `supabase.auth.getUser()` server-side to verify auth

### File Naming
- kebab-case for all files: `budget-dashboard.tsx`, `use-campaigns.ts`
- Named exports preferred over default exports
- Files stay under 300 lines; extract helpers when they grow

### Git / Commits
- Conventional commits: `feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert`
- Message under 72 characters
- No `console.log` in committed code
- No hardcoded secrets or API keys

### Environment Variables
- All env vars documented in `.env.example` with placeholder values
- Server-only vars: no `NEXT_PUBLIC_` prefix

## Ad Platform Integration Pattern

Every ad platform follows the same structure:

```
src/lib/integrations/<platform>/
  client.ts        # API wrapper
  types.ts         # Platform response types  
  transforms.ts    # Map to canonical AdPlatformData types
```

All integrations implement the `AdPlatformClient` interface from `src/types/integrations.ts`.

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `users` | Managed by Supabase Auth |
| `platform_connections` | OAuth tokens per user per platform |
| `campaigns` | Campaign metadata synced from platforms |
| `budget_entries` | Daily spend data pulled from platforms |
| `utm_templates` | Saved UTM parameter templates |
| `utm_history` | Generated UTM links |
| `creative_assets` | Uploaded creative file metadata |
| `gtm_accounts` | Connected GTM account/container references |
| `reports` | Saved dashboard configurations |

## ECC Framework

This project uses the [ECC (Everything Claude Code)](https://github.com/affaan-m/ECC) framework for hook automations and workflow commands.

### Hook Automations (`.claude/settings.json`)

| Hook | Trigger | Action |
|------|---------|--------|
| `post-edit:accumulator` | After Edit/Write | Records edited TS/JS files for batch processing |
| `post-edit:format` | After Edit/Write | Auto-formats with Prettier or Biome |
| `pre-bash:commit-quality` | Before git commit | Scans for secrets, validates commit message format |
| `stop:format-typecheck` | Session end | Batch formats + typechecks all edited files |

### Slash Commands

| Command | Purpose |
|---------|---------|
| `/feature-development` | Standard feature implementation workflow |
| `/database-migration` | Supabase schema migration workflow |
| `/add-platform-integration` | Add a new ad platform API integration |

### Hook Profile

Set `ECC_HOOK_PROFILE=minimal` to disable non-critical hooks, `standard` (default) for normal development, `strict` for pre-release. Disable individual hooks with `ECC_DISABLED_HOOKS=hookId1,hookId2`.

## Source of Truth

`docs/` is the source of truth for project state. At the start of each session, read:
- `docs/current-status.md` — what exists, what's in progress
- `docs/features/{name}.md` — spec for the feature being worked on
- `docs/decision-log.md` — prior architectural decisions

When docs and code disagree, fix the docs to match reality or flag the discrepancy.

## Session Closeout (Required Every Session)

Before ending any session, update:
- `docs/current-status.md` — what changed, what's incomplete
- `docs/features/{name}.md` — status, test results, edge cases found
- `docs/decision-log.md` — if any architecture or product decisions were made
- `docs/open-questions.md` — if any risks, bugs, or unresolved questions surfaced

Do not mark a feature complete unless it has been manually tested.

## Getting Started

```bash
# Install dependencies
npm install

# Copy and fill in env vars
cp .env.example .env.local

# Run dev server
npm run dev
```

## Key npm Scripts (once package.json is set up)

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run type-check   # Run tsc --noEmit
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E tests
```
