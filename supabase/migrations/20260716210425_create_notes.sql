create table public.notes (
  knowledge_object_id uuid primary key references public.knowledge_objects (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null default '',
  folder_id uuid references public.folders (id) on delete set null,
  daily_note_date date,
  search_vector tsvector generated always as (
    to_tsvector('english', title || ' ' || body)
  ) stored not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_owner_id_folder_id_idx
  on public.notes (owner_id, folder_id);

create index notes_search_vector_idx
  on public.notes using gin (search_vector);

create unique index notes_owner_id_daily_note_date_idx
  on public.notes (owner_id, daily_note_date)
  where daily_note_date is not null;

alter table public.notes enable row level security;

revoke all on table public.notes from anon, authenticated, service_role;
grant select, insert, update, delete on table public.notes to authenticated, service_role;

create policy "notes_select_own"
  on public.notes
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "notes_insert_own"
  on public.notes
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "notes_update_own"
  on public.notes
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "notes_delete_own"
  on public.notes
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);
