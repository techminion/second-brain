create table public.mcp_credentials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  token_hash text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

alter table public.mcp_credentials enable row level security;

revoke all on table public.mcp_credentials from anon, authenticated, service_role;
grant select, insert, update, delete on table public.mcp_credentials to authenticated, service_role;

create policy "mcp_credentials_select_own"
  on public.mcp_credentials
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "mcp_credentials_insert_own"
  on public.mcp_credentials
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "mcp_credentials_update_own"
  on public.mcp_credentials
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "mcp_credentials_delete_own"
  on public.mcp_credentials
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);
