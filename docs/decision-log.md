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

---

## 2026-06-26 — UTM History Edit/Delete + Detail Drawer; RLS Lineage Divergence

**Decision**: Add edit and delete for `utm_history` entries via a right-side detail drawer opened by clicking a row in the URL Library. This reverses the earlier "editing or deleting history entries — out of scope" note in the UTM spec, at user request.

**Architecture**:
- New server actions `updateUTMHistory` / `deleteUTMHistory` — auth-guarded, scoped with `.eq('user_id', user.id)`, Zod-validated (`utmHistoryIdSchema` for the id + `utmParamsSchema` for the body). `updateUTMHistory` rebuilds `generated_url` server-side via the existing strict `buildUTMUrl` and returns the full row so the client syncs state from the source of truth.
- The drawer (`utm-detail-drawer.tsx`) is mounted with `key={entry.id}` and initializes local state from props, rather than resetting via an effect — idiomatic React, avoids set-state-in-effect and stale state when switching rows.
- Extracted the client preview builder to `url.ts` (`buildPreviewUrl`), shared by the form and drawer (behavior-preserving move out of `utm-form.tsx`).

**RLS decision**: The remote DB was provisioned manually with a single consolidated `FOR ALL` policy per UTM table (`USING`/`WITH CHECK = auth.uid() = user_id`), which already permits UPDATE/DELETE — so edit/delete work on remote with no DB change. The tracked migrations use granular per-command policies and lacked an UPDATE policy. Added `20260626000000_utm_history_update_policy.sql` (granular UPDATE) to keep the tracked lineage complete for fresh environments, but **did not apply it to remote** (would create a redundant overlapping policy on an already-working table).

**Risk**: tracked migrations and remote now differ in policy *shape* (granular vs consolidated) though not in effect. Do not `supabase db pull` over the tracked lineage. Reconciling the two is deferred — see open-questions UTM-004.

**Out of scope (deferred)**: per-UTM analytics in the drawer — a disabled "coming soon" placeholder is rendered so the layout reserves space for it.

---

## 2026-06-26 — Guardrail: Design exports are additive, never page replacements

**Context**: A new Claude Design export (`Ad Op Tools UI Design (2)/`) was a standalone, feature-scoped redesign of just the URL Library + detail drawer — it dropped the generator form and simplified the table. The prior "Design-First Workflow" note (2026-06-25) said to "move files to replace the parent folder and delete the subfolder" on each new export, which would have clobbered the original full-page design and implied wholesale-replacing existing components. The user flagged this as a foot-gun.

**Decision**: Treat every design export as a feature-scoped mock to integrate **additively**. Never delete/replace existing components, pages, or the original design files based on a new export. Preserve existing functionality unless the user explicitly asks to remove it; flag any feature an export drops before removing it. Keep the original full design as the source of truth and store feature mocks in clearly-named subfolders (do not auto-replace the parent folder). Codified in `.claude/rules/working-style.md` → "Claude Design Exports — Additive, Never Replace" (auto-loaded every session). This supersedes the folder-replacement step in the 2026-06-25 "Design-First Workflow" entry.

**Applied here**: Built only the detail-drawer reskin from the new export onto the existing UTM page; left the generator form, Recent URLs sidebar, and the grouped URL Library table untouched, per user direction. Renamed the export subfolder `Ad Op Tools UI Design (2)/` → `Ad Op Tools UI Design/detail-drawer/` for clarity.
