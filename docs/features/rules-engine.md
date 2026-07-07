# Feature Spec — Automation Rules Engine

**Status**: Planned (spec authored 2026-07-07; not started). Direction confirmed by user —
see open-questions PRODUCT-001 and decision-log 2026-07-07.
**Inspiration**: Revealbot/Bïrch automated rules; Madgicx "Automation Tactics" (prebuilt
rule templates). Differentiator: rules live inside the unified ops tool, next to budget,
UTM, and reporting.

## What it is

User-defined rules evaluated on a schedule against synced ad metrics, e.g.:
- "Pause any ad whose 3-day ROI is below 0.7"
- "Email me when a campaign's 7-day CPA exceeds $50"
- "Pause an ad set when frequency > 4 AND ROAS < 1.5"

Actions execute against the live ad platforms with full audit logging. This engine is also
the execution layer for the AI assistant's write-side (`docs/features/ai-assistant.md`) —
the assistant authors rules; this engine runs them deterministically.

## Prerequisites (build in this order)

1. **Org layer + `audit_log`** (blueprint §3.1) — rules are org-scoped.
2. **Vercel Cron + sync-core + `sync_jobs`** (blueprint §3.3/3.5) — rules evaluate on the
   same cron cadence, after sync.
3. **Phase A below** — the metrics the rules reference must exist first.
4. Write actions additionally need: `ads_management` (Meta) / write usage of the `adwords`
   scope (Google), and write methods on the platform clients (Phase C).

---

## Phase A — Metrics widening: conversions + ad-level granularity (M)

Today `budget_entries` holds **campaign-level** daily `spend_micros`/`impressions`/`clicks`
only. "Leads produced" and "ROI" are uncomputable. Both the rules engine and the AI
assistant block on this; it also upgrades Custom Reporting, so fold it into Phase 2.

**Schema** — new table `ad_metrics` (leave `budget_entries` untouched so the live Budget
Dashboard keeps working; migrate the dashboard onto `ad_metrics` later if desired):

```
ad_metrics (
  id uuid pk,
  org_id uuid not null references organizations,
  user_id uuid not null,
  platform text check (same list as budget_entries),
  external_account_id text not null,
  level text not null check (level in ('campaign','ad_group','ad')),
  campaign_external_id text not null,
  campaign_name text,
  ad_group_external_id text,        -- null at campaign level
  ad_group_name text,
  ad_external_id text,              -- null above ad level
  ad_name text,
  entry_date date not null,
  spend_micros bigint not null,
  impressions bigint,
  clicks bigint,
  conversions numeric,              -- platform-attributed conversions
  leads numeric,                    -- lead-type conversions where the platform splits them
  conversion_value_micros bigint,   -- revenue attributed by the platform
  currency text (ISO-4217 check),
  synced_at timestamptz,
  unique (org_id, platform, external_account_id, level,
          campaign_external_id, coalesce(ad_group_external_id,''),
          coalesce(ad_external_id,''), entry_date)   -- idempotent upsert key
)
```
RLS `is_org_member(org_id)` in the same migration. No DELETE policy (mirrors
`budget_entries`). Money stays integer micros + currency (standing guardrail).

**Platform mapping** (each platform's `transforms.ts` only):
- **Meta**: Insights API with `level=ad`, `time_increment=1`, fields `spend, impressions,
  clicks, actions, action_values`. `actions` is an array of `{action_type, value}` — map
  `lead`/`onsite_conversion.lead_grouped` → `leads`, purchase types → `conversions`, and
  `action_values` purchase value → `conversion_value_micros` (string-math to micros, same
  as the existing `spendToMicros`).
- **Google**: GAQL on `ad_group` and `ad_group_ad` with `metrics.cost_micros,
  metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value`
  segmented by `segments.date`.

**Definition of ROI/ROAS for rules** (write into `constants.ts`, keep one definition):
`roas = conversion_value_micros / spend_micros`; `cpa = spend_micros / conversions`;
`cpl = spend_micros / leads`. "ROI < 0.7" in user language = ROAS < 0.7.

**Files**: migration; extend `AdPlatformClient` with `getAdLevelMetrics(accountId, range)`;
per-platform transform + client methods; `sync-core.ts` writes both tables; hand-update
`src/types/database.ts`. **Vitest** the new transform mappers (money + action-type mapping).

---

## Phase B — Rules: schema, evaluator, notify-only actions (M–L)

**Schema** — one migration, RLS in the same file:

```
automation_rules (
  id uuid pk, org_id, created_by_user_id,
  name text not null,
  enabled boolean not null default false,       -- rules are OFF until explicitly enabled
  platform text,                                 -- null = all platforms
  scope jsonb,                                   -- optional filters: account ids, campaign ids
  level text check (level in ('campaign','ad_group','ad')),
  conditions jsonb not null,                     -- see Zod shape below
  action jsonb not null,                         -- see Zod shape below
  cooldown_hours int not null default 24,        -- don't re-fire on the same entity
  last_evaluated_at timestamptz,
  created_at / updated_at (+ trigger)
)
rule_executions (
  id uuid pk, rule_id fk, org_id,
  status text check (status in ('triggered','no_match','error','dry_run')),
  affected jsonb,                                -- [{level, external_id, name, metric_snapshot}]
  error_message text,
  executed_at timestamptz not null default now()
)  -- append-only; SELECT for org members, INSERT via server code only
```

**Zod shapes** (`src/features/automation/validation.ts`):
- `conditionSchema`: `{ metric: 'spend'|'roas'|'cpa'|'cpl'|'ctr'|'frequency'|'conversions'|'leads',
  window_days: 1|3|7|14|30, operator: 'lt'|'gt'|'lte'|'gte', threshold: number }`
- `conditionGroupSchema`: `{ all?: condition[], any?: condition[] }` (one level of nesting —
  matches Revealbot's AND/OR without arbitrary depth)
- `actionSchema`: `{ type: 'notify_email' } | { type: 'pause_ad' } | { type: 'pause_ad_group' }`
  (budget-adjust actions deferred until pause actions are proven)

**Evaluator** — `src/features/automation/engine.ts`: a **pure function**
`evaluateRule(rule, metricRows) -> { matches: AffectedEntity[] }`. No I/O; aggregates the
window from `ad_metrics` rows passed in. This is the most valuable unit-test target in the
feature — Vitest it exhaustively (window aggregation, micros math, AND/OR, missing data).

**Runner** — `src/app/api/cron/rules/route.ts` (guarded by `CRON_SECRET`, service-role
client, scheduled in `vercel.json` after the sync cron): load enabled rules → load the
metric window per rule → evaluate → execute action → write `rule_executions` + `audit_log`
→ send notify emails (blueprint §3.10). Respect `cooldown_hours` per affected entity.

**UI** — `src/app/(dashboard)/automation/page.tsx` + `src/features/automation/components/`:
rule list with enable/disable, rule builder (condition rows + action picker), execution
history, and **Templates** (the Madgicx borrow — see below).

**Rule templates** (`src/features/automation/templates.ts`, plain constants): prebuilt,
one-click rules the user tweaks instead of building from blank — e.g. "Stop the bleeding"
(pause ad: 3-day spend > $X AND conversions = 0), "ROAS floor" (pause ad: 7-day ROAS < X),
"Frequency cap" (notify: frequency > 4). Ship 4–6; this is most of the perceived value.

**Safety invariants (standing — carry into every change):**
- New rules are `enabled = false` until the user flips them on.
- Every rule offers **dry-run**: evaluate + record `status='dry_run'` with the affected
  list, execute nothing. Default the UI to "run as dry-run first".
- Every execution (incl. dry runs) writes `rule_executions` + `audit_log`.
- Write actions never run for a rule the user hasn't explicitly enabled; there is no
  auto-enable path (including from the AI assistant).

## Phase C — Platform write actions (M, after Phase B is live notify-only)

- Extend `AdPlatformClient` with the first write method: `setEntityStatus(level,
  externalId, 'PAUSED'|'ACTIVE')`. Meta first (`/{ad-id}` POST `status=PAUSED`, needs
  `ads_management` scope — one-click re-consent on the same Meta app per decision-log
  "One App Per Platform"); Google after (`AdGroupAdService` mutate).
- `pause_ad` / `pause_ad_group` actions flip from "recorded but skipped" to real calls.
- Review agents: `ad-platform-reviewer` + `security-reviewer` mandatory (first write path
  in the product).

## Manual test gate
1. Dry-run rule on real synced data shows the correct affected list (cross-check platform UI).
2. Notify rule sends the email with the right entities.
3. Pause rule (own test ad) actually pauses it; `audit_log` + `rule_executions` recorded.
4. Cooldown prevents re-fire on the next cron tick.
5. Second org's user sees none of it (RLS).
