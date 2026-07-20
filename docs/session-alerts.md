# Session-Start Alerts — User Actions Pending

Surfaced automatically at the start of every session by
`scripts/hooks/session-start-roadmap.js`. Remove an item once the owner confirms
it is done (and note the completion in `docs/open-questions.md` ARCH-003).

- [ ] **Apply for the Google Ads Developer Token** — gates all Phase 2 Google Ads
      testing; approval takes days. Apply at the Google Ads API Center under a
      Google Ads manager account.
- [ ] **Start Meta App Review + Business Verification** — gates onboarding any
      external/paying user (owner's own ad account works in dev mode without it);
      long lead time. Request the `ads_read` advanced permission on the existing app.
- [ ] **Enable Supabase leaked-password protection** — 10-second dashboard toggle
      (Dashboard → Authentication → Policies → "Leaked password protection"). Not
      settable via API/MCP; it's the one remaining item from the 2026-07-07 security
      hardening slice (SEC-002 §4 item 4).
