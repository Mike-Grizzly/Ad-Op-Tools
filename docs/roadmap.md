# Ad Op Tools — Roadmap (Plan of Record)

**Status:** Active plan of record. `docs/product-spec.md` is the **feature source** (an external
deep-research artifact); its data models were best-guesses. This file is the **decision +
correction layer** and the real architecture governs. Last updated 2026-06-26.

## Positioning (locked)
Anti-Fluency. Every core feature is a real workflow shortcut via direct API integrations +
deterministic logic. LLMs are additive/optional, never the headline. Flat pricing
($29 / $59 / $99), no %-of-spend. The "Anti-Patterns to Avoid" list in `product-spec.md` is binding.

## Confirmed decisions (2026-06-26)
1. **Multi-client model** — `clients` is a first-class entity; `client_id` threads through every
   feature table (campaigns, budgets, checklists, copy, connections) and is added (nullable) to the
   shipped UTM tables, plus a nullable `campaign_id` for checklist integration. Built **first** as
   the schema spine. Reverses the single-tenant assumption of the UTM slice.
2. **Vertical-agnostic** — NOT a real-estate app. Verticals, negative-keyword packs, checklist
   templates, and naming tokens are user-editable seed data. Ships with a real-estate / home-builder
   **starter pack** (first user's domain); more packs addable. No hardcoded vertical logic.
3. **Creative = monitor, don't mutate** — build the Creative **Fatigue Monitor** (read-only). The
   earlier CLAUDE.md "upload/swap/clone creative via API" idea is shelved (high-risk writes).
4. **Reporting = simplified + customizable** — users choose which metrics/variables to show and
   **save named report configurations per client** (backed by the `reports` table), plus PDF export.
   NOT a drag-and-drop report builder, NOT a fixed static dashboard. This is the original
   "Looker-style" intent, clarified.
5. **Dependencies approved in principle** — transactional email provider (Resend/Postmark),
   Vercel Pro cron, Claude API (optional LLM, later), Stripe (billing, later). Token encryption
   approach decided with `security-reviewer` at the connections table (open: ENC-001).
6. **Sequencing** — build the no-API features first while platform API approvals pend (below).

## Real-architecture corrections to the spec
- **Keep our discrete UTM columns** (`base_url, source, medium, campaign, content, term, ad_set,
  creative, generated_url`). Do **not** adopt the spec's `params_json` / `full_url`. Add nullable
  `client_id` + `campaign_id`.
- `platform_connections` is not built yet; build per the spec's shape with **encrypted** token
  columns (encryption approach = ENC-001).
- **RLS on every table.** We carry an existing tracked-vs-remote RLS *shape* divergence
  (open-questions UTM-004) — reconcile at the dev/prod split; do **not** `supabase db pull` over the
  tracked migrations.

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

## Build sequence (critical-path aware)
**Now — no external blockers:**
- **Apply for platform API access immediately** (human action, the long pole) — see API-001.
- **Multi-client foundation:** `clients`, `platform_connections` + RLS, client CRUD.
  `architect` schema pass before the migration (touches every future table).
- **No-API value while approvals pend:** Campaign Checklist engine + templates, Campaign Naming
  Generator, Negative Keyword Library, Ad Copy Bank + RSA Builder (CSV), UTM extensions
  (`client_id`/`campaign_id`, validator, checklist auto-complete).

**As API access lands:**
- Budget Dashboard (Google read-only first → Meta → StackAdapt CSV → LinkedIn).
- Phase-3 monitors + Morning Digest (needs email provider + Vercel Pro cron).
- Search Term Triage (the one live Google write — build carefully).

**Later:** Reporting (customizable + PDF), Account Health Audit, Budget Alert Rules Builder,
optional LLM helpers, Stripe + pricing-tier enforcement.

## Open decisions / risks
Tracked in `open-questions.md`: ENC-001 (token encryption), INFRA-001 (email provider + cron),
GTM-001 (GTM publish API vs. draft-only), API-001 (platform API access pending), UTM-004 (RLS shape).
