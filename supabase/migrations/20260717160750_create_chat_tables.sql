create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  scope text not null check (scope in ('note', 'vault')),
  note_id uuid references public.knowledge_objects (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb,
  created_at timestamptz not null default now()
);

create index chat_messages_conversation_id_created_at_idx
  on public.chat_messages (conversation_id, created_at);

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

revoke all on table public.chat_conversations from anon, authenticated, service_role;
revoke all on table public.chat_messages from anon, authenticated, service_role;
grant select, insert, update, delete on table public.chat_conversations to authenticated, service_role;
grant select, insert, update, delete on table public.chat_messages to authenticated, service_role;

create policy "chat_conversations_select_own"
  on public.chat_conversations
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "chat_conversations_insert_own"
  on public.chat_conversations
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "chat_conversations_update_own"
  on public.chat_conversations
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "chat_conversations_delete_own"
  on public.chat_conversations
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "chat_messages_select_own"
  on public.chat_messages
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "chat_messages_insert_own"
  on public.chat_messages
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "chat_messages_update_own"
  on public.chat_messages
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "chat_messages_delete_own"
  on public.chat_messages
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);
