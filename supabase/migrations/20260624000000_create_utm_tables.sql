-- UTM Generator tables
-- NOTE: these tables already exist on the remote Supabase project (applied manually
-- during initial build). This migration is the authoritative tracked definition.
-- Running `supabase db reset` locally or on a fresh project will recreate them correctly.

create table if not exists public.utm_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  source      text,
  medium      text,
  campaign    text,
  content     text,
  term        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.utm_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  template_id   uuid references public.utm_templates(id) on delete set null,
  base_url      text not null,
  source        text not null,
  medium        text not null,
  campaign      text not null,
  content       text,
  term          text,
  generated_url text not null,
  created_at    timestamptz not null default now()
);

-- Indexes for the common query pattern (user's own rows, newest first)
create index if not exists utm_templates_user_id_idx on public.utm_templates(user_id);
create index if not exists utm_history_user_id_created_idx on public.utm_history(user_id, created_at desc);

-- Row Level Security
alter table public.utm_templates enable row level security;
alter table public.utm_history enable row level security;

-- utm_templates policies: each user owns their own templates
create policy "users can read own utm_templates"
  on public.utm_templates for select
  using (auth.uid() = user_id);

create policy "users can insert own utm_templates"
  on public.utm_templates for insert
  with check (auth.uid() = user_id);

create policy "users can update own utm_templates"
  on public.utm_templates for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own utm_templates"
  on public.utm_templates for delete
  using (auth.uid() = user_id);

-- utm_history policies: each user owns their own history
create policy "users can read own utm_history"
  on public.utm_history for select
  using (auth.uid() = user_id);

create policy "users can insert own utm_history"
  on public.utm_history for insert
  with check (auth.uid() = user_id);

create policy "users can delete own utm_history"
  on public.utm_history for delete
  using (auth.uid() = user_id);
