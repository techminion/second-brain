create table public.knowledge_objects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  type text not null constraint knowledge_objects_type_check check (type in ('note', 'attachment')),
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index knowledge_objects_owner_id_deleted_at_idx
  on public.knowledge_objects (owner_id, deleted_at);

create index knowledge_objects_owner_id_type_idx
  on public.knowledge_objects (owner_id, type);

alter table public.knowledge_objects enable row level security;

revoke all on table public.knowledge_objects from anon;
grant select, insert, update, delete on table public.knowledge_objects to authenticated, service_role;

create policy "knowledge_objects_select_own"
  on public.knowledge_objects
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "knowledge_objects_insert_own"
  on public.knowledge_objects
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "knowledge_objects_update_own"
  on public.knowledge_objects
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "knowledge_objects_delete_own"
  on public.knowledge_objects
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);
