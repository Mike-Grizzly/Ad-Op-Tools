-- Platform connections + budget entries (Budget Dashboard, Phase 0+1)
-- Creates the shared ad-platform integration tables. NOT yet applied to any remote
-- project — apply to the working/dev Supabase project before testing.
--
-- Token storage: OAuth tokens are NEVER stored in plaintext. The app encrypts them
-- app-side with AES-256-GCM before insert (see docs/decision-log.md "OAuth Token
-- Encryption"). Access and refresh tokens are encrypted INDEPENDENTLY (different
-- lifetimes/threat models). For each we store ciphertext + a per-encryption random
-- IV (nonce) + the GCM auth tag, all base64-encoded text. (Text + base64 chosen over
-- bytea for supabase-js ergonomics; the base64/12-byte-IV/16-byte-tag contract is
-- enforced in the crypto helper, not the DB.) token_key_id records which
-- TOKEN_ENCRYPTION_KEY version encrypted a row, so the key can be rotated by an
-- incremental background re-encrypt instead of a forced data migration. The key lives
-- only in a server env var, never in the DB. Non-secret fields stay plaintext so they
-- can be queried without decrypting. RLS is defense-in-depth here, not the at-rest
-- protection. Policies use (select auth.uid()) so it is evaluated once, not per row.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.platform_connections (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  platform                 text not null check (platform in ('meta', 'google_ads', 'linkedin', 'tiktok')),
  external_account_id      text not null,
  account_name             text,
  scopes                   text[] not null default '{}',
  token_key_id             text not null default 'v1',
  access_token_ciphertext  text not null,
  access_token_iv          text not null,
  access_token_auth_tag    text not null,
  refresh_token_ciphertext text,
  refresh_token_iv         text,
  refresh_token_auth_tag   text,
  token_expires_at         timestamptz,
  status                   text not null default 'connected'
                             check (status in ('connected', 'expired', 'error', 'revoked')),
  last_synced_at           timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (user_id, platform, external_account_id)
);

comment on column public.platform_connections.access_token_ciphertext is
  'AES-256-GCM ciphertext (base64). Never SELECT without decrypting server-side.';
comment on column public.platform_connections.refresh_token_ciphertext is
  'AES-256-GCM ciphertext (base64). Never SELECT without decrypting server-side.';

create trigger platform_connections_set_updated_at
  before update on public.platform_connections
  for each row execute function public.set_updated_at();

create table if not exists public.budget_entries (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  platform             text not null check (platform in ('meta', 'google_ads', 'linkedin', 'tiktok')),
  external_account_id  text not null,
  campaign_external_id text not null,
  campaign_name        text,
  entry_date           date not null,
  spend_micros         bigint not null,  -- may be negative: platforms report credits/clawbacks
  currency             text not null check (currency ~ '^[A-Z]{3}$'),
  impressions          bigint,
  clicks               bigint,
  created_at           timestamptz not null default now(),
  synced_at            timestamptz not null default now(),
  -- idempotent upsert key: re-syncing a range overwrites, never duplicates
  unique (user_id, platform, external_account_id, campaign_external_id, entry_date)
);

-- Indexes. Each unique constraint already creates a btree index covering its leading
-- columns, so we add only what those don't serve: the dashboard's
-- (user, platform, date-range) filter, and (user, date) for cross-platform ranges.
create index if not exists budget_entries_user_platform_date_idx
  on public.budget_entries(user_id, platform, entry_date desc);
create index if not exists budget_entries_user_date_idx
  on public.budget_entries(user_id, entry_date desc);

-- Row Level Security
alter table public.platform_connections enable row level security;
alter table public.budget_entries enable row level security;

-- platform_connections policies: each user owns their own connections
create policy "users can read own platform_connections"
  on public.platform_connections for select
  using ((select auth.uid()) = user_id);

create policy "users can insert own platform_connections"
  on public.platform_connections for insert
  with check ((select auth.uid()) = user_id);

create policy "users can update own platform_connections"
  on public.platform_connections for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "users can delete own platform_connections"
  on public.platform_connections for delete
  using ((select auth.uid()) = user_id);

-- budget_entries policies: each user owns their own spend rows. insert + update both
-- needed so on-conflict upserts pass RLS. No delete policy: sync is upsert-only, so a
-- user session is not granted the ability to erase spend history (future cleanup, if
-- ever needed, goes through a service-role admin path).
create policy "users can read own budget_entries"
  on public.budget_entries for select
  using ((select auth.uid()) = user_id);

create policy "users can insert own budget_entries"
  on public.budget_entries for insert
  with check ((select auth.uid()) = user_id);

create policy "users can update own budget_entries"
  on public.budget_entries for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
