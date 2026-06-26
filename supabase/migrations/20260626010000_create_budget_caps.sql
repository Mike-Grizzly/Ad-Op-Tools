-- Monthly spend caps for the Budget Dashboard (replaces the Excel monthly-cap sheet).
-- One row per user per scope: scope 'overall' is the total cap; a platform value (e.g. 'meta')
-- is a per-platform cap. amount_micros uses the same integer-micros unit as budget_entries.spend_micros
-- so pacing compares directly. Runs after 20260626000000_create_platform_connections_and_budget.sql,
-- which defines public.set_updated_at().

create table if not exists public.budget_caps (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  scope         text not null check (scope in ('overall', 'meta', 'google_ads', 'linkedin', 'tiktok')),
  amount_micros bigint not null check (amount_micros >= 0),  -- non-negative; contrast budget_entries.spend_micros, which allows negatives for credits
  currency      text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, scope)
);

create trigger budget_caps_set_updated_at
  before update on public.budget_caps
  for each row execute function public.set_updated_at();

alter table public.budget_caps enable row level security;

create policy "users can read own budget_caps"
  on public.budget_caps for select
  using ((select auth.uid()) = user_id);

create policy "users can insert own budget_caps"
  on public.budget_caps for insert
  with check ((select auth.uid()) = user_id);

create policy "users can update own budget_caps"
  on public.budget_caps for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "users can delete own budget_caps"
  on public.budget_caps for delete
  using ((select auth.uid()) = user_id);
