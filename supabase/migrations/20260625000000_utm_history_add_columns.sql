-- Add ad_set and creative columns to utm_history
-- These support per-ad granularity in the UTM spreadsheet view.
-- ad_set maps to utm_adset, creative maps to utm_creative in the generated URL.

alter table public.utm_history
  add column if not exists ad_set   text,
  add column if not exists creative text;

-- Indexes for prefix-search autocomplete (campaign and base_url fields).
-- text_pattern_ops makes LIKE 'prefix%' queries use the B-tree index even in
-- non-C locale databases.
create index if not exists utm_history_campaign_prefix_idx
  on public.utm_history (user_id, campaign text_pattern_ops);

create index if not exists utm_history_base_url_prefix_idx
  on public.utm_history (user_id, base_url text_pattern_ops);
