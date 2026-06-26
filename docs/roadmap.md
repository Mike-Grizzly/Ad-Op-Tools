# Ad Op Tools — Roadmap (Plan of Record)

**Status:** Active plan of record. `docs/product-spec.md` is the **feature source** (an external
deep-research artifact); its data models are best-guesses. This file is the **decision +
correction layer**, reconciled with what `main` has shipped. Real architecture governs.
Last updated 2026-06-26 (post-merge).

## Where we are (2026-06-26)
Shipped & live, manually verified in production:
- **UTM Generator** (Slice 1).
- **Phase 0+1 — integration foundation + Budget Dashboard (Meta, read-only).** Real Meta OAuth
  connect + Sync pulling real spend on `ad-op-tools.vercel.app`. The shared, proven layer:
  `platform_connections` + `budget_entries` (RLS), app-side **AES-256-GCM** token store
  (`src/lib/integrations/token-crypto.ts`, key-versioned via `token_key_id`), the `AdPlatformClient`
  interface, the Meta Marketing API client, budget queries/actions (sync/disconnect/setCaps), Meta
  OAuth routes, monthly caps, and the full `/budget` UI.

The integration foundation the original plan called for **already exists** (per-user, Meta). The
expanded roadmap below builds on it rather than rebuilding it.

## Positioning (locked)
Anti-Fluency. Every core feature is a real workflow shortcut via direct API integrations +
deterministic logic. LLMs are additive/optional, never the headline. Flat pricing
($29 / $59 / $99), no %-of-spend. The "Anti-Patterns to Avoid" list in `product-spec.md` is binding.

## Confirmed decisions (2026-06-26)
1. **Multi-client model** — `clients` is a first-class entity; `client_id` threads through every
   feature table and is added (nullable) to the shipped UTM tables, plus a nullable `campaign_id`
   for checklist integration. **Extends the already-built `platform_connections`** (per-user today)
   with a nullable `client_id` — an ALTER, not a fresh table. Built **first** as the schema spine.
2. **Vertical-agnostic** — NOT a real-estate app. Verticals, negative-keyword packs, checklist
   templates, naming tokens are user-editable seed data. Ships with a real-estate / home-builder
   starter pack; more packs addable. No hardcoded vertical logic.
3. **Creative = monitor, don't mutate** — build the Creative **Fatigue Monitor** (read-only). The
   "upload/swap/clone creative via API" idea is shelved (high-risk writes). Supersedes the original
   Phase 4 "Creative Asset Manager."
4. **Reporting = simplified + customizable** — choose metrics/variables, save named report configs
   per client (`reports` table), PDF export. NOT a drag-and-drop builder, NOT a fixed static
   dashboard. The original "Looker-style" intent, clarified.
5. **Dependencies approved in principle** — transactional email provider (Resend/Postmark), Vercel
   Pro cron, Claude API (optional LLM, later), Stripe (later). **Token encryption already resolved**:
   app-side AES-256-GCM (`token-crypto.ts`) — closes the old ENC-001 (= SEC-001).
6. **Sequencing** — Budget (Meta) is done; build the multi-client foundation + the no-API features,
   and widen the budget read-path (Google Ads) as access lands (below).

## Real-architecture corrections to the spec
- **Keep our discrete UTM columns** (`base_url, source, medium, campaign, content, term, ad_set,
  creative, generated_url`). Do **not** adopt the spec's `params_json` / `full_url`. Add nullable
  `client_id` + `campaign_id`.
- **`platform_connections` EXISTS** (built by Phase 0+1; per-user, token-encrypted, RLS). The
  multi-client work **adds a nullable `client_id`** to it (account-level connection by default,
  client-scoped when needed) — it does not recreate it. Reuse `token-crypto.ts`; do not design
  encryption anew.
- **RLS on every table.** Tracked-vs-remote RLS *shape* divergence (UTM-004) reconciled at the
  dev/prod split; do **not** `supabase db pull` over the tracked migrations.

## Write-surface inventory (writes = risk; keep it tight)
- **Read-only:** Budget Dashboard, all Phase-3 monitors, Reporting, Account Health Audit.
- **CSV export (no API write):** Negative Keyword export, RSA Builder (Google Ads Editor CSV),
  Budget Alert Rules → native Google rule syntax (copy-paste).
- **API writes — only two in the whole product:**
  1. **GTM Automation** — creates tags/triggers in a GTM *workspace*; publish-to-live is **gated
     behind explicit user confirm** (open GTM-001: API-publish vs. draft-only). Affects tracking,
     not spend.
  2. **Search Term Triage** — applies negatives to Google Ads via "Apply All"; **live immediately**.
     Staged queue + explicit apply is the gate.
- **RSA Builder is NOT an API write** (CSV by design). A direct-write upgrade is possible later
  (convenience vs. risk) — keep CSV for v1.

## Feature inventory (full set — logged)
Status: ✅ shipped · 📋 planned (in original CLAUDE.md 5) · 🆕 new (from spec) · 🔄 changed.
Full detail for each lives in `product-spec.md` at the cited section.

| Feature | Phase | Status | Spec § |
|---|---|---|---|
| UTM Generator | 0 | ✅ | 0.1 |
| UTM extensions (per-client templates, validator, checklist auto-complete) | 0 | 🆕 | 0.1 |
| Clients entity + Client Dashboard | Foundation | 🆕 | 6.1 |
| Platform Connections + Connection Health | Foundation | ✅ per-user (needs client scoping) | 6.2 |
| Cross-Platform Spend Tracker (Budget Dashboard) | 1 | ✅ Meta live (per-user); +Google/LinkedIn/StackAdapt pending | 1.1 |
| Budget Allocation View (book-of-business grid) | 1 | 🆕 (needs `clients`) | 1.2 |
| Pacing alerts (email) | 1 | 🆕 (needs email) | 1.1 |
| Campaign Checklist Engine + editable templates | 2 | 🆕 | 2.1 |
| Campaign Naming Generator | 2 | 🆕 | 2.2 |
| GTM Automation (bounded; gated publish) | 2 | 📋 | 2.3 |
| Disapproval Scanner | 3 | 🆕 | 3.1 |
| Landing Page Monitor | 3 | 🆕 | 3.2 |
| Conversion Tracking Monitor | 3 | 🆕 | 3.3 |
| Account Change Log | 3 | 🆕 | 3.4 |
| Creative Fatigue Monitor (replaces Creative Asset Manager) | 3 | 🔄 | 3.5 |
| Ad Copy Asset Bank | 4 | 🆕 | 4.1 |
| RSA Builder (CSV export) | 4 | 🆕 | 4.2 |
| Headline Variation Generator (optional LLM, labeled) | 4 | 🆕 | 4.3 |
| Negative Keyword Library (editable seed packs) | 5 | 🆕 | 5.1 |
| Search Term Triage Tool (the one live Google write) | 5 | 🆕 | 5.2 |
| Campaign Performance Dashboard (customizable + saved configs + PDF) | 7 | 🔄 | 7.1 |
| Morning Digest Email (stickiness) | 7 | 🆕 | 7.2 |
| Account Health Audit (15-check, on-demand) | 8 | 🆕 | 8.1 |
| Budget Pacing Alert Rules Builder | 8 | 🆕 | 8.2 |
| Pricing tiers + Stripe billing | 7 | 🆕 | Pricing |

Note: "Custom Reporting Dashboards" and "Creative Asset Manager" from the original CLAUDE.md 5 are
superseded by the 🔄 rows above (customizable reporting; fatigue monitoring).

## Architectural guardrails (apply to every platform phase — from the shipped foundation)
Carried forward from `main`'s proven Phase 0+1; binding for every future platform integration.
- **Money** stored as integer minor units (`spend_micros`) + per-row `currency`. Never floats.
- **Idempotent upserts** on `(…, date)` keys so on-demand and scheduled syncs can't double-count.
- **Sync logic is transport-agnostic** — a pure function over an `AdPlatformClient`, callable from
  on-demand, Vercel Cron, or a future queue.
- **Token columns** are encrypted at rest (`token-crypto.ts`) and never selected into anything the
  browser receives (enforce via a token-free public type + explicit column lists in `queries.ts`).
- **RLS** ships in the same migration as every table.
- **`transforms.ts`** is the only place platform-specific mapping lives — consumers stay platform-blind.
- **One registered app per platform**; capabilities via incremental OAuth scopes, never re-registration.

## Build sequence (reconciled, critical-path aware)
**Done:** UTM Generator; Budget Dashboard (Meta, read-only) + integration foundation.

**Now — no external blockers:**
- **Multi-client foundation:** add `clients` + `campaigns`; ALTER `platform_connections` to add a
  nullable `client_id`; thread nullable `client_id`/`campaign_id` into UTM. (The architect/planner
  design from this session, reconciled to *extend* the existing connections table.)
- **No-API feature wave:** Campaign Checklist engine + templates, Naming Generator, Negative Keyword
  Library, Ad Copy Bank + RSA Builder (CSV), UTM extensions (validator, checklist auto-complete).
  None need new API access.
- **Budget Allocation View** (book-of-business grid across clients) once `clients` exists.

**As API access lands (apply for Google Ads now — long pole; Meta already done):**
- **Widen the budget read-path: add Google Ads** (new `src/lib/integrations/google-ads/` against the
  same `AdPlatformClient`); then LinkedIn/TikTok as repeat-the-pattern increments; StackAdapt CSV.
- **Custom Reporting** on the canonical `budget_entries` model (+ `reports` config table).
- **Phase-3 monitors** (disapprovals, landing page, conversion tracking, change log, creative
  fatigue) + Morning Digest + pacing alerts (need email provider + Vercel Pro cron).
- **GTM Automation** (first GTM write-path; draft-only — GTM-001).
- **Search Term Triage** (the one live Google write).

**Later:** Account Health Audit, Budget Alert Rules Builder, optional LLM helpers, Stripe +
pricing-tier enforcement.

## Original 5-feature phase framing (subsumed, kept for context)
`main`'s 2026-06-25 architect+planner review set the original phase order — **Phase 0+1** Budget
(done), **Phase 2** Google Ads read-path / Reporting, **Phase 3** GTM, **Phase 4** Creative. The
expanded inventory above subsumes these (Creative → Fatigue Monitor; plus the new checklist /
naming / negatives / copy / monitor features). The proven "foundation-through-one-platform" approach
and the architectural guardrails carry forward unchanged. Per-feature build detail lives in
`docs/features/{name}.md` (e.g. `docs/features/budget.md`).

## Open decisions / risks
Tracked in `open-questions.md`: INFRA-002 (email provider + cron), GTM-001 (GTM publish vs.
draft-only), API-001 (Google Ads API access pending; Meta done), UTM-004 (RLS shape),
BUDGET-001/002 (budget follow-ups + customization). ENC-001 resolved (= SEC-001, built).
