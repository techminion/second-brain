revoke all on table public.profiles from anon, authenticated, service_role;
grant select, update on table public.profiles to authenticated, service_role;
