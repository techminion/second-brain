create table public.attachments (
  knowledge_object_id uuid primary key references public.knowledge_objects (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);

alter table public.attachments enable row level security;

revoke all on table public.attachments from anon, authenticated, service_role;
grant select, insert, update, delete on table public.attachments to authenticated, service_role;

create policy "attachments_select_own"
  on public.attachments
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "attachments_insert_own"
  on public.attachments
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "attachments_update_own"
  on public.attachments
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "attachments_delete_own"
  on public.attachments
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false);

create policy "attachments_storage_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "attachments_storage_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "attachments_storage_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
