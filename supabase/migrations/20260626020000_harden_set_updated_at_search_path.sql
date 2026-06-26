-- Pin the shared trigger function's search_path (Supabase security advisor 0011,
-- function_search_path_mutable). The body only calls now() (pg_catalog, always
-- resolvable), so an empty search_path is safe and prevents search_path hijacking.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
