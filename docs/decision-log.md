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

## 2026-06-25 — Build Roadmap & Feature Order

**Decision**: After the UTM Generator, build in this order — **Phase 0+1**: integration foundation + Budget Dashboard (Meta, read-only); **Phase 2**: widen the read-path (add Google Ads to Budget and/or Custom Reporting); **Phase 3**: GTM Automation (first write-path); **Phase 4**: Creative Asset Manager (last). LinkedIn/TikTok are repeat-the-pattern increments, not separate phases. Full plan in `docs/roadmap.md`.

**Rationale**: Three of the four remaining features (Budget, Reporting, Creative) block on a shared OAuth + integration layer that doesn't exist. Budget is the highest-value feature, is read-only (lowest blast radius to prove the foundation on), and defines the canonical `campaigns`/`budget_entries` model the others inherit. Reporting is cheap afterward. GTM is dependency-isolated and write-oriented, so sequenced on value. Creative is last — it mutates live ad accounts and spends real money.

**Process**: Produced by an `architect` + `planner` review that ran independently and converged on the same order.

**Supersedes**: The earlier ARCH-002 lean toward GTM-first (see open-questions; that rationale was incorrect).

---

## 2026-06-25 — Integration Foundation Built Through One Platform (Meta), Not As a Framework

**Decision**: The OAuth/token/sync foundation ships *with* the first feature that consumes it (Budget Dashboard on Meta), not as a standalone abstract framework. We do not build all four platform clients up front. The shared pieces designed once: `platform_connections` schema, the encryption format, and the `AdPlatformClient` *interface*. The Meta adapter, OAuth flow, refresh, and rate-limit are proven end-to-end before a second platform is added.

**Rationale**: An OAuth layer with zero consumers can't be manually tested, and "nothing is complete until manually tested" is a hard rule. Designing the `AdPlatformClient` interface against one real implementation (then correcting it with the second platform) avoids baking in the wrong abstraction. Building four adapters speculatively would violate the "no speculative abstractions" rule.

**First platform = Meta** (recommended, pending confirmation — see open-questions INT-001): Meta's Marketing API yields a usable token immediately; Google Ads requires a Developer Token approval that can take days and blocks all testing. Start the Google Developer Token application during Phase 1 so it's ready for Phase 2.

---

## 2026-06-25 — Canonical Spend Model: Integer Minor Units + Per-Row Currency

**Decision**: Spend is stored as integer minor units (`spend_micros`, matching Google's native `cost_micros`) with an explicit per-row `currency`. Never floats. `budget_entries` uses an idempotent upsert key (`user_id, platform, campaign_external_id, entry_date`) so on-demand and scheduled syncs cannot double-count. Platform-specific mapping is confined to each platform's `transforms.ts`.

**Rationale**: Money in floats is a data-integrity bug waiting to happen; multi-platform means mixed currencies (normalize for display, never at rest). These are low-reversibility choices (re-typing a populated money column is migration pain), so they're settled now as a standing guardrail for every platform phase.

---

## 2026-06-25 — Doc/Code Drift Corrections

**Decision**: Fixed three factual drifts surfaced during the roadmap review: (1) `src/types/database.ts` header now states it is hand-maintained (it previously claimed to be auto-generated, which would have led a contributor to clobber hand edits); (2) `CLAUDE.md` tech-stack table now reads "Next.js 16 App Router (React 19)" (was "Next.js 14+"); (3) recorded that `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel but intentionally unused — nothing reads it, and the integration phase should keep it that way unless a background sync job with no user session forces the question.

---

## 2026-06-26 — Phase 1 Gating Decisions Confirmed

**Decision**: User confirmed the three Phase 1 gating items: (1) **first platform = Meta**; (2) **OAuth token encryption = app-side AES-256-GCM** — encrypt token columns in server code before insert, key in a server-only env var `TOKEN_ENCRYPTION_KEY` (never `NEXT_PUBLIC_*`), distinct per environment; RLS stays on as defense-in-depth; RLS-only is not acceptable for token columns; (3) **dev/prod Supabase split happens before Phase 1** (the first phase to write live credentials). Closes open-questions INT-001, SEC-001, INFRA-001.

**Meta app prerequisite (clarification)**: Pulling spend via the Meta Marketing API requires a registered Meta app (App ID + Secret) owned by the product — this is the SaaS-side application that *powers* the "Connect" button, not an alternative to it. Compare a Looker Studio Meta connector, or the GitHub App authorized for Claude: in those cases the vendor already registered the app, so the user only saw the "authorize" step; here we are the vendor, so we register it once. App registration is a one-time human setup (matches the documented "first-time OAuth connection per platform is manual"); per-account connection is the OAuth click-flow. Phase 1 testing against the owner's own ad account works in dev mode **without** Meta App Review; App Review + Business Verification are required before onboarding external users. Tracked as SETUP-006; dev Supabase project creation tracked as SETUP-007.

---

## 2026-06-26 — One App Per Platform; Scopes Per Feature

**Decision**: Each ad platform needs exactly one registered developer app, created once — **not one per feature/slice**. Across the whole product that's ~4 registrations total (Meta; Google — one OAuth client can cover both Google Ads and GTM via separate scopes; LinkedIn; TikTok). Capabilities are governed by the OAuth **scopes** a feature requests on the existing app, never by re-registering:
- Meta budget + analytics reading → `ads_read` (Insights API: spend, impressions, clicks, conversions, breakdowns).
- Meta writing (Creative Asset Manager) → add `ads_management` to the same app; the user re-consents with one click.
- Google Ads read + write → single `adwords` scope; GTM → `tagmanager.*` scope, same Google project.

**Scope strategy**: request scopes incrementally (least privilege — read scopes now, write scopes when Creative ships). Re-consent is a single click; least privilege gives better security and better consent rates. Meta App Review (only needed for *external* users) is per advanced permission on the same app, done once per permission — never per slice; the owner's own accounts work in dev mode without review.

**Implication for the user**: a human registers once per platform (≈4 times ever), and never per feature. This is why pinning the Meta registration (SETUP-006) costs us nothing now — adding it later unlocks every Meta feature, not just Budget.

---

## 2026-06-26 — Token Storage Schema Hardened (database + security review)

**Decision**: After `database-reviewer` + `security-reviewer` passes on the `platform_connections` / `budget_entries` migration (changes made while tables are empty, so zero migration cost):
- **Key rotation**: a `token_key_id` column (default `'v1'`) records which `TOKEN_ENCRYPTION_KEY` encrypted each row, so the key can be rotated by an incremental re-encrypt instead of a forced data migration.
- **Token split**: access and refresh tokens are encrypted independently (separate ciphertext/iv/auth_tag column sets; refresh columns nullable — Meta long-lived tokens have no refresh token). Different lifetimes/threat models; the refresh path only touches access columns.
- **Encoding**: token columns are base64 `text`, not `bytea` — chosen for supabase-js ergonomics. The base64 + 12-byte-IV + 16-byte-tag contract is enforced in the crypto helper, not the DB.
- **RLS**: all policies use `(select auth.uid())` (evaluated once as an init-plan), not bare `auth.uid()` (per-row). `budget_entries` has no delete policy (sync is upsert-only; a user session can't erase spend history). `platform_connections` gets an `updated_at` trigger via a new `public.set_updated_at()` function — the first trigger in the project; token refresh/status updates make it load-bearing.
- **Integrity**: `external_account_id NOT NULL` (the nullable-in-unique gap allowed duplicate connections); `currency` ISO-4217 check; negative `spend_micros` allowed (platforms report credits/clawbacks); `created_at` added to `budget_entries` for convention.

**App-code obligations the schema cannot enforce** (must hold when the crypto helper + queries are built):
1. Fresh random IV per encryption — never reuse (GCM nonce reuse with one key is catastrophic).
2. Decrypt must propagate the auth-tag-mismatch error, never swallow it.
3. Token columns never appear in a client-facing SELECT — enforce via a `PlatformConnectionPublic` type that omits them + explicit column lists in `queries.ts`.
4. `TOKEN_ENCRYPTION_KEY` is a 32-byte random value (documented in `.env.example`), distinct per environment.
5. Any service-role sync path must not SELECT token columns.

Tables remain **UNAPPLIED** pending the dev/prod target decision (SETUP-007).

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

---

## 2026-06-26 — Supabase: One Shared Project Now, Split Deferred to Launch

**Decision**: Use the single shared `ad-op-tools` Supabase project for all build/test now; defer the dev/prod split to launch. Supersedes the "dev/prod split before Phase 1" part of the 2026-06-26 "Phase 1 Gating Decisions Confirmed" entry.

**Rationale** (per user): there is no real production yet — `ad-op-tools` holds only the owner's own test data, zero real users. The split was meant to avoid polluting *real* production with test OAuth tokens / schema churn; that risk doesn't exist until launch. RLS already enforces per-user data isolation within one database, so the multi-tenant security model is built correctly from day one regardless of project count. The org is on Supabase's free plan (2 active projects, both used), so a dedicated dev project would mean Pro (~$25/mo) for no benefit at this stage.

**Plan**: build/test on `ad-op-tools` and apply the Phase 1 migration there. At launch (first real user), stand up a fresh production project with its own keys + its own `TOKEN_ENCRYPTION_KEY`; today's project becomes dev. Closes SETUP-007; re-resolves INFRA-001.

---

## 2026-06-26 — Phase 0+1 Shipped; OAuth Needs One Consistent Origin (operational)

**Milestone**: Phase 0+1 (integration foundation + Budget Dashboard, Meta) shipped to production and **manually verified** — real Meta OAuth connect + Sync pulling real spend on `ad-op-tools.vercel.app`. Merged the feature branch to `main`; production tracks `main`.

**Operational learning (applies to every future ad-platform OAuth integration — Google, LinkedIn, TikTok, GTM)**: the OAuth round-trip only works when three things share the **same working origin**: (1) the domain the user is logged into, (2) `APP_ORIGIN` (which builds the `redirect_uri`), and (3) the redirect URI registered in the platform's app. The production 404s during testing were **not a code bug** — `ad-op-tools.vercel.app` (the production alias) had drifted to a stale Vercel deployment while the correct build was only reachable via the branch/`git-main` preview URL, so the Meta callback landed on a dead origin. Fix: re-point the production domain to the latest `main` deployment (Vercel "Promote to Production").

**Next time**: keep the production domain alias on the latest `main` deployment; set `APP_ORIGIN` to that exact production origin; register the matching `…/api/integrations/<platform>/callback` redirect URI; test the OAuth flow on that one origin, not a preview URL.

---

## 2026-07-07 — Blueprint Decisions Confirmed (org layer, cron, dependencies)

**Decision**: User confirmed the three ARCH-003 sign-offs from `docs/architecture-blueprint.md`:
1. **Organization/workspace layer is built BEFORE Phase 2** (blueprint §3.1) — orgs + members + `is_org_member()` RLS indirection across all five tables, personal org auto-created on signup, `audit_log` table in the same migration.
2. **Background sync = Vercel Cron** hitting an internal `/api/cron/sync` route with a service-role client (blueprint §3.3) — not Supabase Edge Functions, not a queue.
3. **Dependency approvals granted** (add each only when its phase needs it): `vitest` (now), `@sentry/nextjs` + `resend` (Phase 2), `stripe`/`@stripe/stripe-js` + `@upstash/ratelimit` (launch-readiness).

**Still user-owned, starting soon** (acknowledged long lead times): Google Ads Developer Token application and Meta App Review + Business Verification — both remain open in ARCH-003.

**Implication**: The pre-Phase-2 work order is settled — (1) security "Now" checklist (`docs/security-plan.md` §4 items 1–7, incl. the HIGH open-redirect fix), (2) org layer migration + query rescoping, (3) client-factory seam + sync-core extraction + token-refresh seam — then Phase 2 proper (Google Ads client/OAuth, cron sync, `sync_jobs`, Sentry).

---

## 2026-07-20 — Product Spec Adopted with Corrections; Orgs-then-Clients Composition

**Context**: The owner uploaded an externally-authored product spec ("Ad Op Tools — Full
Product Spec & Build Roadmap" v1.0, dated 2026-06-26) and asked for a full structural /
architectural / safety review of the repo, treating the spec's features as additions to the
current plan. The spec was not previously in the repo. A review this session confirmed the
shipped codebase is sound (RLS on all tables, auth-first server actions with explicit
scoping, AES-256-GCM token crypto with AAD row-binding, hardened OAuth, green CI).

**Decisions**:
1. **Spec committed to the repo** as `docs/product-spec-2026-06.md` with a staleness
   annotation header. It is the product-scope source of truth for its feature clusters;
   sequencing authority stays with `docs/roadmap.md` (new "Product-spec merge" section) and
   `docs/architecture-blueprint.md` §4; schema authority stays with the shipped canonical
   model.
2. **Orgs first, then clients.** The committed org-layer kickoff slice (blueprint §3.1) is
   unchanged. The spec's `clients` concept is a different layer that composes on top:
   org = the paying tenant (workspace/team/billing), client = the agency's customer
   (org-scoped rows carrying per-client budgets, checklists, monitors). A `clients` table
   slice lands immediately after the org layer and becomes a prerequisite for most spec
   features.
3. **Corrections where the spec is stale** (spec loses to repo docs): Budget Dashboard
   (Meta) is already live; StackAdapt has a GraphQL API (paste-key connect flow per
   INT-002, CSV import demoted to optional fallback); the spec's table sketches
   (`budget_snapshots`, its `platform_connections` shape) are superseded by the shipped
   `budget_entries` / hardened `platform_connections` schemas.
4. **Overlaps folded, not duplicated**: spec §8.2 alert rules builder folds into
   `features/rules-engine.md` (notify-only rules = its Phase B); spec §7.2 morning digest
   supersedes the blueprint §5.5 weekly-digest suggestion; spec §3.4 account change log is
   distinct from the app's `audit_log` (platform-side history vs app-side actions — both
   get built).
5. **Spec anti-patterns adopted as standing guardrails** (recorded in roadmap merge
   section): all platform writes user-confirmed or explicit user-enabled rules; no
   campaign creation from scratch; LLM additive/optional/labeled; flat pricing only.
6. **Pricing tiers** ($29 Solo / $59 Pro / $99 Team) recorded as the candidate structure
   for the Stripe slice — needs owner confirmation before build (PRODUCT-002).

**Made autonomously** (session ran unattended; recommended defaults chosen — owner can veto
any of 1/2/6 cheaply until their slices start).

---

## 2026-07-21 — Org Layer: Key Shapes, Token AAD, and Contracts

Slice: org/workspace layer (blueprint §3.1 + §3.11), owner-confirmed kickoff. Owner
decisions this session: **org layer invisible this slice** (auto-created "Personal" org,
zero UI) and **`docs/design-system.md` written now** from the shipped UTM/Budget UI.
Execution decisions made autonomously within that scope:

1. **Token AAD stays user-bound; `platform_connections` keeps its user-leading unique key**
   `(user_id, platform, external_account_id)`. The AES-GCM AAD binds each ciphertext to the
   connecting user's id — re-keying to org would break decryption of every stored token.
   The decrypt path now derives the AAD from the **row's stored `user_id`** (not the
   caller), so a future org teammate can use a shared connection. Org-level connection
   dedupe/adoption is deferred to the invites slice (open-questions ORG-001).
2. **`budget_entries` re-keyed to `(org_id, platform, external_account_id,
   campaign_external_id, entry_date)`** (constraint `budget_entries_org_upsert_key`).
   Spend rows are facts about an ad account; a user-leading key would double-count the
   same account synced by two members. `user_id` on these rows now means **"last synced
   by"** (upsert overwrites it).
3. **`budget_caps` re-keyed to `(org_id, scope)`** — a cap is an org-level setting, not a
   per-user one. `user_id` now means "set by".
4. **Personal-org creation is trigger-only** (`handle_new_user` on `auth.users`, SECURITY
   DEFINER, pinned search_path). No app-side fallback: no signup page exists, dashboard
   provisioning fires the trigger, and `getOrgContext()` throws loudly on the
   impossible zero-membership state instead of self-healing silently.
5. **Query auth contract standardized on throw** — `utm/queries.ts` switched from
   `return []` to `throw 'Unauthorized'`, matching `budget/queries.ts` (closes the
   SEC-002 alignment item). The dashboard layout already guarantees auth on every query
   path, so `[]` only masked bugs as empty states.
6. **`src/features/org/` ships `queries.ts` only.** No actions/validation/logAudit helper
   yet — zero call sites until invites/Phase 3 (anti-speculation rule). The `audit_log`
   INSERT policy ships now so the first call site needs no migration.
7. **`connections.ts` (lib) imports `getOrgContext` from `features/org`** — accepted mild
   lib→feature inversion; org is the foundational feature and the blueprint names
   `src/features/org/` as its home.
8. **RLS**: INSERT policies keep a `user_id = auth.uid()` WITH CHECK (self-attribution,
   defense-in-depth); UPDATE policies deliberately do NOT pin user_id (org members edit
   shared rows; the sync upsert must overwrite teammates' rows). `budget_entries` still
   has no DELETE policy. All new policies use the hardened `(select auth.uid())` /
   `public.is_org_member(org_id)` form — this rewrite also converges the tracked-vs-remote
   policy-shape divergence (UTM-004).

---

## 2026-07-21 — Clients Slice: Keys, Bands, and Scope

Owner-approved plan (checkpoint flow: plan approval → build → owner-gated migration
apply → owner-gated merge). Owner scope decisions: full vertical slice (CRUD + dashboard
+ spend rollup), spend attribution by assigning ad accounts to clients, per-platform
budget overrides included now. Execution decisions:

1. **Same-org integrity via composite FKs, not triggers**: `clients` carries
   `unique (org_id, id)`; `client_platforms` and `platform_connections.client_id`
   reference `(org_id, client_id) → clients(org_id, id)`. With org_id frozen by the
   rebinding triggers, a cross-org assignment is structurally impossible (confirmed by
   security review). `platform_connections` uses `on delete set null (client_id)`
   (PG 15+ column-list form) so deleting a client detaches accounts without touching
   org_id.
2. **Pacing bands resolve a spec inconsistency**: linear projection makes the spec's
   "projected > budget → red" equivalent to any positive deviation (yellow would be
   unreachable). Adopted: green |dev| ≤ 10%, yellow ≤ 25%, red > 25% **or budget
   exhausted**; neutral when no budget. Owner saw this in the approved plan.
3. **budget_reset_day honored from day one** (billing-cycle window math, 1..28 check
   sidesteps short months); default 1 ≡ calendar month, parity with the Budget page.
4. **Hard delete, no archive/status column** (single-owner tool; spend history is
   untouched by design). Revisit when teams/invites exist.
5. **`client_platforms` has no `user_id`** (child settings row; attribution lives on the
   parent). Security review accepted; per-override attribution, if ever needed, goes
   through `audit_log` call sites at the app layer.
6. **`client_platforms.client_id` stays mutable** (same-org reparenting only, blocked
   cross-org by the FK; the app never updates it — replace-all delete+insert). Freezing
   it would mean widening the shared `prevent_tenant_rebinding()`; not worth it now
   (database-reviewer INFO finding, accepted).
7. **Amber warning token** `#d97706` on `rgba(217,119,6,.1)` added to the design system
   (yellow pacing band) — the palette had no warning color.
8. **PLATFORM_META lifted** to `src/lib/platform-meta.ts` (clients = designated second
   consumer); `budget-helpers.ts` re-exports, budget components untouched.
