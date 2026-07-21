-- Organization / workspace layer (blueprint §3.1) + audit_log (§3.11).
-- One transaction: new tables → is_org_member helper → signup trigger → backfill →
-- org_id on the 5 tenant tables (nullable → backfill → not null) → unique-key and
-- index changes → RLS rewrite from user-scope to org-membership.
--
-- Every statement is idempotent so a partial apply can be re-run safely.
--
-- Policy drops cover BOTH naming lineages: the granular tracked names
-- ("users can <verb> own <table>") and the consolidated policies the remote project
-- was hand-provisioned with ("users manage own utm_*") — see docs/open-questions.md
-- UTM-004. After this migration, tracked and remote policy shapes converge.
--
-- platform_connections keeps its (user_id, platform, external_account_id) unique key:
-- the AES-GCM AAD binds each token ciphertext to its owner's user_id, so connection
-- rows stay creator-owned at the crypto layer (decrypt derives AAD from the row's
-- user_id). budget_entries/budget_caps re-key to org: spend rows are facts about an
-- ad account (user-leading keys would double-count once two members sync the same
-- account) and caps are org-level settings.

-- Bound the ACCESS EXCLUSIVE locks this migration takes on live tables: fail fast
-- and visibly if another session holds a lock, instead of queueing an outage.
set local lock_timeout = '5s';
set local statement_timeout = '5min';

-- 1. New tables ---------------------------------------------------------------

create table if not exists public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- Composite: getOrgContext()'s hot path filters by user_id and sorts by created_at.
create index if not exists organization_members_user_id_created_idx
  on public.organization_members(user_id, created_at);

-- Append-only. actor_user_id is nullable ON DELETE SET NULL: the audit trail must
-- survive the deletion of the user who acted. org deletion removes the whole tenancy,
-- so org_id cascades.
create table if not exists public.audit_log (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action        text not null,
  target        text,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists audit_log_org_created_idx
  on public.audit_log(org_id, created_at desc);
create index if not exists audit_log_actor_user_id_idx
  on public.audit_log(actor_user_id);

-- 2. Membership helper --------------------------------------------------------
-- SECURITY DEFINER reads organization_members bypassing its RLS — that is what
-- prevents recursion when policies on organization_members itself call this.
-- Empty search_path (advisor 0011): every reference must be schema-qualified.

create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.org_id = org
      and m.user_id = (select auth.uid())
  );
$$;

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default; revoking from a named role
-- alone would be a no-op. Policies evaluate as `authenticated`, which therefore
-- needs an explicit grant (SECURITY DEFINER still requires the caller to hold EXECUTE).
revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;

-- 3. Personal-org creation on signup ------------------------------------------
-- There is no signup page; users are provisioned via the Supabase dashboard, which
-- inserts into auth.users and fires this trigger.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org uuid;
begin
  insert into public.organizations (name) values ('Personal') returning id into new_org;
  insert into public.organization_members (org_id, user_id, role)
    values (new_org, new.id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Backfill personal orgs for users that predate the trigger ------------------

do $$
declare
  u record;
  new_org uuid;
begin
  for u in
    select id from auth.users au
    where not exists (
      select 1 from public.organization_members m where m.user_id = au.id
    )
  loop
    insert into public.organizations (name) values ('Personal') returning id into new_org;
    insert into public.organization_members (org_id, user_id, role)
      values (new_org, u.id, 'owner');
  end loop;
end $$;

-- 5. RLS on the new tables ----------------------------------------------------
-- Default-deny for everything not listed: org/membership writes go only through the
-- SECURITY DEFINER trigger this slice (invites/renames get their own policies later),
-- and audit_log gets no UPDATE/DELETE — append-only is enforced by omission.

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists "members can read own organizations" on public.organizations;
create policy "members can read own organizations"
  on public.organizations for select
  using (public.is_org_member(id));

drop policy if exists "members can read own org memberships" on public.organization_members;
create policy "members can read own org memberships"
  on public.organization_members for select
  using (public.is_org_member(org_id));

drop policy if exists "members can read own org audit_log" on public.audit_log;
create policy "members can read own org audit_log"
  on public.audit_log for select
  using (public.is_org_member(org_id));

-- INSERT policy exists now (not Phase 3) so the first logAudit call site works from
-- a session client without another migration.
drop policy if exists "members can insert audit entries as themselves" on public.audit_log;
create policy "members can insert audit entries as themselves"
  on public.audit_log for insert
  with check (public.is_org_member(org_id) and actor_user_id = (select auth.uid()));

-- 6. org_id on the 5 tenant tables: add nullable → backfill → not null ----------
-- Safe in one transaction; each user has exactly one membership at this point.
-- Deliberately NO "on delete" action (default NO ACTION): an org that still owns
-- tenant rows cannot be deleted — data is protected; cleanup must be explicit.
-- (Contrast organization_members/audit_log, which cascade with their org.)

alter table public.platform_connections
  add column if not exists org_id uuid references public.organizations(id);
alter table public.budget_entries
  add column if not exists org_id uuid references public.organizations(id);
alter table public.budget_caps
  add column if not exists org_id uuid references public.organizations(id);
alter table public.utm_templates
  add column if not exists org_id uuid references public.organizations(id);
alter table public.utm_history
  add column if not exists org_id uuid references public.organizations(id);

update public.platform_connections t
  set org_id = m.org_id from public.organization_members m
  where m.user_id = t.user_id and t.org_id is null;
update public.budget_entries t
  set org_id = m.org_id from public.organization_members m
  where m.user_id = t.user_id and t.org_id is null;
update public.budget_caps t
  set org_id = m.org_id from public.organization_members m
  where m.user_id = t.user_id and t.org_id is null;
update public.utm_templates t
  set org_id = m.org_id from public.organization_members m
  where m.user_id = t.user_id and t.org_id is null;
update public.utm_history t
  set org_id = m.org_id from public.organization_members m
  where m.user_id = t.user_id and t.org_id is null;

alter table public.platform_connections alter column org_id set not null;
alter table public.budget_entries alter column org_id set not null;
alter table public.budget_caps alter column org_id set not null;
alter table public.utm_templates alter column org_id set not null;
alter table public.utm_history alter column org_id set not null;

-- 7. Unique-key changes -------------------------------------------------------
-- Constraints were created unnamed, so their auto-generated (possibly truncated)
-- names are discovered from the catalog instead of hardcoded.

do $$
declare
  c record;
begin
  -- budget_entries: (user_id, platform, external_account_id, campaign_external_id,
  -- entry_date) → (org_id, ...). user_id stays as "last synced by".
  select conname into c
  from pg_constraint
  where conrelid = 'public.budget_entries'::regclass
    and contype = 'u'
    and (
      select array_agg(a.attname::text order by a.attname)
      from unnest(conkey) k
      join pg_attribute a on a.attrelid = conrelid and a.attnum = k
    ) = array['campaign_external_id','entry_date','external_account_id','platform','user_id'];
  if found then
    execute format('alter table public.budget_entries drop constraint %I', c.conname);
  end if;

  -- budget_caps: (user_id, scope) → (org_id, scope). A cap is an org-level setting.
  select conname into c
  from pg_constraint
  where conrelid = 'public.budget_caps'::regclass
    and contype = 'u'
    and (
      select array_agg(a.attname::text order by a.attname)
      from unnest(conkey) k
      join pg_attribute a on a.attrelid = conrelid and a.attnum = k
    ) = array['scope','user_id'];
  if found then
    execute format('alter table public.budget_caps drop constraint %I', c.conname);
  end if;
end $$;

alter table public.budget_entries
  drop constraint if exists budget_entries_org_upsert_key;
alter table public.budget_entries
  add constraint budget_entries_org_upsert_key
  unique (org_id, platform, external_account_id, campaign_external_id, entry_date);

alter table public.budget_caps
  drop constraint if exists budget_caps_org_scope_key;
alter table public.budget_caps
  add constraint budget_caps_org_scope_key
  unique (org_id, scope);

-- platform_connections keeps unique (user_id, platform, external_account_id) — see
-- header comment (token AAD is user-bound).

-- 8. Index changes: user-leading query indexes → org-leading --------------------
-- The new unique constraints already provide org-leading btree indexes for
-- budget_entries and budget_caps upsert paths.

drop index if exists public.budget_entries_user_platform_date_idx;
drop index if exists public.budget_entries_user_date_idx;
drop index if exists public.utm_history_user_id_created_idx;
drop index if exists public.utm_history_campaign_prefix_idx;
drop index if exists public.utm_history_base_url_prefix_idx;

create index if not exists budget_entries_org_platform_date_idx
  on public.budget_entries(org_id, platform, entry_date desc);
create index if not exists budget_entries_org_date_idx
  on public.budget_entries(org_id, entry_date desc);
create index if not exists utm_templates_org_id_idx
  on public.utm_templates(org_id);
create index if not exists utm_history_org_id_created_idx
  on public.utm_history(org_id, created_at desc);
create index if not exists utm_history_campaign_prefix_idx
  on public.utm_history(org_id, campaign text_pattern_ops);
create index if not exists utm_history_base_url_prefix_idx
  on public.utm_history(org_id, base_url text_pattern_ops);
create index if not exists platform_connections_org_id_idx
  on public.platform_connections(org_id);

-- user_id is still an FK to auth.users on every tenant table; keep it index-covered
-- after the org-leading rewrite (ON DELETE CASCADE from auth.users scans these).
-- platform_connections keeps coverage via its user-leading unique key.
-- (utm_templates_user_id_idx already exists from the original UTM migration and is kept.)
create index if not exists budget_entries_user_id_idx on public.budget_entries(user_id);
create index if not exists budget_caps_user_id_idx on public.budget_caps(user_id);
create index if not exists utm_history_user_id_idx on public.utm_history(user_id);

-- 8b. Tenant-binding immutability ----------------------------------------------
-- The org-scoped UPDATE policies (below) can't pin a column to its pre-update value
-- (WITH CHECK sees only the new row), so a member of two orgs could otherwise move a
-- row between their orgs, and platform_connections.user_id — the AES-GCM AAD anchor —
-- could drift and brick a stored token. Enforce immutability with triggers instead:
-- org_id is frozen on all 5 tenant tables; user_id is frozen where it is a
-- crypto/attribution key (platform_connections, utm_templates, utm_history) but stays
-- mutable on budget_entries/budget_caps, where upserts overwrite it by design
-- ("last synced by" / "set by").

create or replace function public.prevent_tenant_rebinding()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.org_id is distinct from old.org_id then
    raise exception 'org_id is immutable';
  end if;
  if tg_argv[0] = 'pin_user' and new.user_id is distinct from old.user_id then
    raise exception 'user_id is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists platform_connections_pin_tenant on public.platform_connections;
create trigger platform_connections_pin_tenant
  before update on public.platform_connections
  for each row execute function public.prevent_tenant_rebinding('pin_user');

drop trigger if exists utm_templates_pin_tenant on public.utm_templates;
create trigger utm_templates_pin_tenant
  before update on public.utm_templates
  for each row execute function public.prevent_tenant_rebinding('pin_user');

drop trigger if exists utm_history_pin_tenant on public.utm_history;
create trigger utm_history_pin_tenant
  before update on public.utm_history
  for each row execute function public.prevent_tenant_rebinding('pin_user');

drop trigger if exists budget_entries_pin_tenant on public.budget_entries;
create trigger budget_entries_pin_tenant
  before update on public.budget_entries
  for each row execute function public.prevent_tenant_rebinding();

drop trigger if exists budget_caps_pin_tenant on public.budget_caps;
create trigger budget_caps_pin_tenant
  before update on public.budget_caps
  for each row execute function public.prevent_tenant_rebinding();

-- 9. RLS rewrite on the 5 tenant tables ---------------------------------------
-- SELECT/UPDATE/DELETE: any org member. INSERT additionally requires
-- user_id = auth.uid() (defense in depth: rows can only be attributed to their
-- creator). UPDATE deliberately does NOT require self — org members edit shared rows,
-- and the budget_entries upsert must be able to overwrite rows another member synced.
-- budget_entries keeps NO delete policy (sync is upsert-only by design).

-- platform_connections
drop policy if exists "users can read own platform_connections" on public.platform_connections;
drop policy if exists "users can insert own platform_connections" on public.platform_connections;
drop policy if exists "users can update own platform_connections" on public.platform_connections;
drop policy if exists "users can delete own platform_connections" on public.platform_connections;
drop policy if exists "users manage own platform_connections" on public.platform_connections;
drop policy if exists "org members can read platform_connections" on public.platform_connections;
create policy "org members can read platform_connections"
  on public.platform_connections for select
  using (public.is_org_member(org_id));
drop policy if exists "org members can insert platform_connections" on public.platform_connections;
create policy "org members can insert platform_connections"
  on public.platform_connections for insert
  with check (public.is_org_member(org_id) and (select auth.uid()) = user_id);
drop policy if exists "org members can update platform_connections" on public.platform_connections;
create policy "org members can update platform_connections"
  on public.platform_connections for update
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
drop policy if exists "org members can delete platform_connections" on public.platform_connections;
create policy "org members can delete platform_connections"
  on public.platform_connections for delete
  using (public.is_org_member(org_id));

-- budget_entries (no delete policy, unchanged by design)
drop policy if exists "users can read own budget_entries" on public.budget_entries;
drop policy if exists "users can insert own budget_entries" on public.budget_entries;
drop policy if exists "users can update own budget_entries" on public.budget_entries;
drop policy if exists "users manage own budget_entries" on public.budget_entries;
drop policy if exists "org members can read budget_entries" on public.budget_entries;
create policy "org members can read budget_entries"
  on public.budget_entries for select
  using (public.is_org_member(org_id));
drop policy if exists "org members can insert budget_entries" on public.budget_entries;
create policy "org members can insert budget_entries"
  on public.budget_entries for insert
  with check (public.is_org_member(org_id) and (select auth.uid()) = user_id);
-- user_id stays mutable here by design ("last synced by") but must remain a member
-- of the row's org — blocks attributing spend rows to arbitrary auth.users ids.
drop policy if exists "org members can update budget_entries" on public.budget_entries;
create policy "org members can update budget_entries"
  on public.budget_entries for update
  using (public.is_org_member(org_id))
  with check (
    public.is_org_member(org_id)
    and exists (
      select 1 from public.organization_members m
      where m.org_id = budget_entries.org_id and m.user_id = budget_entries.user_id
    )
  );

-- budget_caps
drop policy if exists "users can read own budget_caps" on public.budget_caps;
drop policy if exists "users can insert own budget_caps" on public.budget_caps;
drop policy if exists "users can update own budget_caps" on public.budget_caps;
drop policy if exists "users can delete own budget_caps" on public.budget_caps;
drop policy if exists "users manage own budget_caps" on public.budget_caps;
drop policy if exists "org members can read budget_caps" on public.budget_caps;
create policy "org members can read budget_caps"
  on public.budget_caps for select
  using (public.is_org_member(org_id));
drop policy if exists "org members can insert budget_caps" on public.budget_caps;
create policy "org members can insert budget_caps"
  on public.budget_caps for insert
  with check (public.is_org_member(org_id) and (select auth.uid()) = user_id);
-- user_id stays mutable here by design ("set by") but must remain a member of the org.
drop policy if exists "org members can update budget_caps" on public.budget_caps;
create policy "org members can update budget_caps"
  on public.budget_caps for update
  using (public.is_org_member(org_id))
  with check (
    public.is_org_member(org_id)
    and exists (
      select 1 from public.organization_members m
      where m.org_id = budget_caps.org_id and m.user_id = budget_caps.user_id
    )
  );
drop policy if exists "org members can delete budget_caps" on public.budget_caps;
create policy "org members can delete budget_caps"
  on public.budget_caps for delete
  using (public.is_org_member(org_id));

-- utm_templates
drop policy if exists "users can read own utm_templates" on public.utm_templates;
drop policy if exists "users can insert own utm_templates" on public.utm_templates;
drop policy if exists "users can update own utm_templates" on public.utm_templates;
drop policy if exists "users can delete own utm_templates" on public.utm_templates;
drop policy if exists "users manage own utm_templates" on public.utm_templates;
drop policy if exists "org members can read utm_templates" on public.utm_templates;
create policy "org members can read utm_templates"
  on public.utm_templates for select
  using (public.is_org_member(org_id));
drop policy if exists "org members can insert utm_templates" on public.utm_templates;
create policy "org members can insert utm_templates"
  on public.utm_templates for insert
  with check (public.is_org_member(org_id) and (select auth.uid()) = user_id);
drop policy if exists "org members can update utm_templates" on public.utm_templates;
create policy "org members can update utm_templates"
  on public.utm_templates for update
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
drop policy if exists "org members can delete utm_templates" on public.utm_templates;
create policy "org members can delete utm_templates"
  on public.utm_templates for delete
  using (public.is_org_member(org_id));

-- utm_history
drop policy if exists "users can read own utm_history" on public.utm_history;
drop policy if exists "users can insert own utm_history" on public.utm_history;
drop policy if exists "users can update own utm_history" on public.utm_history;
drop policy if exists "users can delete own utm_history" on public.utm_history;
drop policy if exists "users manage own utm_history" on public.utm_history;
drop policy if exists "org members can read utm_history" on public.utm_history;
create policy "org members can read utm_history"
  on public.utm_history for select
  using (public.is_org_member(org_id));
drop policy if exists "org members can insert utm_history" on public.utm_history;
create policy "org members can insert utm_history"
  on public.utm_history for insert
  with check (public.is_org_member(org_id) and (select auth.uid()) = user_id);
drop policy if exists "org members can update utm_history" on public.utm_history;
create policy "org members can update utm_history"
  on public.utm_history for update
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
drop policy if exists "org members can delete utm_history" on public.utm_history;
create policy "org members can delete utm_history"
  on public.utm_history for delete
  using (public.is_org_member(org_id));
