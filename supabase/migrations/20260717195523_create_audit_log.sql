create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  actor text not null check (actor in ('user', 'ai', 'system')),
  action text not null,
  knowledge_object_id uuid references public.knowledge_objects (id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_owner_id_created_at_idx
  on public.audit_log (owner_id, created_at);

alter table public.audit_log enable row level security;

revoke all on table public.audit_log from anon, authenticated, service_role;
grant select, insert on table public.audit_log to authenticated, service_role;

create policy "audit_log_select_own"
  on public.audit_log
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "audit_log_insert_own"
  on public.audit_log
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);
