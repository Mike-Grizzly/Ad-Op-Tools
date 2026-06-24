# UTM Generator

## Status
**In Progress** — schema migration applied, feature module in development.

## Overview
Template-based bulk UTM URL builder. Select a campaign type → parameters auto-populate. Stores templates and generation history per user.

## Scope
- Generate a single UTM URL from a form (source, medium, campaign, content, term)
- Save parameter sets as named templates
- View recent generation history (last 50 entries)
- Copy generated URL to clipboard

## Out of Scope (this slice)
- Bulk CSV generation
- Sharing templates across users
- UTM validation against platform rules

## Schema
Two tables: `utm_templates` and `utm_history`. Both scoped to `user_id` with RLS.

## Routes
- `GET /utm` — generator form + history

## Feature Module
`src/features/utm/`
- `validation.ts` — Zod schemas for params and template creation
- `queries.ts` — `getUtmTemplates()`, `getUtmHistory()`
- `actions.ts` — `generateUtm()`, `saveTemplate()`, `deleteTemplate()`
- `constants.ts` — common sources, mediums

## Test Cases
- [ ] Generates correct URL with all five params
- [ ] Generates correct URL with only required params (source, medium, campaign)
- [ ] Rejects invalid base URL
- [ ] Saves to history on generation
- [ ] Template saves and pre-fills form
- [ ] Auth: unauthenticated request returns Unauthorized

## Edge Cases Found
_None yet_

## Last Updated
2026-06-24 — spec created, building
