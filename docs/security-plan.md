# Security Plan — Findings & Pre-Launch Hardening

> Written 2026-07-07 from a security audit (`security-reviewer` agent + manual verification)
> of the live codebase. Companion to `docs/architecture-blueprint.md`. **Self-contained for
> future sessions.** Items are ordered by priority within each section; sizes S/M/L. When an
> item is fixed, check it off here and note it in `docs/current-status.md`.
>
> Standing decisions this plan does NOT relitigate (see `docs/decision-log.md`): app-side
> AES-256-GCM token encryption keyed by `TOKEN_ENCRYPTION_KEY`; single shared Supabase
> project until launch; RLS on every table; `SUPABASE_SERVICE_ROLE_KEY` set in Vercel but
> intentionally unused until background sync needs it.

## 1. What is already strong (verified in code — do not regress)

- **Token crypto** (`src/lib/integrations/token-crypto.ts`): fresh random 12-byte IV per
  encrypt; GCM auth-tag mismatch throws (and the caller sanitizes the error); AAD binds each
  ciphertext to `userId:platform:externalAccountId` so a ciphertext moved to another row
  fails to decrypt; key length validated; key-versioned via `token_key_id`.
- **Token isolation** (`src/lib/integrations/connections.ts`): the ONLY decrypt path;
  client-facing budget queries use a token-free shape — no token column reaches the browser.
- **Meta OAuth** (`src/app/api/integrations/meta/{connect,callback}/route.ts`): CSRF state
  in an httpOnly/secure/sameSite=lax cookie compared with `timingSafeEqual`, cleared on every
  exit path; `redirect_uri` built from `APP_ORIGIN` env (never request headers → no
  host-header injection); token exchange via POST body (secret never in a URL);
  `appsecret_proof` on Graph calls.
- **Database**: RLS enabled on all five tables; newer policies use `(select auth.uid())`
  (init-plan, not per-row); `budget_entries` deliberately has no DELETE policy;
  `set_updated_at` trigger has a pinned `search_path` (Supabase advisor 0011 remediated).
- **Hygiene**: no hardcoded secrets, no `console.log`, no `dangerouslySetInnerHTML` /
  `eval` anywhere in `src/`; service-role key unused by any code path (verified by grep).

## 2. Findings to fix (concrete, verified)

### 2.1 HIGH — Open redirect in the Supabase auth callback (S)
`src/app/auth/callback/route.ts` takes `next` from the query string and does
`NextResponse.redirect(`${origin}${next}`)` unvalidated. A crafted value like
`next=@evil.com` yields `https://ad-op-tools.vercel.app@evil.com`, which browsers parse as
host `evil.com` (verified with the URL parser — real, not theoretical). Today the route only
fires after a valid Supabase auth code (password login doesn't use it), but it becomes a live
phishing vector the moment password-reset / magic-link emails ship (AUTH-001).
**Fix:** accept `next` only if it is a same-origin relative path:

```ts
const rawNext = searchParams.get('next')
const next =
  rawNext && /^\/(?!\/)/.test(rawNext) && !rawNext.includes('://') && !rawNext.includes('@')
    ? rawNext
    : '/dashboard'
```

### 2.2 MEDIUM — `src/features/utm/queries.ts` has no auth check (S)
`getUTMTemplates` / `getUTMHistory` call neither `supabase.auth.getUser()` nor
`.eq('user_id', ...)` — tenant isolation rests 100% on RLS. This violates the project's own
"permission checks happen twice" rule and the pattern the budget feature follows. If an RLS
policy is ever dropped/mangled (e.g. during the UTM-004 policy reconciliation at the
dev/prod split), this becomes silent cross-tenant exposure.
**Fix:** add the auth guard (return empty on no user) and an explicit
`.eq('user_id', user.id)` filter to both functions.

### 2.3 LOW — Budget queries are RLS-only for row scoping (S)
`src/features/budget/queries.ts` (`getConnections`, `getBudgetEntries`, `getCaps`) checks
auth but omits `.eq('user_id', user.id)` on the selects. Add the explicit filter for
defense-in-depth, matching the file's own stated intent. (Becomes `org_id` scoping when the
org layer from the blueprint lands.)

### 2.4 LOW — Transitive `postcss` CVE (track only)
`npm audit`: one moderate CVE in `postcss` pinned inside Next's own node_modules;
build-time-only tooling, not attacker-reachable at runtime; no fix without a breaking
change. Track; do not force-resolve.

## 3. Posture gaps for multi-tenant / paid launch (none of these exist yet)

- **Rate limiting** — nothing on server actions or OAuth routes; `syncBudget` fans out to
  Meta per connection with no cooldown (shared app-level Meta quota at risk).
- **Security headers / CSP** — `next.config.ts` has no `headers()` block: no CSP, HSTS,
  `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`. Vercel does not inject these by default.
- **Password reset / change flow absent** (AUTH-001) — a locked-out user cannot self-serve;
  also, a temporary admin-set password exists in prior session chat history and must be
  rotated once the flow ships.
- **Supabase Auth "leaked password protection" toggle is OFF** — one dashboard switch.
- **No account-lockout supplement** — login brute-force protection rests entirely on
  Supabase defaults; revisit with the rate-limiting work.
- **No audit logging** — OAuth connect/disconnect, token-decrypt failures, cap changes leave
  no forensic trail. (Table lands with the org migration per the blueprint §3.11.)
- **Key/secret rotation runbook incomplete** — `token-crypto.getKey()` is single-key; it
  must become a `{keyId: key}` map (plus a re-encrypt job) before the first
  `TOKEN_ENCRYPTION_KEY` rotation. No documented rotation procedure for `META_APP_SECRET`
  or Supabase keys either.
- **No CI at all** — no `.github/workflows/`; no automated `type-check`/`lint`/`build` on
  push, no `npm audit` gate, no Dependabot. The only gate is manual discipline.
- **No tests** (TEST-001) — highest-value cheap targets: `spendToMicros` in
  `src/lib/integrations/meta/transforms.ts` (a silent off-by-1000 corrupts money data) and a
  token-crypto round-trip + tamper test.
- **Meta App Review + Business Verification not started** — hard external-user blocker with
  a long lead time; dev-mode only covers the owner's own ad account.
- **No GDPR/data-deletion path** — no "delete my account/data" flow; `budget_entries` has no
  DELETE policy by design, so erasure needs a documented service-role path; no retention
  policy for spend data or tokens after disconnect.
- **Service-role discipline for background sync** — when cron activates
  `SUPABASE_SERVICE_ROLE_KEY` (blueprint §3.3), the client bypasses RLS: it must live only
  in `src/lib/supabase/service.ts`, be imported only by cron/webhook routes, scope every
  query explicitly in code, and never widen token-column selection.

## 4. Prioritized checklist

### Now (this or next session — cheap, real)
1. ☑ Fix the `/auth/callback` open redirect (§2.1) — **S** — done 2026-07-07; `next` validated
   as same-origin relative path; security-reviewer confirmed no bypass.
2. ☑ Auth guard + explicit user scoping in `utm/queries.ts` (§2.2) — **S** — done 2026-07-07.
3. ☑ Explicit user scoping in `budget/queries.ts` (§2.3) — **S** — done 2026-07-07.
4. ☐ Flip on Supabase Auth leaked-password protection — **S** — **USER ACTION** (dashboard
   toggle, not settable via MCP; in `docs/session-alerts.md`).
5. ☑ Add security headers via `next.config.ts` `headers()` (HSTS, nosniff, `X-Frame-Options:
   DENY` + `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`; CSP
   report-only) — **M** — done 2026-07-07. CSP has no report sink yet (rides Sentry §3.6);
   enforce later per launch-gate item 20.
6. ☑ GitHub Actions CI: `type-check` + `lint` + `test` + `build` + `npm audit
   --audit-level=high`, plus Dependabot config — **S** — done 2026-07-07
   (`.github/workflows/ci.yml` with `permissions: contents: read`, `.github/dependabot.yml`).
7. ☑ Vitest for `spendToMicros` + token-crypto round-trip/tamper tests — **S** — done
   2026-07-07; 13 tests green, wired into CI.

### Phase 2 (rides the blueprint work)
8. ☐ Audit-log table with the org migration; log OAuth connect/disconnect, decrypt
   failures, cap changes — **M**
9. ☐ Sentry error tracking (dependency approval) before unattended cron — **S**
10. ☐ Per-user sync cooldown (cheap rate limit on `syncBudget`) — **S**
11. ☐ Service-role client discipline as specified in §3 when cron ships — **S**
12. ☐ Bind OAuth `state` to the user id (defense-in-depth, noted in BUDGET-001) when
    building the second OAuth flow — **S**

### Launch gate (before the first external/paying user)
13. ☐ Password reset + change-password flow (AUTH-001), then rotate the admin-set password —
    **M**
14. ☐ Signup page + onboarding (currently login-only) — **M**
15. ☐ Real rate limiting on actions + OAuth routes (Upstash or equivalent; dependency
    approval) — **M**
16. ☐ Meta App Review + Business Verification (start NOW — long lead time) — **L, mostly
    waiting**
17. ☐ Dev/prod Supabase split with distinct keys and a distinct `TOKEN_ENCRYPTION_KEY`;
    reconcile UTM-004 policy shapes during the split — **M**
18. ☐ `TOKEN_ENCRYPTION_KEY` rotation: key-map in `token-crypto.ts` + re-encrypt job +
    written runbook — **M**
19. ☐ Account/data deletion path (tokens, connections, spend history) + retention policy —
    **M**
20. ☐ Enforce CSP (from report-only), add a `Permissions-Policy` — **S**

## 5. Standing rules (carry into every future slice)

- Every new table ships RLS in the same migration; policies use `(select auth.uid())` or
  `is_org_member(org_id)` once orgs exist.
- Server actions: auth check first, Zod-parse second, explicit scope filter third — even
  though RLS also applies. Never RLS-only.
- Token columns never appear in any client-facing select; decryption happens only in
  `src/lib/integrations/connections.ts`.
- OAuth flows: state cookie (httpOnly/secure/lax) + constant-time compare; `redirect_uri`
  from `APP_ORIGIN` only; secrets in POST bodies, never URLs.
- New secrets go in `.env.example` with placeholders; server-only secrets never get a
  `NEXT_PUBLIC_` prefix.
- Money stays integer minor units + explicit currency; platform mapping stays in
  `transforms.ts`.
