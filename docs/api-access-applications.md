# Platform API Access — Process & Paste-Ready Copy

Reusable guide for obtaining the API access Ad Op Tools needs. Google Ads + GTM share one Google
Cloud project and OAuth client; Meta is separate. Apply for the long-lead items (Google Ads, Meta)
**first** — they gate every platform-data feature (open-question API-001).

**Tracker**
- [ ] Google Ads — developer token (Test access)
- [ ] Google Ads — Basic Access (production, 15k ops/day)
- [ ] Google Cloud — OAuth client + consent screen
- [ ] GTM API enabled (same Cloud project)
- [ ] Meta — app + Marketing API (dev mode)
- [ ] Meta — App Review (`ads_read`)

---

## 1. Google Ads API

### Why you don't see the API access request
**API Center only exists on a Google Ads _Manager account_ (MCC)** — not a regular Google Ads
account. Managing ads inside a normal account is **not** the same thing. If API Center isn't
showing, you're almost certainly signed into a standard account, not a Manager account.

### Steps
1. **Have a Manager account (MCC).** If not: [create one (free)](https://ads.google.com/home/tools/manager-accounts),
   then **link your existing Google Ads account(s)** to it.
2. Sign into the **Manager account** → go to **https://ads.google.com/aw/apicenter** (or **Admin → API Center**).
3. Complete the **API Access form** + accept terms → you receive a **developer token** at
   **Test Account** access (test accounts only, at first).
4. Set the **API Contact Email** and confirm **all active accounts are linked** to the manager
   account (required before Basic Access).
5. In API Center, **apply for Basic Access** (15,000 ops/day, production accounts; 2–6 week review).

### Paste-ready application copy
- **Tool / company name:** Ad Op Tools
- **Website:** https://ad-op-tools.vercel.app
- **Own accounts or third parties'?** Both — the operator's own Google Ads accounts and their
  clients' accounts, accessed via OAuth (each user authorizes only accounts they already manage).
- **Use case / what the tool does:**
  > Ad Op Tools is a SaaS that streamlines day-to-day paid-search operations for solo operators and
  > small agencies: a unified cross-platform budget/spend dashboard, campaign-launch checklists, and
  > automated account-health monitoring (ad disapprovals, broken landing pages, silent
  > conversion-tracking failures), plus a weekly search-term review workflow and performance
  > reporting. Usage is predominantly read-only — pulling metrics, change history, policy/approval
  > status, and search-term data. The only write operations are user-confirmed negative-keyword
  > additions. The tool performs no autonomous bidding or budget changes.
- **API services used:** GoogleAdsService (search/reporting), ChangeEvent, SearchTermView,
  ConversionAction, ad-group-ad policy/approval status.
- **Estimated daily operations:** well under 15,000.
- **OAuth scope:** `https://www.googleapis.com/auth/adwords`

---

## 2. Google Cloud — OAuth client + consent screen (for Google Ads AND GTM)
1. [console.cloud.google.com](https://console.cloud.google.com) → create/select a project (`ad-op-tools`).
2. Enable **Google Ads API** and **Tag Manager API**.
3. **OAuth consent screen** → External; add scopes `…/auth/adwords` and
   `…/auth/tagmanager.edit.containers`; add yourself as a test user.
4. **Credentials → OAuth client ID → Web application.** Planned redirect URIs:
   `https://ad-op-tools.vercel.app/api/integrations/google/callback` (+ a localhost one for dev).
5. Store client ID/secret as **server-only** env vars (never `NEXT_PUBLIC_`).

**Consent-screen copy**
- App name: Ad Op Tools · Support email: mikegrigsby2010@gmail.com
- Description:
  > Ad Op Tools helps advertisers manage paid-search operations — budgets, campaign checklists,
  > account-health monitoring, and reporting — by reading their Google Ads data and, with explicit
  > confirmation, managing negative keywords and Tag Manager tags they authorize.

---

## 3. GTM API
No separate review. Same Cloud project + OAuth client; enable the Tag Manager API and request scope
`…/auth/tagmanager.edit.containers`. Add `.publish` **only** if we choose one-click publish — default
is draft-only (open-question GTM-001).

---

## 4. Meta Marketing API

### Steps
1. [developers.facebook.com](https://developers.facebook.com) → **Create App** → type **Business**.
2. Add the **Marketing API** product. In **dev mode** it works immediately against accounts you own
   — enough to build and test.
3. Complete **Business Verification** (Meta Business Suite).
4. Submit **App Review** for **`ads_read` only** (we never write to Meta → no `ads_management`, which
   keeps the review bar low). ~1–2 weeks.
5. Use a long-lived **System User token** for server-side calls.

### Paste-ready App Review copy
- **Permission requested:** `ads_read`
- **How the app uses it:**
  > Ad Op Tools reads advertising performance data (spend, impressions, clicks, results, frequency,
  > delivery status) from Meta ad accounts the user authorizes, to display a unified budget
  > dashboard, monitor creative fatigue, and generate performance reports. The app does not create,
  > edit, pause, or delete campaigns, ad sets, ads, or budgets on Meta — it is strictly read-only.
- **Screencast script** (Meta requires a screen recording):
  > 1. Log into Ad Op Tools. 2. Connections → "Connect Meta" → complete Facebook Login granting
  > `ads_read`. 3. Select an ad account. 4. Show the Budget Dashboard populating with that account's
  > spend. 5. Show the Creative Fatigue monitor reading frequency/CTR. Narrate that all data is
  > read-only.

---

## 5. Deferred
- **LinkedIn** — standard developer access + Marketing Developer Platform review; add after Google +
  Meta are proven.
- **StackAdapt** — no public API; CSV import only.
