# Research Brief: Ad Op Tools vs. Fluency

**Purpose:** Input for a research tool. Self-contained competitive + roadmap brief to inform
positioning, pricing, and next-feature decisions for **Ad Op Tools**, a bootstrapped SaaS,
benchmarked against **Fluency** (fluency.inc), an enterprise incumbent.

**Date:** 2026-06-26
**Prepared for:** external research/analysis pass — verify the Fluency claims (confidence levels noted)
and answer the open research questions at the end.

---

## 1. Our product — Ad Op Tools

**One line:** A SaaS tool that automates the repetitive manual steps of running digital ad
campaigns, built first for a single operator and priced for budget-conscious individuals and
small teams.

**Problem we solve:** Every new paid-ads campaign requires 10–20 repeated manual steps across
multiple platforms (UTM tagging, pixel/tag setup, budget tracking, creative swaps, reporting).
We automate the tedious ops so the user can focus on creative and strategy.

**Target user (our framing):** the owner-operator, freelancer, or small team who runs paid ads
but **will not pay enterprise prices** for ease and comfort. Explicitly the segment that
incumbent enterprise tools price out.

**Tech stack:** Next.js (App Router, React Server Components), TypeScript strict, Supabase
(PostgreSQL + Auth + Storage), Tailwind, deployed on Vercel. Single-tenant/single-user today,
designed to support paid multi-user from day one.

### Core feature set (the 5 planned pillars)

| # | Feature | What it does | Status |
|---|---------|--------------|--------|
| 1 | **Budget Dashboard** | Pull real-time spend from Google Ads, Meta, LinkedIn, TikTok into one unified view. Replaces an Excel sheet that only tracks monthly caps. | Planned (not built) |
| 2 | **UTM Generator** | Template-based bulk UTM link creation; saved templates + generation history; spreadsheet library with edit/delete. | **Built & tested in prod** |
| 3 | **GTM Automation** | Use the Google Tag Manager API to create tags, triggers, and conversion events programmatically. A "New Campaign" wizard builds the standard pixel stack in one click. | Planned (not built) |
| 4 | **Creative Asset Manager** | Upload and swap creative assets across Meta/Google/TikTok via their APIs; clone existing ads with new creative without rebuilding them. | Planned (not built) |
| 5 | **Custom Reporting Dashboards** | Looker-Studio-style in-app reporting pulling from ad-platform APIs. | Planned (not built) |

**Intentionally manual (by design, not feasible to automate):** initial pixel creation on each
platform (UI-only), first-time OAuth connection per platform, GTM snippet deployment to sites we
don't control.

---

## 2. Our roadmap

**Shipped:** Authentication (Supabase Auth: login, route protection, sign-out) + Feature #2,
the UTM Generator (complete, manually verified in production).

**Open decision — what to build next** (the live roadmap question). Candidates:

- **Budget Dashboard** — highest daily value (direct Excel replacement) but the heaviest lift:
  it's the first feature requiring OAuth + ad-platform API integrations. Recommended approach:
  scope to **one platform first, read-only spend** (low risk, no money moves), then add the other
  three. Optionally bundle a simple **overspend alert**.
- **GTM Automation** — bounded scope, no spend exposure, differentiated (see §4). The fast, safe
  "shipped win." Lower daily value.
- **Creative Asset Manager** — most surface area (OAuth + write APIs + storage); hold until the
  OAuth pattern is proven on something read-only.

**Explicitly out of scope (deliberately NOT chasing):** mass/bulk campaign generation across
locations, and autonomous bid/budget management. These are enterprise-scale and high-risk for a
first paid user — and are the parts of Fluency our target user arguably should *not* pay for.

---

## 3. Competitor — Fluency (fluency.inc)

> Confidence key: **[M]** = Fluency's own marketing claim; **[3P]** = third-party source
> (review sites / press); **[INF]** = inferred. Verify [M] and [3P] in the research pass.

**What it is:** Fluency positions itself as a **"Digital Advertising Operating System,"** an
enterprise platform built on what they call **RPA4A — Robotic Process Automation for
Advertising**. AI/agentic-automation direction (hired an ad-tech veteran as SVP Product to push
agentic automation). **[M]**

**Scale (their claims):** powers ~**$3B** in annual media spend; **250,000+** monthly campaigns;
brands with **50,000+** locations. **[M]**

**Funding:** **$40M Series A**, December 2025 (reported by AdExchanger, BusinessWire, Vermont
Business Magazine). **[3P]**

**Target customer:** enterprise **agencies** and **multi-location / national brands**
(automotive dealer groups, franchises, brands needing hyper-local campaigns at scale). **[M/INF]**

**Pricing:** **not public.** Reported model is **a percentage of ad spend** or **a per-ad-account
fee**, sales-led ("book a consultation"). **[3P — Capterra]** This is the crux: the pricing model
only makes economic sense at high spend/many accounts, which structurally **excludes** the
solo/SMB segment.

**Channels covered:** Google, Meta (Facebook/Instagram), Microsoft, Amazon Ads, TikTok (incl.
TikTok Automotive), Pinterest, YouTube. **[M]**

### Fluency's modules

- **Blueprints** — their crown jewel. Mass-generate thousands of localized campaigns from data
  sources via tag-based templating; deploy consistent campaigns across channels; QA 1,000+ ad
  previews across hundreds of locations in minutes; claims ~90% faster launches. **[M]**
- **Account Management** — centralized omnichannel dashboard across walled gardens + programmatic. **[M]**
- **Budget Management** — automated bidding, budget pacing, 24/7 optimization, real-time
  overspend/error alerts. **[M]**
- **Reporting** — normalizes/standardizes data across publishers; AI turns it into dynamic client
  reports; unified real-time data. **[M]**
- **Muse** — embedded AI creative generation (copy, headlines, descriptions, images, video) inline
  in the ad workflow. **[M]**
- **Backpack** — a connected workspace; **CoLab** is a premium add-on. **[M]**
- **Alerts** — real-time error/anomaly detection. **[M]**
- **Data integration** — connect CRM → DAM into one system. **[M]**

---

## 4. Head-to-head comparison

### Feature mapping

| Fluency module | Our planned equivalent | Notes |
|----------------|------------------------|-------|
| Blueprints (mass localized campaign gen) | *None* | We do **not** plan this. Enterprise-scale. |
| Account Management (omnichannel dashboard) | Budget Dashboard | Ours is read-only spend view. |
| Budget Management (auto-bidding + pacing) | Budget Dashboard | Ours *views* spend; theirs *acts* on it. |
| Reporting (cross-publisher normalization + AI) | Custom Reporting Dashboards | Ours lighter; no AI report-writing. |
| Muse (AI creative generation) | Creative Asset Manager | Ours manages/clones; theirs *generates*. |
| Alerts | *None* (gap) | Cheap to add; we don't currently plan it. |
| Data integration (CRM→DAM) | *None* | Out of scope for us. |
| QA previews (1,000+) | *None* | Tied to mass-generation; not relevant solo. |
| — | **UTM Generator** (built) | Fluency doesn't emphasize standalone UTM tooling. |
| — | **GTM Automation** (planned) | Fluency has **no** tag-management module. |

### What Fluency has that we don't

1. **Mass campaign creation/deployment (Blueprints)** — justifies their price at enterprise scale;
   a solo operator largely doesn't need it.
2. **Automated bidding & budget pacing** — they act on spend; we only view it. Valuable even solo,
   but the riskiest to automate (spends money autonomously).
3. **AI creative generation (Muse)** — generate copy/image/video vs. our manage/swap/clone.
4. **Real-time alerts** — overspend/anomaly detection. Cheap, high-value, and a gap in our plan.
5. **Cross-publisher data normalization** at scale + deep CRM/DAM integration.

### Where we overlap but are deliberately lighter

- Budget Dashboard ≈ Account + Budget Management, but **read-only** (no auto-bidding).
- Custom Reporting ≈ their Reporting, **minus** AI report generation.
- Creative Asset Manager ≈ a slice of Muse — **manage/clone, not generate**.

### What is uniquely ours (potential wedge)

- **UTM Generator** (already shipped) — a focused, standalone tool Fluency treats as a buried
  sub-feature.
- **GTM Automation** — Fluency is about campaign *execution*; tag/pixel setup is not their focus.
- **Price + self-serve** — affordable, no sales call, built for one operator.

---

## 5. Strategic hypothesis (to pressure-test)

**Do not clone the enterprise platform.** Fluency's entire product is built around *scale* (50k
locations, $3B spend, 250k campaigns/mo) that our target user does not have. Their %-of-spend /
per-account pricing **structurally excludes** the budget-conscious solo operator and small team.

**The opening is the segment Fluency prices out.** Win by taking the 3–4 ad-ops workflows that
hurt *every day* for a small operator and making them fast, cheap, and pleasant — not by
replicating enterprise automation. Borrow selectively (a read-only budget view; cheap overspend
alerts; maybe light creative-management), and explicitly avoid the enterprise-only, high-risk
features (Blueprints-style mass generation, autonomous bidding).

---

## 6. Questions for the research tool

1. **Pricing benchmark.** Confirm Fluency's actual pricing (% of spend vs. per-account) and
   typical figures. What do comparable ad-ops automation platforms charge? What is a realistic
   price floor / model for an SMB/solo tier (flat monthly? per-seat? per-connected-account?)?
2. **Segment sizing & willingness to pay.** How large is the budget-conscious solo /
   freelancer / small-agency segment for paid-ads operations tooling? What will they actually pay?
3. **Competitive set in the affordable tier.** Who already serves SMB/solo ad-ops (e.g., Madgicx,
   Revealbot, Adzooma, Smartly, AdEspresso-style tools, others)? What do they do well, what do
   they overcharge for, and where are the unserved gaps?
4. **Borrow-vs-skip.** Which Fluency capabilities deliver real value at *solo/small* scale, and
   which only pay off at enterprise scale? (Prioritize what's worth building.)
5. **Integration feasibility/cost.** For a small team, what's the real friction of the platform
   APIs we need — Google Ads, Meta, LinkedIn, TikTok, and GTM? Access tiers, app-review/approval
   hurdles, rate limits, data costs.
6. **Is the wedge real?** Are GTM automation + UTM tooling a genuine differentiator for this
   segment, or table stakes? Who does them well/cheaply already?
7. **Risk/positioning.** Platform-policy or compliance risks of automating campaign/creative/tag
   actions via APIs at small scale, and how affordable competitors handle them.

---

## Sources (Fluency)

- https://www.fluency.inc/platform
- https://www.fluency.inc/platform/blueprints
- https://www.fluency.inc/platform/budget-management
- https://www.fluency.inc/platform/account-management
- https://www.adexchanger.com/platforms/fluency-raises-40-million-to-fuel-ai-for-digital-ad-campaign-automation/ (Series A)
- https://www.capterra.com/p/10015344/Fluency/ (pricing model — third party)
- https://www.g2.com/products/fluency-fluency/reviews
