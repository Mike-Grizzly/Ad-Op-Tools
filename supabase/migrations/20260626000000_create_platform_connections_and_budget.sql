-- Platform connections + budget entries (Budget Dashboard, Phase 0+1)
-- Creates the shared ad-platform integration tables. NOT yet applied to any remote
-- project — apply to the working/dev Supabase project before testing.
--
-- Token storage: OAuth access/refresh tokens are NEVER stored in plaintext. The app
-- encrypts them with AES-256-GCM before insert (see docs/decision-log.md "OAuth Token
-- Encryption"). We persist the ciphertext plus the GCM nonce (token_iv) and auth tag
-- (token_auth_tag); the key lives only in a server-side env var (TOKEN_ENCRYPTION_KEY),
-- never in the DB. Non-secret fields (account id, scopes, expiry, status) stay plaintext
-- so they can be queried without decrypting. RLS is necessary but does NOT encrypt bytes,
-- so here it is defense-in-depth, not the at-rest protection.

create table if not exists public.platform_connections (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  platform            text not null check (platform in ('meta', 'google_ads', 'linkedin', 'tiktok')),
  external_account_id text,
  account_name        text,
  scopes              text[] not null default '{}',
  token_ciphertext    text not null,
  token_iv            text not null,
  token_auth_tag      text not null,
  token_expires_at    timestamptz,
  status              text not null default 'connected'
                        check (status in ('connected', 'expired', 'error', 'revoked')),
  last_synced_at      timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, platform, external_account_id)
);

create table if not exists public.budget_entries (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  platform             text not null check (platform in ('meta', 'google_ads', 'linkedin', 'tiktok')),
  account_id           text not null,
  campaign_external_id text not null,
  campaign_name        text,
  entry_date           date not null,
  spend_micros         bigint not null,
  currency             text not null,
  impressions          bigint,
  clicks               bigint,
  synced_at            timestamptz not null default now(),
  -- idempotent upsert key: re-syncing a range overwrites, never duplicates
  unique (user_id, platform, account_id, campaign_external_id, entry_date)
);

-- Indexes for the common query patterns (a user's own rows; dashboard date/platform views)
create index if not exists platform_connections_user_idx on public.platform_connections(user_id, platform);
create index if not exists budget_entries_user_date_idx on public.budget_entries(user_id, entry_date desc);
create index if not exists budget_entries_user_platform_idx on public.budget_entries(user_id, platform);

-- Row Level Security
alter table public.platform_connections enable row level security;
alter table public.budget_entries enable row level security;

-- platform_connections policies: each user owns their own connections
create policy "users can read own platform_connections"
  on public.platform_connections for select
  using (auth.uid() = user_id);

create policy "users can insert own platform_connections"
  on public.platform_connections for insert
  with check (auth.uid() = user_id);

create policy "users can update own platform_connections"
  on public.platform_connections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own platform_connections"
  on public.platform_connections for delete
  using (auth.uid() = user_id);

-- budget_entries policies: each user owns their own spend rows
-- (insert + update both needed so on-conflict upserts pass RLS)
create policy "users can read own budget_entries"
  on public.budget_entries for select
  using (auth.uid() = user_id);

create policy "users can insert own budget_entries"
  on public.budget_entries for insert
  with check (auth.uid() = user_id);

create policy "users can update own budget_entries"
  on public.budget_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own budget_entries"
  on public.budget_entries for delete
  using (auth.uid() = user_id);
