# Decision Log

Significant architecture and product decisions. Append; never delete.

---

## 2026-06-24 — Tech Stack Selection

**Decision**: Next.js 14+ App Router, Supabase (PostgreSQL + Auth + Storage), TypeScript strict, Tailwind CSS, npm.

**Rationale**: App Router + Server Components minimize client JS. Supabase provides auth, RLS, and storage in one managed service — no separate auth layer needed. TypeScript strict catches integration bugs at compile time, critical for multi-platform API work.

**Alternatives considered**: Remix (less ecosystem maturity for this use case), Prisma + PlanetScale (separate auth management), plain PostgreSQL (operational overhead).

---

## 2026-06-24 — Deployment Target: Vercel

**Decision**: Deploy to Vercel from the start rather than running locally first.

**Rationale**: User preference. Avoids local environment drift. Vercel's Supabase integration auto-syncs environment variables.

**Implications**: First deployment happens before any features are built. Need Supabase project created before initializing Next.js.

---

## 2026-06-24 — Feature Module Structure

**Decision**: Feature code lives in `src/features/{name}/` with `queries.ts`, `actions.ts`, `validation.ts`, `constants.ts`. Vertical slices — schema through UI, complete end-to-end.

**Rationale**: Carries over from prior project (Proscene). Keeps feature logic co-located, prevents cross-feature coupling, makes it clear where to add code without hunting across `lib/`, `components/`, and `app/`.

**Implications**: `src/components/` holds only genuinely shared UI primitives. Feature-specific components live in `src/features/{name}/components/` if needed.

---

## 2026-06-24 — Platform Integrations: Separate from Feature Modules

**Decision**: Ad platform API clients (`google-ads/`, `meta/`, `linkedin/`, `tiktok/`) live in `src/lib/integrations/` and are not feature modules.

**Rationale**: Platform clients are shared infrastructure, not features. Multiple features (budget dashboard, creative manager) consume the same platform client.

---

## 2026-06-24 — No Local Supabase

**Decision**: Not using `supabase start` for local development. All development targets the remote Supabase project via environment variables.

**Rationale**: Vercel-first deployment means parity with production from day one. Local Supabase adds setup complexity with limited benefit at this stage.

**Risk**: Schema migrations affect the shared remote DB immediately. Mitigation: use a separate Supabase project for development vs production when the project reaches that stage.

---

## 2026-06-25 — UTM Generator Built First

**Decision**: UTM Generator is the first complete feature slice.

**Rationale**: No OAuth or external API dependencies. Validates the full stack (migrations → server actions → client components) end-to-end before touching anything that requires platform credentials.

---

## 2026-06-25 — Design-First Workflow (Claude Design → Next.js)

**Decision**: Use Claude Design to prototype UI, then convert the exported `.dc.html` to inline-style React components.

**Rationale**: Faster iteration on layout and visual design before writing component code. The `.dc.html` export is kept in `Ad Op Tools UI Design/` as the source of visual truth.

**Workflow**: When a new design file is added as a duplicate `(1)` subfolder (Claude Design export behavior), move files to replace the parent folder and delete the subfolder — handled automatically by Claude at session start.

**Implications**: Inline styles throughout feature components (no Tailwind utility classes in feature UI). This is intentional — the design system is encoded in the design file, not in Tailwind config.

---

## 2026-06-25 — Autocomplete via Server Action (Not API Route)

**Decision**: `getAutocompleteSuggestions` is a server action in `actions.ts`, not a `/api/` route handler.

**Rationale**: Consistent with the feature module pattern. Server actions colocate the logic with the feature, avoid an extra HTTP route, and share the same auth check pattern.

**Security note**: The `field` parameter is validated against a hardcoded whitelist `['campaign', 'base_url']` before being used in the query — prevents arbitrary column access if the client sends an unexpected value.

---

## 2026-06-25 — Custom UTM Parameters: `utm_adset` and `utm_creative`

**Decision**: Ad Set and Creative are appended as `utm_adset` and `utm_creative` (non-standard parameters).

**Rationale**: GA4 and most analytics platforms pass through unknown `utm_*` parameters as custom dimensions. These two fields are de-facto standard in paid media tracking even though they are not in the original UTM spec.

---

## 2026-06-25 — UTM Tail Derived Client-Side, Not Stored

**Decision**: The UTM tail (query string only) is computed from `generated_url` on every render, not stored as a separate column.

**Rationale**: `generated_url` already contains the full URL. Slicing from `indexOf('?')` is trivially cheap. Storing it separately would be redundant data and a sync risk.

---

## 2026-06-25 — History Limit 500 for URL Library

**Decision**: `getUTMHistory()` fetches up to 500 rows (raised from 20) to power the URL Library spreadsheet.

**Rationale**: The Recent URLs sidebar slices client-side to 20. The URL Library needs the full set for accurate group-by and filter behavior. 500 is a practical cap until pagination is added.

**When to revisit**: If users accumulate thousands of URLs, add cursor-based pagination to `getUTMHistory` and make the URL Library page-aware.

---

## 2026-06-25 — Standing Quality Bar & Agent-Usage Policy

**Decision**: Adopt a standing quality bar — clean, safe, stable architecture — enforced through proactive use of the repo's review agents plus a hard pre-commit gate (`type-check` + `lint` + `build` must pass). Claude uses judgment on which agents to invoke per task (not a fixed pipeline) and escalates any change to architecture, dependencies, or security/data integrity before acting. Full policy in `.claude/rules/working-style.md` → "Quality Bar & Agent Usage".

**Rationale**: User delegated execution judgment for the project but wants code quality, safety, and architectural stability held constant. Encoding it in the auto-loaded working-style rules makes the bar durable across sessions rather than dependent on in-context memory.

**Implications**: Applies from now on without needing to be re-requested each session. The bar can be tightened or loosened by editing the working-style section; changes of substance get logged here.
