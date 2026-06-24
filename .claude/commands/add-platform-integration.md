---
name: add-platform-integration
description: Add a new ad platform API integration (Google Ads, Meta, LinkedIn, TikTok).
allowed_tools: ["Bash", "Read", "Write", "Edit", "Grep", "Glob"]
---

# /add-platform-integration

Use this workflow when adding support for a new ad platform API.

## Goal

Integrate a new ad platform so budget data, creative assets, and campaign metadata flow into the unified dashboard.

## Common Files

- `src/lib/integrations/<platform>/` — Platform-specific API client
- `src/lib/integrations/<platform>/types.ts` — Platform-specific response types
- `src/lib/integrations/index.ts` — Central integration registry
- `supabase/migrations/` — Any schema additions for the platform
- `src/app/api/integrations/<platform>/` — Next.js API routes for OAuth + data sync

## Suggested Sequence

1. Create `src/lib/integrations/<platform>/client.ts` with the API wrapper.
2. Define typed responses in `src/lib/integrations/<platform>/types.ts`.
3. Add OAuth flow in `src/app/api/integrations/<platform>/auth/`.
4. Add data sync route in `src/app/api/integrations/<platform>/sync/`.
5. Store tokens encrypted in Supabase (`platform_connections` table).
6. Map platform data to the canonical `BudgetEntry` / `Campaign` types.
7. Register the integration in `src/lib/integrations/index.ts`.

## Typical Commit Signals

- `feat(integrations): add <platform> OAuth connection`
- `feat(integrations): sync <platform> spend data`

## Notes

- Never store raw OAuth tokens in the browser — always server-side only.
- Use Supabase Vault or environment variables for API credentials.
- Rate-limit all outbound API calls; back off on 429s.
- Each platform integration should implement the `AdPlatformClient` interface.
- Log all API errors to the observability layer.
