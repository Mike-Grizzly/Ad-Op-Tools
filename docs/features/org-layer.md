# Feature Spec — Organization / Workspace Layer

**Status**: In progress (slice started 2026-07-21). Confirmed pre-Phase-2 slice per
ARCH-003 and `docs/architecture-blueprint.md` §3.1 + §3.11.
**Owner decisions (2026-07-21)**: invisible this slice — auto-created personal workspace,
zero UI changes; `docs/design-system.md` ships in the same slice.

## What it is

The multi-tenant foundation: every tenant row belongs to an **organization** rather than
directly to a user. Users belong to orgs via **memberships** (owner/admin/member). Billing
(Stripe, org = paying tenant), teams/invites, shared platform connections, and the entire
product-spec feature set (clients, checklists, naming, monitors) all hang off this layer.

This slice is schema + security + query rewiring only. Each user gets an auto-created
"Personal" org; the app looks and behaves identically on screen.

## Schema (one migration: `20260721000000_create_org_layer.sql`)

- `organizations` — `id`, `name`, `created_at`.
- `organization_members` — `org_id` FK (cascade), `user_id` FK (cascade), `role`
  check `owner|admin|member`, unique `(org_id, user_id)`.
- `audit_log` — append-only: `org_id` FK (cascade), `actor_user_id` FK (**set null** — the
  history must survive user deletion), `action`, `target`, `metadata jsonb`, `created_at`.
  SELECT for org members; INSERT with check (member + self-attribution); no UPDATE/DELETE
  policies = append-only enforced by default-deny. Call sites start in Phase 3.
- `public.is_org_member(org uuid)` — `sql, stable, security definer, search_path = ''`
  (the advisor-0011 hardening pattern from `set_updated_at`). Security definer read of
  `organization_members` is what prevents RLS recursion.
- `public.handle_new_user()` trigger `after insert on auth.users` — creates the personal
  org + owner membership. Trigger-only (no signup page exists; dashboard-provisioned users
  fire it). Backfill DO block covers pre-existing users in the same transaction.
- `org_id uuid not null references organizations` added to `platform_connections`,
  `budget_entries`, `budget_caps`, `utm_templates`, `utm_history`
  (nullable → backfill → not null, one transaction). `user_id` stays as "created by".

### Unique-key decisions

| Table | Key | Rationale |
|---|---|---|
| `platform_connections` | **keep** `(user_id, platform, external_account_id)` | Token AAD is bound to `user_id` (`connections.ts:34`); re-keying breaks decryption of live tokens. Org-level dedupe/adoption = invites-slice concern. |
| `budget_entries` | **change to** `(org_id, platform, external_account_id, campaign_external_id, entry_date)` | Spend rows are facts about an ad account; a user-leading key double-counts when two members sync the same account. `user_id` now = "last synced by". |
| `budget_caps` | **change to** `(org_id, scope)` | Caps are org-level settings; per-user caps would conflict. |
| `utm_templates` / `utm_history` | no tracked change | If recon finds a remote-only `(user_id, name)` unique on templates → replace with `(org_id, name)`. |

### RLS rewrite (5 tenant tables)

Drop all old policies (both the granular tracked names and the consolidated remote
`users manage own utm_*` names — `drop policy if exists` across the union). Create:
SELECT/UPDATE/DELETE `using (public.is_org_member(org_id))`; INSERT
`with check (public.is_org_member(org_id) and (select auth.uid()) = user_id)`
(defense-in-depth self-attribution). UPDATE deliberately does not require self — org
members edit shared rows. `budget_entries` keeps **no** delete policy (upsert-only design).
Indexes move from user-leading to org-leading.

## Code changes

- **`src/features/org/queries.ts`** (only file in the module this slice —
  `actions.ts`/`validation.ts` would be speculative): `getOrgContext()` returning
  `{ supabase, userId, orgId } | null` (null = unauthenticated; authenticated with zero
  memberships = loud throw; multi-membership = oldest, until an active-org cookie ships
  with the switcher). Collapses the ~15 copy-pasted auth blocks.
- **`connections.ts`**: org-scoped row lookups; decrypt-path AAD computed from the row's
  stored `user_id` (not the caller) so future teammates can decrypt org-shared
  connections; save-path AAD unchanged (creator-bound).
- **`budget/actions.ts`**: upsert rows gain `org_id`; onConflict strings switch to the new
  org-leading keys; deletes/updates filter by org.
- **`budget/queries.ts` + `utm/queries.ts` + `utm/actions.ts`**: org scoping throughout;
  UTM queries switch from `return []` to `throw 'Unauthorized'` on no user (SEC-002
  contract alignment — the dashboard layout already guarantees auth).
- **`src/types/database.ts`**: 3 new tables, `org_id` on 5 tables, `is_org_member` in
  `Functions`.
- **Untouched**: middleware, layouts, OAuth routes, auth callback, all UI.

## Non-goals (later slices)

- Invites, member management, org rename/settings, org switcher UI.
- Org-level connection dedupe/adoption (flagged: `maybeSingle()` on connection lookup
  assumes ≤1 row per (org, platform, account) access path).
- `logAudit()` helper + call sites (Phase 3, with the first write-path feature).
- Re-keying token AAD to org (only if/when connection ownership transfer is needed).

## Verification checklist

- [ ] database-reviewer + security-reviewer on the migration; code/typescript reviewers on the diff
- [ ] type-check / lint / test (13 existing) / build all green
- [ ] Migration applied to `ad-op-tools` back-to-back with deploy (deploy-window: old
      code inserts fail once org_id is NOT NULL; reads unaffected)
- [ ] Post-apply probes: backfill complete (`org_id is null` = 0 everywhere, row counts
      unchanged), policy set exact, cross-tenant denial probe (random JWT sub sees 0 rows),
      advisors clean
- [ ] Manual production verification: UTM generate/edit/delete/template; Budget renders;
      caps edit; **Sync now against the real Meta connection (proves token decryption
      survived)**. `disconnectPlatform` verified by review only (destructive vs the only
      real connection).

## Test results

_(to be filled at closeout)_
