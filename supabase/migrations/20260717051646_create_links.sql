create table public.links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  source_object_id uuid not null references public.knowledge_objects (id) on delete cascade,
  target_object_id uuid not null references public.knowledge_objects (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (source_object_id, target_object_id)
);

create index links_source_object_id_idx
  on public.links (source_object_id);

create index links_target_object_id_idx
  on public.links (target_object_id);

alter table public.links enable row level security;

revoke all on table public.links from anon, authenticated, service_role;
grant select, insert, update, delete on table public.links to authenticated, service_role;

create policy "links_select_own"
  on public.links
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "links_insert_own"
  on public.links
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "links_update_own"
  on public.links
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "links_delete_own"
  on public.links
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);
