create table public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  parent_folder_id uuid references public.folders (id) on delete set null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index folders_owner_id_parent_folder_id_idx
  on public.folders (owner_id, parent_folder_id);

alter table public.folders enable row level security;

revoke all on table public.folders from anon, authenticated, service_role;
grant select, insert, update, delete on table public.folders to authenticated, service_role;

create policy "folders_select_own"
  on public.folders
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "folders_insert_own"
  on public.folders
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "folders_update_own"
  on public.folders
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "folders_delete_own"
  on public.folders
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);
