-- LINK-02/03/04/08 (ADR-32): wiki-link edges are derived from note bodies and
-- reconciled in the same transaction as the note write (04_DATABASE §4.8,
-- 05_API §4). The service parses `[[titles]]` (TypeScript, LINK-01) and passes
-- them in; resolution, reconciliation, rename propagation and dangling-link
-- attachment happen here, atomically with the save. All functions are
-- SECURITY INVOKER with an empty search_path: RLS stays the authorization floor.

-- Save-time title resolution looks notes up by (owner, lower(title)).
create index notes_owner_id_lower_title_idx
  on public.notes (owner_id, lower(title));

-- Escape a literal for use inside a Postgres ARE.
create function public.escape_regex_literal(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.regexp_replace(p_value, '([.^$*+?()\[\]{}|\\-])', '\\\1', 'g');
$$;

-- Replace the outgoing link edges of one note with the edges its current body
-- resolves to. A title resolves to the owner's oldest active note with that
-- title (case-insensitive); unresolved titles and self-links produce no edge.
create function public.reconcile_note_links(
  p_owner_id uuid,
  p_source_object_id uuid,
  p_link_titles text[]
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  resolved_ids uuid[];
begin
  select coalesce(pg_catalog.array_agg(distinct resolved.id), '{}')
  into resolved_ids
  from pg_catalog.unnest(coalesce(p_link_titles, '{}')) as requested(title)
  cross join lateral (
    select notes.knowledge_object_id as id
    from public.notes
    join public.knowledge_objects
      on knowledge_objects.id = notes.knowledge_object_id
    where notes.owner_id = p_owner_id
      and pg_catalog.lower(notes.title) = pg_catalog.lower(pg_catalog.btrim(requested.title))
      and knowledge_objects.deleted_at is null
      and notes.knowledge_object_id <> p_source_object_id
    order by knowledge_objects.created_at, knowledge_objects.id
    limit 1
  ) as resolved;

  delete from public.links
  where links.owner_id = p_owner_id
    and links.source_object_id = p_source_object_id
    and not (links.target_object_id = any (resolved_ids));

  insert into public.links (owner_id, source_object_id, target_object_id)
  select p_owner_id, p_source_object_id, target_id
  from pg_catalog.unnest(resolved_ids) as target_id
  on conflict (source_object_id, target_object_id) do nothing;
end;
$$;

-- Give `p_target_object_id` the inbound edges from active notes whose bodies
-- already contain `[[its title]]` (links written before the note existed —
-- FR-LINK-4 create-on-click). Skipped when an older active note owns the title,
-- since resolution picks the oldest. A source's next save re-reconciles it
-- precisely (e.g. a match inside a code block is dropped then).
create function public.attach_dangling_note_links(
  p_owner_id uuid,
  p_target_object_id uuid
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  target_title text;
  target_created_at timestamptz;
begin
  select notes.title, knowledge_objects.created_at
  into target_title, target_created_at
  from public.notes
  join public.knowledge_objects on knowledge_objects.id = notes.knowledge_object_id
  where notes.knowledge_object_id = p_target_object_id
    and notes.owner_id = p_owner_id
    and knowledge_objects.deleted_at is null;

  if target_title is null or pg_catalog.btrim(target_title) = '' then
    return;
  end if;

  if exists (
    select 1
    from public.notes
    join public.knowledge_objects on knowledge_objects.id = notes.knowledge_object_id
    where notes.owner_id = p_owner_id
      and pg_catalog.lower(notes.title) = pg_catalog.lower(target_title)
      and knowledge_objects.deleted_at is null
      and notes.knowledge_object_id <> p_target_object_id
      and (knowledge_objects.created_at, knowledge_objects.id)
        < (target_created_at, p_target_object_id)
  ) then
    return;
  end if;

  insert into public.links (owner_id, source_object_id, target_object_id)
  select p_owner_id, notes.knowledge_object_id, p_target_object_id
  from public.notes
  join public.knowledge_objects on knowledge_objects.id = notes.knowledge_object_id
  where notes.owner_id = p_owner_id
    and knowledge_objects.deleted_at is null
    and notes.knowledge_object_id <> p_target_object_id
    and notes.body operator(pg_catalog.~*) (
      '\[\[\s*' || public.escape_regex_literal(pg_catalog.btrim(target_title)) || '\s*\]\]'
    )
  on conflict (source_object_id, target_object_id) do nothing;
end;
$$;

-- create_note gains `p_link_titles` (default null = no links) and links the
-- new note both ways: its own outgoing links, and dangling inbound ones.
drop function public.create_note(uuid, text, text, uuid, date);

create function public.create_note(
  p_owner_id uuid,
  p_title text,
  p_body text,
  p_folder_id uuid,
  p_daily_note_date date,
  p_link_titles text[] default null
)
returns table (
  id uuid,
  owner_id uuid,
  title text,
  body text,
  folder_id uuid,
  daily_note_date date,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  created_object public.knowledge_objects%rowtype;
  created_note public.notes%rowtype;
begin
  insert into public.knowledge_objects (owner_id, type, title)
  values (p_owner_id, 'note', p_title)
  returning knowledge_objects.* into created_object;

  insert into public.notes (
    knowledge_object_id,
    owner_id,
    title,
    body,
    folder_id,
    daily_note_date
  )
  values (
    created_object.id,
    created_object.owner_id,
    created_object.title,
    p_body,
    p_folder_id,
    p_daily_note_date
  )
  returning notes.* into created_note;

  perform public.reconcile_note_links(p_owner_id, created_object.id, p_link_titles);
  perform public.attach_dangling_note_links(p_owner_id, created_object.id);

  return query
  select
    created_object.id,
    created_object.owner_id,
    created_object.title,
    created_note.body,
    created_note.folder_id,
    created_note.daily_note_date,
    created_object.created_at,
    created_object.updated_at,
    created_object.deleted_at;
end;
$$;

-- update_note gains `p_link_titles`: when the body is updated, outgoing links
-- are reconciled; when the title changes, `[[old title]]` is rewritten to
-- `[[new title]]` in every active note linking here (FR-NOTE-3, rename
-- propagation) and dangling `[[new title]]` references are attached.
drop function public.update_note(uuid, uuid, text, text, uuid, boolean, boolean, boolean);

create function public.update_note(
  p_owner_id uuid,
  p_knowledge_object_id uuid,
  p_title text,
  p_body text,
  p_folder_id uuid,
  p_update_title boolean,
  p_update_body boolean,
  p_update_folder boolean,
  p_link_titles text[] default null
)
returns table (
  id uuid,
  owner_id uuid,
  title text,
  body text,
  folder_id uuid,
  daily_note_date date,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  previous_title text;
  updated_object public.knowledge_objects%rowtype;
  updated_note public.notes%rowtype;
  old_link_pattern text;
begin
  select knowledge_objects.title
  into previous_title
  from public.knowledge_objects
  where knowledge_objects.id = p_knowledge_object_id
    and knowledge_objects.owner_id = p_owner_id
    and knowledge_objects.type = 'note'
    and knowledge_objects.deleted_at is null
  for update;

  if not found then
    return;
  end if;

  update public.knowledge_objects
  set
    title = case when p_update_title then p_title else knowledge_objects.title end,
    updated_at = pg_catalog.now()
  where knowledge_objects.id = p_knowledge_object_id
    and knowledge_objects.owner_id = p_owner_id
  returning knowledge_objects.* into updated_object;

  update public.notes
  set
    title = case when p_update_title then p_title else notes.title end,
    body = case when p_update_body then p_body else notes.body end,
    folder_id = case when p_update_folder then p_folder_id else notes.folder_id end,
    updated_at = updated_object.updated_at
  where notes.knowledge_object_id = updated_object.id
    and notes.owner_id = p_owner_id
  returning notes.* into updated_note;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Note subtype is missing for its knowledge object';
  end if;

  if p_update_body and p_link_titles is not null then
    perform public.reconcile_note_links(p_owner_id, updated_object.id, p_link_titles);
  end if;

  if p_update_title and previous_title is distinct from p_title then
    old_link_pattern :=
      '\[\[\s*' || public.escape_regex_literal(pg_catalog.btrim(previous_title)) || '\s*\]\]';

    with rewritten as (
      update public.notes
      set
        body = pg_catalog.regexp_replace(
          notes.body,
          old_link_pattern,
          '[[' || pg_catalog.replace(p_title, '\', '\\') || ']]',
          'gi'
        ),
        updated_at = pg_catalog.now()
      from public.links, public.knowledge_objects
      where links.owner_id = p_owner_id
        and links.target_object_id = updated_object.id
        and notes.knowledge_object_id = links.source_object_id
        and notes.owner_id = p_owner_id
        and notes.knowledge_object_id <> updated_object.id
        and knowledge_objects.id = notes.knowledge_object_id
        and knowledge_objects.deleted_at is null
        and notes.body operator(pg_catalog.~*) old_link_pattern
      returning notes.knowledge_object_id
    )
    update public.knowledge_objects
    set updated_at = pg_catalog.now()
    from rewritten
    where knowledge_objects.id = rewritten.knowledge_object_id;

    perform public.attach_dangling_note_links(p_owner_id, updated_object.id);
  end if;

  return query
  select
    updated_object.id,
    updated_object.owner_id,
    updated_object.title,
    updated_note.body,
    updated_note.folder_id,
    updated_note.daily_note_date,
    updated_object.created_at,
    updated_object.updated_at,
    updated_object.deleted_at;
end;
$$;

revoke execute on function public.escape_regex_literal(text) from public, anon, service_role;
revoke execute on function public.reconcile_note_links(uuid, uuid, text[])
  from public, anon, service_role;
revoke execute on function public.attach_dangling_note_links(uuid, uuid)
  from public, anon, service_role;
revoke execute on function public.create_note(uuid, text, text, uuid, date, text[])
  from public, anon, service_role;
revoke execute on function public.update_note(
  uuid, uuid, text, text, uuid, boolean, boolean, boolean, text[]
) from public, anon, service_role;

grant execute on function public.escape_regex_literal(text) to authenticated;
grant execute on function public.reconcile_note_links(uuid, uuid, text[]) to authenticated;
grant execute on function public.attach_dangling_note_links(uuid, uuid) to authenticated;
grant execute on function public.create_note(uuid, text, text, uuid, date, text[])
  to authenticated;
grant execute on function public.update_note(
  uuid, uuid, text, text, uuid, boolean, boolean, boolean, text[]
) to authenticated;
