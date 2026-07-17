create table public.tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index tags_owner_id_lower_name_idx
  on public.tags (owner_id, lower(name));

alter table public.tags enable row level security;

revoke all on table public.tags from anon, authenticated, service_role;
grant select, insert, update, delete on table public.tags to authenticated, service_role;

create policy "tags_select_own"
  on public.tags
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "tags_insert_own"
  on public.tags
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "tags_update_own"
  on public.tags
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "tags_delete_own"
  on public.tags
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create table public.knowledge_object_tags (
  knowledge_object_id uuid not null references public.knowledge_objects (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (knowledge_object_id, tag_id)
);

create index knowledge_object_tags_tag_id_owner_id_idx
  on public.knowledge_object_tags (tag_id, owner_id);

alter table public.knowledge_object_tags enable row level security;

revoke all on table public.knowledge_object_tags from anon, authenticated, service_role;
grant select, insert, update, delete on table public.knowledge_object_tags
  to authenticated, service_role;

create policy "knowledge_object_tags_select_own"
  on public.knowledge_object_tags
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "knowledge_object_tags_insert_own"
  on public.knowledge_object_tags
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "knowledge_object_tags_update_own"
  on public.knowledge_object_tags
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "knowledge_object_tags_delete_own"
  on public.knowledge_object_tags
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);
