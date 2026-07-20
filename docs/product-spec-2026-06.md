> [!NOTE]
> **Provenance & staleness annotations (added 2026-07-20).** This spec was authored
> 2026-06-26 outside the repo and committed here on 2026-07-20 after an architecture
> review reconciled it against the codebase. It is the **product-scope** source of truth
> for the feature clusters it introduces; it is **not** the sequencing or schema source
> of truth. Known-stale points — where this spec and reality disagree, the repo docs win:
>
> 1. **"Current State" is outdated.** The Budget Dashboard (Meta, read-only) shipped and
>    was verified in production on 2026-06-26 (`docs/current-status.md`); this spec still
>    lists only Auth + UTM as shipped.
> 2. **StackAdapt HAS a public API.** This spec says CSV-import-only; repo research
>    (open-questions INT-002) found StackAdapt's GraphQL Public API + official TS SDK.
>    The connect flow is "paste API key" (encrypted via the existing token store), with
>    CSV import as an optional fallback.
> 3. **Proposed schemas are illustrative, not binding.** The shipped canonical spend
>    model (`budget_entries` with integer `spend_micros` + per-row `currency`, idempotent
>    upsert key) and the hardened `platform_connections` shape (split access/refresh
>    token ciphertexts, `token_key_id` versioning) supersede this spec's
>    `budget_snapshots` / `platform_connections` sketches. New tables from this spec
>    (clients, checklists, monitors, etc.) get real schemas at slice time, following
>    house rules (RLS in the same migration, org-scoped).
> 4. **No tenancy layer in this spec.** The repo's committed pre-Phase-2 slice is the
>    org/workspace layer (`docs/architecture-blueprint.md` §3.1). This spec's `clients`
>    concept is a different layer (the agency's customers) that composes on top:
>    org = paying tenant, clients = org-scoped rows. See decision-log 2026-07-20.
> 5. **Sequencing authority.** The merged build order lives in `docs/roadmap.md`
>    ("Product-spec merge") and `docs/architecture-blueprint.md` §4 — this spec's
>    sprint plan is superseded by that merge.

---

# Ad Op Tools — Full Product Spec & Build Roadmap
**Version:** 1.0 · **Date:** 2026-06-26  
**Stack:** Next.js (App Router/RSC) · TypeScript strict · Supabase (Postgres + Auth + Storage) · Tailwind · Vercel  
**Positioning:** A SaaS that automates the repetitive manual steps of running digital ad campaigns. Built first for a single operator. Priced for solo practitioners and small teams who are priced out of enterprise tools.  
**Anti-wrapper principle:** Every core feature is a real workflow shortcut powered by direct API integrations and deterministic logic. LLMs are additive and optional — not the core value proposition.

---

## Current State (Already Shipped)
- Auth (Supabase)
- UTM Generator (complete, verified in prod)

---

## Architecture Conventions (Apply Everywhere)

- All platform data is fetched server-side via Route Handlers or Server Actions; never expose API tokens to the client
- Each platform integration (Google Ads, Meta, GTM, LinkedIn) lives in `/lib/integrations/{platform}/` with a unified interface: `getAccounts()`, `getCampaigns()`, `getMetrics()`, `applyChange()`
- All OAuth tokens stored encrypted in Supabase; per-user, per-platform rows in `platform_connections` table
- All background jobs (cron alerts, daily monitors) run as Vercel Cron Functions calling internal API routes
- All user-facing data mutations go through optimistic UI + server revalidation (Next.js `revalidatePath`)
- Supabase Row Level Security (RLS) on every table — users only see their own data

---

## PHASE 0 — Foundation (Complete + Hardening)

### 0.1 UTM Generator (Shipped — Maintain & Extend)
**What it does:** Template-based UTM parameter builder with history, library, bulk generation, and copy-to-clipboard.

**Extend with:**
- **Per-client saved templates** — store UTM parameter sets per client (source, medium, campaign prefix) so launching a new campaign auto-populates UTM fields
- **UTM validator** — when a user pastes a final URL, validate: no double question marks, no unencoded spaces, UTM values are present and non-empty, URL is reachable (HTTP ping)
- **UTM → Checklist integration** — when a UTM is generated and saved, auto-mark the "UTM parameters set" checklist item as complete on the linked campaign

**Data model:**
```
utm_templates: id, user_id, client_id, name, source, medium, campaign_prefix, content, term, created_at
utm_history: id, user_id, client_id, full_url, params_json, campaign_id (nullable), created_at
```

---

## PHASE 1 — Budget Dashboard (Highest Daily Value — Build First)

### 1.1 Cross-Platform Spend Tracker
**What it does:** Replaces the Excel monthly-cap sheet. Shows real-time spend from all connected platforms in one view. Compares actual spend against total monthly budget on a rolling basis.

**How it functions:**
- User sets a monthly budget per client (can be a total across all platforms, or broken down per platform)
- Dashboard pulls spend data from each connected platform via API, aggregated to client level
- Rolling pacing calculation: `(spend_to_date / days_elapsed) * days_in_month` = projected month-end spend
- Color-coded pacing status: **Green** = within 10% of ideal pace, **Yellow** = 10–25% over/under, **Red** = >25% over/under or projected to exceed budget
- Spend breakdown: donut chart showing spend split by platform (Google, Meta, LinkedIn, StackAdapt)
- Daily spend sparkline per platform for the current month

**Data model:**
```
clients: id, user_id, name, monthly_budget, budget_reset_day (default 1), created_at
client_platforms: id, client_id, platform, monthly_budget_override (nullable)
budget_snapshots: id, client_id, platform, date, spend, impressions, clicks, conversions
```

**API integrations:**
- **Google Ads API** — `metrics.cost_micros` via GoogleAdsService, summed at campaign level, cached every 4 hours
- **Meta Marketing API** — `/act_{ad_account_id}/insights?fields=spend&date_preset=this_month`, cached every 4 hours
- **LinkedIn Campaign Manager API** — `analytics/finder?q=analytics&pivot=CAMPAIGN` (lower priority, add after Google + Meta)
- **StackAdapt** — no public API; provide CSV import flow: user exports StackAdapt report → uploads CSV → tool parses and stores spend data. Show "Last imported: X days ago" banner

**Pacing alert (email):**
- Triggered when: projected overspend >10%, or daily spend drops to 0 for 2+ consecutive days (underpacing), or actual spend exceeds monthly budget
- Email contains: client name, platform, current spend, monthly budget, % paced, days remaining
- User sets alert thresholds per client in settings

### 1.2 Budget Allocation View
**What it does:** Shows all clients side-by-side so the user can see their entire book of business at a glance.

**How it functions:**
- Card grid: one card per client, showing monthly budget, spent-to-date, % paced, days remaining, trend arrow (up/down vs. last week)
- Sort by: most at-risk, alphabetical, highest spend
- Click into any card to see full client budget detail

---

## PHASE 2 — Campaign Launch Checklist & Ad Ops Automation

### 2.1 Campaign Checklist Engine
**What it does:** A stateful, per-campaign checklist that tracks every step of the campaign launch process. Replaces scattered Notion docs, Slack threads, and memory.

**How it functions:**
- User creates a new campaign record: name, client, platform (Google/Meta/StackAdapt), campaign type (Search, PMax, Lead Gen, Display), launch date
- System generates a pre-populated checklist from a template matching the platform + campaign type
- Each checklist item has: title, description, status (pending/complete/skipped/blocked), optional notes field, optional link field (e.g., link to GTM container)
- Items can be marked complete manually OR auto-completed by integrations (e.g., UTM generator auto-checks "UTM parameters set"; GTM automation auto-checks "Conversion tags created")
- Progress bar at top of campaign record: X of Y items complete

**Checklist templates (stored in DB, user-editable):**

*Google Search Campaign:*
1. Campaign goal defined (objective + KPI target)
2. Landing page audited (live URL, HTTPS, no noindex, loads under 3s)
3. UTM parameters generated & saved *(auto-complete when UTM created)*
4. Conversion action confirmed in Google Ads *(auto-complete when monitor detects fires)*
5. Google Ads account settings: geotarget, language, network exclusions (search partners on/off)
6. Campaign naming convention applied *(auto-complete when name generated via naming tool)*
7. Ad group structure defined (1–3 themes max)
8. Keywords uploaded (match types assigned, no broad match without audience signals)
9. Negative keyword list applied (shared list + campaign-level)
10. RSA created (min 8 headlines, 4 descriptions, pinning strategy noted)
11. Ad extensions added: sitelinks (4+), callouts (4+), structured snippets
12. Bid strategy set (tCPA target entered, or manual CPC with enhanced CPC off)
13. Budget set and pacing checked *(auto-complete when budget dashboard entry exists)*
14. GTM conversion tag created & verified *(auto-complete from GTM automation)*
15. Pixel/conversion tracking fires confirmed in Tag Assistant
16. Audience segments attached (remarketing list, customer match if available)
17. Ad schedule reviewed (default is 24/7 — intentional?)
18. Campaign paused until ready to launch? (launch date set)

*Meta Lead Generation Campaign:*
1. Campaign objective set (Leads)
2. Landing page / lead form built and tested
3. Meta Pixel firing on destination URL *(auto-complete from monitor)*
4. UTM parameters generated & saved *(auto-complete)*
5. Campaign naming convention applied
6. Ad set budget type: Campaign Budget Optimization or Ad Set Budget (document rationale)
7. Audience defined: cold (interest stack OR Advantage+), warm (website visitors, 30/60/90 day), retargeting (video viewers, lead form openers)
8. Audience overlap check completed
9. Creative assets ready: 1:1 (1080×1080), 9:16 (1080×1920), 1.91:1 (1200×628), 4:5 (1080×1350)
10. Ad copy written outside platform (headlines ≤40 chars, primary text ≤125 chars for above-fold)
11. Lead form created (if using native form): fields minimal, thank-you page URL set
12. Bid strategy set (Lowest Cost vs. Cost Cap — document reasoning)
13. Facebook Pixel Events Manager shows test event firing
14. Ad account spending limit not too low for learning phase
15. Campaign paused until launch date

**Data model:**
```
campaigns: id, user_id, client_id, name, platform, campaign_type, status, launch_date, external_id (nullable), created_at
checklists: id, campaign_id, template_id, created_at
checklist_items: id, checklist_id, title, description, status, sort_order, auto_complete_trigger (nullable), notes, link, completed_at, completed_by
checklist_templates: id, user_id, name, platform, campaign_type, is_default, created_at
checklist_template_items: id, template_id, title, description, sort_order, auto_complete_trigger
```

### 2.2 Campaign Naming Generator
**What it does:** Generates campaign/ad set/ad names from a form based on the user's naming convention. Never build a campaign name from memory again.

**How it functions:**
- User defines naming convention in settings: configure token order and separators
- Available tokens: `{client}`, `{platform}`, `{campaign_type}`, `{audience_tier}` (cold/warm/retarget), `{geo}`, `{objective}`, `{date_YYYYMM}`, `{custom_label}`
- Example convention: `{client}_{platform}_{campaign_type}_{audience_tier}_{geo}_{date_YYYYMM}` → `MikeRE_GGL_SRCH_COLD_SC_202606`
- Form fills in each token; preview updates in real-time
- "Copy all three" button: copies Campaign Name, Ad Set Name, Ad Name to clipboard in sequence
- History of generated names per client; auto-marks "Campaign naming convention applied" checklist item

**Data model:**
```
naming_conventions: id, user_id, client_id (nullable — null = global default), pattern, tokens_config_json, created_at
naming_history: id, user_id, client_id, campaign_id (nullable), generated_name, tokens_used_json, created_at
```

### 2.3 GTM Automation (Bounded Scope — No Site Access)
**What it does:** Uses the GTM API to create tags, triggers, and conversion actions inside an existing GTM container. Replaces the 30–60 minute manual tag-build-publish cycle for every new campaign.

**How it functions:**
- User authenticates GTM via OAuth (same Google OAuth as Google Ads — same scopes: `https://www.googleapis.com/auth/tagmanager.edit.containers`)
- User selects: GTM account → container → workspace
- "New Campaign" wizard prompts: platform (Google Ads / Meta), conversion action name, trigger type (page view / event), trigger URL or event name
- Tool creates via GTM API:
  - **Google Ads Conversion Tag**: `googletag.event('conversion', {send_to: 'AW-XXXXXX/YYYYY'})` — user enters conversion ID + label
  - **Meta Pixel Event Tag**: `fbq('track', 'Lead')` or custom event
  - **Trigger**: Page View trigger with URL contains rule, OR Custom Event trigger
  - Creates a **Version Note** in GTM: "Ad Op Tools auto-created: {conversion_name} tag for {campaign_name} on {date}"
- After creation, displays "Publish to Live?" prompt — user must manually approve publish (safety gate; tool can initiate but user confirms)
- Auto-marks GTM checklist items as complete on the linked campaign

**What is intentionally out of scope:** GTM snippet installation on client sites (requires site access), first-time GTM container creation (UI only), modifying or deleting existing non-tool-created tags

**API:** Google Tag Manager API v2 — `accounts.containers.workspaces.tags.create`, `.triggers.create`, `.versions.publish`

---

## PHASE 3 — Account Health Monitoring (Daily Automated Checks)

### 3.1 Disapproval Scanner
**What it does:** Scans all active ads across connected Google Ads accounts daily. Alerts immediately when a disapproval is detected.

**How it functions:**
- Cron job runs every 4 hours: queries Google Ads API for all ads with `policy_summary.approval_status = DISAPPROVED` or `APPROVED_LIMITED`
- Results stored in `ad_disapprovals` table with: campaign, ad group, ad headline snippet, disapproval reason, policy topic, detection timestamp
- If new disapprovals detected since last scan: send email alert with: client name, campaign, ad text snippet, reason, direct link to Google Ads UI for that ad
- In-app: Disapprovals tab shows all current issues across all clients in a table. Sort by client, severity, date detected
- "Mark as reviewed" button per disapproval; reviewed items move to history
- Real estate/home builder accounts get special flagging for Housing Policy (Topic: `HOUSING`) and Financial Services disapprovals — these are the most common in the vertical

**Data model:**
```
ad_disapprovals: id, user_id, client_id, platform, campaign_id, ad_id, ad_snippet, reason, policy_topic, status (new/reviewed/resolved), detected_at, resolved_at
```

### 3.2 Landing Page Monitor
**What it does:** Pings all active destination URLs once per day. Flags broken pages before they drain budget.

**How it functions:**
- Pulls all unique final URLs from active campaigns via Google Ads API + Meta Marketing API
- Server-side HTTP GET request to each URL (with 10s timeout, follows redirects, records final URL)
- Flags: HTTP 4xx/5xx response, SSL certificate error, redirect chain >3 hops, redirect strips UTM parameters (compares pre/post redirect URL), response time >5s
- Does NOT check page content — only HTTP status and URL integrity
- Alert email when any active URL starts failing; includes campaign name, URL, error type, time detected
- In-app table: all monitored URLs, last check timestamp, status, campaign linked to

**Data model:**
```
url_monitors: id, user_id, client_id, url, last_checked_at, status_code, redirect_final_url, error_type, response_ms, platform, campaign_name
url_monitor_log: id, url_monitor_id, checked_at, status_code, error_type, response_ms
```

### 3.3 Conversion Tracking Monitor
**What it does:** Detects "silent breakage" — campaigns spending money while conversion tracking is broken.

**How it functions:**
- Daily check via Google Ads API: for every campaign with spend in the last 7 days, query `metrics.conversions` and `metrics.all_conversions`
- Alert condition: campaign spent >$50 in the last 7 days AND conversion count = 0 in the same window AND campaign type is not brand awareness (exclude Video/Display/Awareness objectives)
- Secondary check: conversion action status — query all conversion actions, flag any with `status = REMOVED` or `tag_snippets[].page_tag_fires = 0` in the last 7 days
- Alert email: campaign name, spend in period, conversion action name, last known fire date
- In-app: Tracking Health widget on the client overview page — green/yellow/red status per conversion action

**Data model:**
```
conversion_health: id, user_id, client_id, conversion_action_id, conversion_action_name, platform, last_fire_at, status, spend_7d, conversions_7d, alert_sent_at
```

### 3.4 Account Change Log
**What it does:** Unified timeline of what changed across all connected accounts. Answers "what changed last week?" without digging through each platform.

**How it functions:**
- Daily pull of Google Ads change history via `ChangeEvent` resource (available via API): timestamp, resource_type (Campaign/AdGroup/Ad/Keyword/Bid), old_value, new_value, change_origin (API/UI/AUTOMATED_RULE/SCRIPT/BULK_UPLOAD)
- Daily pull of Meta Ads Activity Log via `/act_{id}/activities` endpoint
- Stored per-client in normalized change log table
- UI: filterable timeline per client — filter by: date range, platform, change type (budget/bid/status/creative/keyword), change origin
- User can add manual annotations — "Switched to Broad Match", "New creative launched", "Client approved $500 budget increase" — saved with timestamp
- Annotations appear inline in the change timeline as a different color/icon

**Data model:**
```
account_changes: id, user_id, client_id, platform, change_type, resource_type, resource_name, old_value, new_value, change_origin, occurred_at, raw_json
change_annotations: id, user_id, client_id, annotation_text, annotation_date, created_at
```

### 3.5 Creative Fatigue Monitor (Meta)
**What it does:** Surfaces Meta ads approaching or hitting creative fatigue before CPAs spike. Removes the need to manually drill into Ads Manager for each ad.

**How it functions:**
- Daily pull via Meta Marketing API: for all active ads, pull `frequency`, `ctr`, `cost_per_result`, `delivery_info.delivery_status` for the last 7 days AND last 14 days
- Alert thresholds (configurable per client, these are defaults):
  - **Warning:** frequency ≥ 2.5 over last 7 days, OR CTR dropped >20% vs prior 7-day period
  - **Critical:** `delivery_info.delivery_status = "CREATIVE_FATIGUE"` OR `"CREATIVE_LIMITED"`, OR CPA >50% above 14-day average while frequency is rising
- In-app Creative Health table: shows ad thumbnail (via `creative.image_url` from API), campaign, ad set, frequency, CTR trend (sparkline), CPA vs. avg, fatigue status badge
- "Flag for refresh" action: adds a task to the linked campaign checklist, or creates a new checklist item: "Replace creative on [ad name] — flagged for fatigue [date]"
- Weekly email digest (opt-in): "These 3 ads are approaching fatigue — schedule a creative refresh"

**Data model:**
```
creative_health: id, user_id, client_id, ad_id, ad_name, campaign_id, ad_set_id, thumbnail_url, frequency_7d, ctr_7d, ctr_prior_7d, cpa_7d, cpa_14d_avg, delivery_status, fatigue_status (ok/warning/critical), checked_at
```

---

## PHASE 4 — Ad Copy Library & RSA Builder

### 4.1 Ad Copy Asset Bank
**What it does:** A structured library of headline and description assets, stored outside the ad platforms. Replaces writing inside Google Ads UI — the biggest per-launch time sink.

**How it functions:**
- User creates and stores assets: Headline (≤30 chars), Description (≤90 chars), Sitelink (≤25 chars title, ≤35 chars each description line), Callout (≤25 chars), Structured Snippet
- All assets have: character count validation in real-time (shows remaining chars, turns red at limit), tags (vertical, client, theme, status), performance grade (Excellent/Good/Low — synced from Google Ads API if ad is live)
- Tag system: `real-estate`, `home-builder`, `brand`, `price-anchor`, `urgency`, `CTA`, `community-name`
- Filter and search assets by tag, client, character length, performance grade
- "Copy to clipboard" on any asset
- **Bulk import:** paste in a list of existing headlines (one per line) → tool validates character counts, adds to library with suggested tags

**Data model:**
```
copy_assets: id, user_id, client_id (nullable), asset_type (headline/description/sitelink/callout), text, char_count, tags_array, performance_grade, google_ad_id (nullable, for grade sync), created_at, updated_at
```

### 4.2 RSA Builder
**What it does:** Assemble RSA-ready ad combinations from the asset bank and export directly to Google Ads Editor CSV format.

**How it functions:**
- User selects: client, campaign, ad group, then picks assets from the library
- Required: 15 headlines (can select up to 15; minimum 8 recommended), 4 descriptions
- Optional: set pinning for specific headline positions (Position 1, 2, 3) — tool warns if >2 pins (reduces Google's optimization ability)
- **Preview panel:** shows 3 randomly assembled combinations of the selected headlines + descriptions so user can QA for embarrassing combinations
- Character count summary: confirms all selected assets are within limits
- **Export to CSV:** generates Google Ads Editor-compatible CSV with headers `Campaign`, `Ad Group`, `Headline 1–15`, `Description 1–4`, `Final URL`, `Path 1`, `Path 2`
- Export can be copied to clipboard or downloaded as `.csv`
- Saved as a "draft ad" in the system, linked to the campaign record; checklist item "RSA created" auto-marked

### 4.3 Optional: Headline Variation Generator
**When to use:** Companion to the asset bank, not a replacement. Use when you have a proven headline and want to test angles.

**How it functions:**
- User inputs one seed headline (e.g., "New Homes in Abbeville from the $200s") and selects a variation strategy: Price Anchor, Community Feature, Urgency, Question Format, Amenity Focus
- Sends to LLM (Claude API) with a tightly constrained prompt: generate 4 variations of this headline under 30 characters using the {strategy} angle. Match the brand tone: direct, no hype.
- Returns 4 options; user selects any to add to asset bank
- **Clearly labeled as AI-assisted** in the UI — asset gets `ai_generated: true` tag; user should review before publishing
- This is the ONE feature where LLM is core — but it's optional, scoped, and clearly labeled

---

## PHASE 5 — Negative Keyword Manager

### 5.1 Negative Keyword Library
**What it does:** A centralized, organized negative keyword database. Eliminates rebuilding negative lists from scratch for every account.

**How it functions:**
- Three tiers of negatives:
  1. **Universal** — always apply to every account (user-managed, pre-seeded with obvious ones)
  2. **Vertical-specific** — real estate negatives, home builder negatives, property management negatives (pre-seeded library; user can add/remove)
  3. **Client-specific** — competitor names, brand exclusions, geographic exclusions for that client
- Pre-seeded real estate/home builder negative list (expansive default): `rent`, `rental`, `apartment`, `apartments`, `jobs`, `salary`, `career`, `zillow rent`, `cheap`, `free`, `foreclosure`, `short sale`, `government`, `subsidized`, `section 8`, `hud`, `low income`, `affordable housing`, `how to`, `diy`, etc.
- Each keyword stored with: text, match type (Broad/Phrase/Exact — default: Phrase), tier, vertical tag, notes
- **Export to CSV:** Google Ads Editor-compatible negative keyword list CSV. User selects which tiers to include + which client-specific list. Output is ready for bulk upload
- **Apply to new campaign:** from a campaign checklist item, one-click pulls the recommended negatives for that vertical + client and exports them

**Data model:**
```
negative_keywords: id, user_id, tier (universal/vertical/client), client_id (nullable), keyword_text, match_type, vertical_tag, notes, is_default, created_at
```

### 5.2 Search Term Triage Tool
**What it does:** Streamlines the weekly search term review → negative add cycle. The single biggest ongoing time drain in Google Ads management.

**How it functions:**
- User selects client + date range (default: last 7 days)
- Tool pulls search terms via Google Ads API: `search_term_view` resource with metrics: `cost`, `clicks`, `conversions`, `impressions`, `search_term_match_type`
- Sort default: cost descending (highest-spend terms first)
- Each term shows: search term text, match type that triggered it, campaign, ad group, cost, clicks, conversions, CTR
- **Three-button triage per row:** ✅ Add as Keyword | 🚫 Add as Negative | → Skip
- Match type selector on negative (default: Phrase Match — correct default per community practice)
- Destination selector on negative: Shared List (dropdown of user's saved lists), Campaign-Level, Ad Group-Level, PMax Exclusion List (separate field)
- **Batch select:** checkbox all irrelevant terms → bulk add as negatives
- **Staged queue:** all "add as negative" decisions queue up → user reviews queue → one "Apply All" button submits via Google Ads API
- Pre-flagging: terms matching universal negative library are pre-highlighted in red with "Matches your negative library — consider adding"
- After applying, checklist item "Search term review completed" can be marked with a timestamp

---

## PHASE 6 — Client & Connection Management

### 6.1 Client Dashboard
**What it does:** The top-level view of the user's book of business. One card per client, all status at a glance.

**How it functions:**
- Card per client: name, connected platforms (icon + green/red status), monthly budget + pacing status, open checklist items count, last active campaign, last health alert (if any)
- Quick-add client form: name, monthly budget, budget reset day
- Click into client → Client Detail page: Budget view, Campaigns, Health Monitors, Change Log, Platform Connections

### 6.2 Platform Connection Health
**What it does:** Shows which platforms are connected per client, OAuth token status, and expiry warnings.

**How it functions:**
- Per client: table of connected platforms with: OAuth status, connected account name/ID, token expiry date, last successful data pull timestamp
- **Warning banner:** if Meta OAuth token expires in <7 days, show reminder to re-authenticate (Meta tokens expire; Google tokens auto-refresh)
- **Re-connect button:** re-initiates OAuth flow for that platform
- Connection status drives the checklist: "Platform OAuth connected" item auto-completes when connection is green
- For StackAdapt (CSV-only): shows "Last import: X days ago" with import button

**Data model:**
```
platform_connections: id, user_id, client_id, platform, account_id, account_name, access_token_encrypted, refresh_token_encrypted, token_expires_at, last_sync_at, status (active/expired/error), created_at
```

---

## PHASE 7 — Reporting (Borrow from Competition, Execute Better)

### 7.1 Campaign Performance Dashboard
**What it does:** Replaces Looker Studio for the standard weekly performance review. No connectors to break, no template to rebuild.

**How it functions:**
- Date range picker (Last 7 days, Last 30 days, This Month, Custom)
- Per client, per campaign metrics pulled from API:
  - Google Ads: impressions, clicks, CTR, avg CPC, conversions, cost/conversion (CPL), conversion rate, impression share, search top IS
  - Meta: reach, impressions, frequency, CPM, CTR (link), CPC, results (leads/purchases), cost per result, ROAS
- KPI summary bar at top: total spend, total conversions, avg CPL across all platforms, MoM CPL change
- Campaign-level table: sortable by any metric, filterable by platform/status
- **No AI narrative** in v1 — just the data, well-organized. (AI summary is a future paid tier feature)
- Export to PDF: simple formatted PDF for client delivery

### 7.2 Morning Digest Email (Daily, 8am)
**What it does:** A daily email that surfaces what needs attention today. Turns the tool from something users open when they remember it into a daily habit.

**How it functions:**
- Scheduled cron at 8am user local time
- Email sections (only shows sections where there is content to report):
  1. **🚨 Needs Action Today:** disapprovals, broken landing pages, tracking silent failures, budgets over/under by >25%
  2. **⚠️ Watch Closely:** creative fatigue warnings, pacing alerts (10–25% off track), campaigns pending launch today
  3. **📊 Yesterday at a Glance:** total spend yesterday vs. target, top-performing campaign, biggest CPL change
- Each item has a direct link to the relevant section in the app
- User can configure: which clients to include, alert thresholds, time of send, on/off toggle
- **This is the stickiness feature.** Even if users don't log in daily, they interact with the tool via email

---

## PHASE 8 — Competition-Borrowed Features (Selectively Added)

These features are inspired by competitors but implemented in a focused, non-bloated way:

### 8.1 Account Health Audit (On-Demand)
*Inspired by Adalysis + PPC.io — but integrated with your own account data*

**What it does:** A one-click account health check that runs 15+ diagnostic checks and returns a prioritized list of issues.

**Checks to run (all via Google Ads API — no LLM required for core checks):**
1. Campaigns with no conversions in 30 days but spending
2. Ad groups with 1 or fewer active ads
3. RSAs with fewer than 8 headlines (below minimum for good optimization)
4. RSA asset performance: any assets rated "Low" (Google provides this)
5. Keywords with Quality Score ≤ 3
6. Campaigns missing negative keyword lists
7. Ad extensions: campaigns with no sitelinks, no callouts
8. Budget: any campaigns hitting daily budget cap (leaving impression share on table)
9. Bid strategy conflicts (manual CPC on campaigns with smart bidding conversion goals)
10. PMax campaigns missing audience signals
11. Search campaigns that include Search Partner and Display Network (usually should be excluded)
12. Keywords with >30% impression share lost to budget
13. Active broad match keywords without audience signals
14. Landing page URLs that differ from what's in the UTM library (inconsistency check)
15. Conversion actions with 0 fires in 14 days on active campaigns

Output: a scored issue list (High/Medium/Low priority) with: issue name, affected campaign, recommended fix, one-click link to fix location in Google Ads UI.

**Optional LLM layer:** After running the checks, optionally pass the issue list to Claude API: "Summarize these 8 issues in plain English, prioritized by estimated CPL impact for a real estate advertiser." Returns a 3-sentence plain-English summary. Clearly labeled "AI Summary" with the raw issue list always visible.

### 8.2 Budget Pacing Alert Rules Builder
*Inspired by Optmyzr Rule Engine — stripped to what a solo operator actually needs*

**What it does:** User configures alert rules. Tool runs them on a schedule and notifies.

**How it functions:**
- Simple rule form: IF [metric] [operator] [threshold] THEN [action]
- Available metrics: daily spend, CPL, CTR, impression share, frequency, conversion count
- Available operators: greater than, less than, changed by more than X%
- Available actions: Email me, Mark campaign for review (adds to checklist), Show in morning digest
- Examples pre-loaded: "If CPL > $200 on any campaign in the last 7 days → email me", "If frequency > 3.0 on any Meta ad set → flag for creative review"
- User can also export rule as a native Google Ads automated rule (generates the rule syntax for copy-paste)

---

## Feature Dependency Map

```
Phase 0: UTM Generator (SHIPPED)
    ↓ feeds into
Phase 2: Campaign Checklist (auto-completes UTM item)
    ↓ links to
Phase 1: Budget Dashboard (campaign linked to budget)
Phase 5: Negative Keyword Manager (linked to campaign)
Phase 4: Ad Copy Library → RSA Builder (linked to campaign)

Phase 6: Client & Connection Management (prerequisite for all API features)
    ↓ enables
Phase 1: Budget Dashboard (needs connected accounts)
Phase 3: Account Health Monitors (needs connected accounts)
Phase 5: Search Term Triage (needs connected Google account)
Phase 7: Reporting (needs connected accounts)

Phase 3: Monitors (disapprovals, landing page, tracking, change log, creative fatigue)
    ↓ feeds into
Phase 7: Morning Digest Email (aggregates all monitor alerts)
Phase 8: Account Health Audit (on-demand deeper run of same data)
```

---

## Pricing Model (Flat, Anti-Wrapper)

| Tier | Price | Limits | Notes |
|---|---|---|---|
| **Solo** | $29/month | 1 workspace, 3 clients, 2 connected platform accounts | Target: owner-operator, freelancer |
| **Pro** | $59/month | 1 workspace, 10 clients, unlimited platform accounts | Target: growing freelancer, small shop |
| **Team** | $99/month | 5 users, unlimited clients | Target: 2–3 person agency |
| **Free Trial** | 14 days | Full Pro access | No card required |

No percentage-of-spend pricing. No per-seat upsells for basic features. Flat pricing is a differentiator against Revealbot/Bïrch.

---

## API Integration Reference

| Platform | Access | Auth | Key APIs Used | Notes |
|---|---|---|---|---|
| Google Ads | Basic Access (apply early — 2–6 week approval) | OAuth2 + developer token | GoogleAdsService (search), ChangeEvent, SearchTermView, ConversionAction, PolicySummary | Read-only for v1 budget + monitoring. Write for search term negatives in Phase 5 |
| Meta Marketing API | Standard Access (App Review ~1–2 weeks) | OAuth2 + system user token | `/insights`, `/ads`, `/adcreatives`, `/activities`, `/adsets` | Dev mode for own accounts immediately; app review for multi-client |
| GTM API | No special review needed | OAuth2 (same Google token, additional scope) | `accounts.containers.workspaces.tags`, `.triggers`, `.versions` | Standard Google OAuth flow |
| LinkedIn | Standard developer access | OAuth2 | `analytics/finder` | Lower priority; add after Google + Meta proven |
| StackAdapt | No public third-party API | CSV import | User exports → uploads | Build CSV parser for their export format |

---

## Build Order (Recommended Sprint Sequence)

**Sprint 1 — Foundation (Weeks 1–2)**
- Platform connections infrastructure (OAuth flows for Google Ads + Meta)
- Client management UI (CRUD)
- Supabase schema: all tables above
- Budget Dashboard MVP: Google Ads spend only, single platform, read-only

**Sprint 2 — Budget Dashboard Complete + Checklist (Weeks 3–4)**
- Meta spend integration into Budget Dashboard
- StackAdapt CSV import
- Pacing calculations + color-coded status
- Campaign Checklist engine: create/manage checklists, Google Search + Meta Lead Gen templates
- Campaign Naming Generator

**Sprint 3 — Health Monitoring (Weeks 5–6)**
- Disapproval Scanner (cron + email alert)
- Landing Page Monitor (cron + email alert)
- Conversion Tracking Monitor (cron + email alert)
- Morning Digest email (aggregates Phase 3 alerts)

**Sprint 4 — Ad Ops Tools (Weeks 7–8)**
- GTM Automation wizard
- Negative Keyword Library (with pre-seeded real estate/home builder lists)
- Search Term Triage Tool (read-only pull + staged queue)

**Sprint 5 — Copy + Creative (Weeks 9–10)**
- Ad Copy Asset Bank
- RSA Builder with Google Ads Editor CSV export
- Creative Fatigue Monitor (Meta)

**Sprint 6 — Account Intelligence (Weeks 11–12)**
- Account Change Log (Google + Meta)
- Account Health Audit (15-check on-demand scan)
- Budget Alert Rules Builder
- Client Connection Health dashboard

**Sprint 7 — Reporting + Polish (Weeks 13–14)**
- Campaign Performance Dashboard
- PDF export for client reporting
- Optional: Headline Variation Generator (LLM-assisted, clearly labeled)
- Billing integration (Stripe)
- Pricing tiers enforcement

---

## Anti-Patterns to Avoid

1. **Do not add autonomous bid changes.** The tool views; the human decides. All write operations require user confirmation.
2. **Do not add campaign creation from scratch.** That is Fluency territory. The checklist guides the user through creation in the native platform.
3. **Do not make AI the headline feature.** LLM is a helper (variation generator, optional audit summary). The API integrations and workflow tools are the product.
4. **Do not add % of spend pricing.** Flat pricing only.
5. **Do not add real-time bidding or budget reallocation.** High-risk write operations — out of scope.
6. **Do not build a Looker Studio clone.** Build a simpler, more reliable reporting view that covers 80% of use cases without connector dependencies.
