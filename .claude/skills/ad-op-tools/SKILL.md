---
name: ad-op-tools
description: Development skill for Ad Op Tools — a SaaS ad operations platform built with Next.js App Router, Supabase, TypeScript strict, and Tailwind.
---

# Ad Op Tools — Development Skill

## When to Use

Invoke this skill when building, debugging, or extending any part of the Ad Op Tools platform.

## How It Works

Ad Op Tools automates the repetitive manual steps in digital ad campaign operations. The platform connects to ad platform APIs (Google Ads, Meta, LinkedIn, TikTok) to pull spend data, manage creative assets, generate UTMs, and automate GTM tag creation.

### Architecture

```
Ad Op Tools
├── src/app/                   # Next.js App Router
│   ├── (auth)/                # Auth pages (login, signup)
│   ├── (dashboard)/           # Main app dashboard
│   ├── api/                   # API routes
│   │   └── integrations/      # Platform OAuth + sync
│   └── layout.tsx
├── src/components/            # Reusable UI
│   ├── ui/                    # Primitive components
│   ├── dashboard/             # Budget dashboard widgets
│   ├── campaigns/             # Campaign management
│   └── utm/                   # UTM generator
├── src/lib/
│   ├── integrations/          # Ad platform clients
│   │   ├── google-ads/
│   │   ├── meta/
│   │   ├── linkedin/
│   │   └── tiktok/
│   ├── supabase/              # DB client helpers
│   └── gtm/                   # GTM API client
├── src/hooks/                 # React hooks
├── src/types/                 # TypeScript types
│   └── database.ts            # Supabase generated types
└── supabase/
    ├── migrations/
    └── seed.sql
```

### Core Features

1. **Budget Dashboard** — Unified spend view across all connected platforms. Pulls via platform APIs, stores aggregated data in Supabase for fast reads.

2. **UTM Generator** — Template-based bulk UTM creation. Campaign type → auto-populate parameters. Stores templates and history.

3. **GTM Automation** — GTM API wrapper that creates tags, triggers, and conversion events programmatically. "New campaign" wizard fires the standard pixel stack.

4. **Creative Asset Manager** — Upload, swap, and clone creative assets across Meta, Google, and TikTok via their respective APIs.

5. **Custom Reporting** — Pull platform data into configurable dashboards. Charts, tables, date ranges, metric selection.

### Platform Integration Pattern

Each ad platform follows the same structure:
```
src/lib/integrations/<platform>/
  client.ts        # API wrapper
  types.ts         # Platform response types
  transforms.ts    # Map to canonical types
```

All integrations implement `AdPlatformClient` (defined in `src/types/integrations.ts`).

## Examples

### Add a new ad platform

```
/add-platform-integration
```

Then follow the workflow: create client → add OAuth routes → map to canonical types → register in index.

### Database change

```
/database-migration
```

Create migration → write RLS policies → regenerate types → update consuming code.

### New feature

```
/feature-development
```

Types → migration (if needed) → lib logic → API route → UI component → tests.

## Known Constraints

- Initial pixel creation on platforms requires their UIs (not automatable).
- First-time OAuth connection per platform requires human interaction.
- GTM snippet deployment to external sites is manual unless the site is also controlled.
