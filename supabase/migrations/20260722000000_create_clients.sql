-- Clients (book of business) — org-scoped client rows + per-platform budget overrides
-- + ad-account→client assignment. See docs/features/clients.md.
--
-- ADDITIVE-ONLY: two new tables, one nullable column, indexes. No existing policy,
-- constraint, or column is touched, so deployed pre-clients code is unaffected and the
-- migration can be applied ahead of the code deploy with no write-failure window.
--
-- Same-org referential integrity uses the composite-FK trick instead of validation
-- triggers: clients carries unique (org_id, id), and both client_platforms and
-- platform_connections reference (org_id, client_id) → clients(org_id, id). Because
-- org_id is frozen everywhere by prevent_tenant_rebinding, the pair can never drift,
-- so "the assigned client belongs to this row's org" is a declarative constraint.
--
-- platform_connections.client_id uses ON DELETE SET NULL (client_id) — the column-list
-- form (PostgreSQL 15+; the live project runs PG 17). Plain SET NULL would try to null
-- org_id too, which is NOT NULL. Deleting a client therefore detaches its ad accounts
-- (client_id → null) and cascades its override rows; spend history is untouched.

set local lock_timeout = '5s';
set local statement_timeout = '5min';

-- 1. clients ------------------------------------------------------------------

create table if not exists public.clients (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references public.organizations(id),
  user_id               uuid not null references auth.users(id) on delete cascade,
  name                  text not null check (btrim(name) <> ''),
  -- Nullable: a client can exist before a budget is set (card shows "No budget").
  monthly_budget_micros bigint check (monthly_budget_micros >= 0),
  -- 1..28 sidesteps Feb/short-month edge cases entirely.
  budget_reset_day      int not null default 1 check (budget_reset_day between 1 and 28),
  currency              text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- Composite-FK target for same-org enforcement on referencing tables.
  unique (org_id, id)
);

-- No separate org_id index: unique (org_id, id) below already provides an
-- org_id-leading btree (database-reviewer finding).
create index if not exists clients_user_id_idx on public.clients(user_id);

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists clients_pin_tenant on public.clients;
create trigger clients_pin_tenant
  before update on public.clients
  for each row execute function public.prevent_tenant_rebinding('pin_user');

alter table public.clients enable row level security;

drop policy if exists "org members can read clients" on public.clients;
create policy "org members can read clients"
  on public.clients for select
  using (public.is_org_member(org_id));
drop policy if exists "org members can insert clients" on public.clients;
create policy "org members can insert clients"
  on public.clients for insert
  with check (public.is_org_member(org_id) and (select auth.uid()) = user_id);
drop policy if exists "org members can update clients" on public.clients;
create policy "org members can update clients"
  on public.clients for update
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
drop policy if exists "org members can delete clients" on public.clients;
create policy "org members can delete clients"
  on public.clients for delete
  using (public.is_org_member(org_id));

-- 2. client_platforms (per-platform monthly budget overrides) -------------------
-- A row exists iff an override exists, so the amount is NOT NULL.
-- No user_id: child settings row — attribution lives on the parent client.

create table if not exists public.client_platforms (
  id                             uuid primary key default gen_random_uuid(),
  org_id                         uuid not null references public.organizations(id),
  client_id                      uuid not null,
  platform                       text not null check (platform in ('meta', 'google_ads', 'linkedin', 'tiktok')),
  monthly_budget_override_micros bigint not null check (monthly_budget_override_micros >= 0),
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),
  unique (client_id, platform),
  foreign key (org_id, client_id) references public.clients(org_id, id) on delete cascade
);

create index if not exists client_platforms_org_id_idx on public.client_platforms(org_id);

drop trigger if exists client_platforms_set_updated_at on public.client_platforms;
create trigger client_platforms_set_updated_at
  before update on public.client_platforms
  for each row execute function public.set_updated_at();

drop trigger if exists client_platforms_pin_tenant on public.client_platforms;
create trigger client_platforms_pin_tenant
  before update on public.client_platforms
  for each row execute function public.prevent_tenant_rebinding();

alter table public.client_platforms enable row level security;

drop policy if exists "org members can read client_platforms" on public.client_platforms;
create policy "org members can read client_platforms"
  on public.client_platforms for select
  using (public.is_org_member(org_id));
drop policy if exists "org members can insert client_platforms" on public.client_platforms;
create policy "org members can insert client_platforms"
  on public.client_platforms for insert
  with check (public.is_org_member(org_id));
drop policy if exists "org members can update client_platforms" on public.client_platforms;
create policy "org members can update client_platforms"
  on public.client_platforms for update
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
drop policy if exists "org members can delete client_platforms" on public.client_platforms;
create policy "org members can delete client_platforms"
  on public.client_platforms for delete
  using (public.is_org_member(org_id));

-- 3. Ad-account → client assignment ---------------------------------------------

alter table public.platform_connections
  add column if not exists client_id uuid;

alter table public.platform_connections
  drop constraint if exists platform_connections_client_fk;
alter table public.platform_connections
  add constraint platform_connections_client_fk
  foreign key (org_id, client_id) references public.clients(org_id, id)
  on delete set null (client_id);

create index if not exists platform_connections_client_id_idx
  on public.platform_connections(client_id);
