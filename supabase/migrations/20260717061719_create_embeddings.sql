create extension if not exists vector with schema extensions;

create table public.embeddings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  knowledge_object_id uuid not null references public.knowledge_objects (id) on delete cascade,
  chunk_index integer not null,
  chunk_text text not null,
  embedding extensions.vector(1536) not null,
  created_at timestamptz not null default now(),
  unique (knowledge_object_id, chunk_index)
);

create index embeddings_embedding_hnsw_idx
  on public.embeddings using hnsw (embedding vector_cosine_ops);

alter table public.embeddings enable row level security;

revoke all on table public.embeddings from anon, authenticated, service_role;
grant select, insert, update, delete on table public.embeddings to authenticated, service_role;

create policy "embeddings_select_own"
  on public.embeddings
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "embeddings_insert_own"
  on public.embeddings
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "embeddings_update_own"
  on public.embeddings
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "embeddings_delete_own"
  on public.embeddings
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);
