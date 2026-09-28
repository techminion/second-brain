-- NOTE-13 (ADR-35): every note mutation writes its audit_log row (04_DATABASE
-- §8) in the same transaction as the mutation, inside the note RPCs, with an
-- explicit actor. create_note / update_note gain `p_actor`; soft delete and
-- restore move from plain table updates into delete_note / restore_note so
-- they can audit atomically too. Metadata is small and structural — the
-- names of the fields that changed, never content. Rename propagation's
-- rewrites of *other* notes are recorded as actor 'system', with the renamed
-- note as their cause. All functions stay SECURITY INVOKER with an empty
-- search_path: RLS (audit_log_insert_own) remains the authorization floor.

-- Shared audit writer, called by the note RPCs as the invoking user. It is
-- executable by `authenticated` because a SECURITY INVOKER caller needs that;
-- this grants nothing new — audit_log_insert_own already lets a user insert
-- their own rows directly, and RLS still binds owner_id to auth.uid().
create function public.write_note_audit(
  p_owner_id uuid,
  p_actor text,
  p_action text,
  p_knowledge_object_id uuid,
  p_fields text[],
  p_extra jsonb default null
)
returns void
language sql
volatile
security invoker
set search_path = ''
as $$
  insert into public.audit_log (owner_id, actor, action, knowledge_object_id, metadata)
  values (
    p_owner_id,
    p_actor,
    p_action,
    p_knowledge_object_id,
    pg_catalog.jsonb_build_object('fields', pg_catalog.to_jsonb(coalesce(p_fields, '{}')))
      || coalesce(p_extra, '{}'::jsonb)
  );
$$;

drop function public.create_note(uuid, text, text, uuid, date, text[]);

create function public.create_note(
  p_owner_id uuid,
  p_title text,
  p_body text,
  p_folder_id uuid,
  p_daily_note_date date,
  p_link_titles text[] default null,
  p_actor text default 'user'
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

  perform public.write_note_audit(
    p_owner_id,
    p_actor,
    'create',
    created_object.id,
    array_remove(
      array[
        'title',
        case when coalesce(p_body, '') <> '' then 'body' end,
        case when p_folder_id is not null then 'folder_id' end,
        case when p_daily_note_date is not null then 'daily_note_date' end
      ],
      null
    )
  );

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

drop function public.update_note(uuid, uuid, text, text, uuid, boolean, boolean, boolean, text[]);

create function public.update_note(
  p_owner_id uuid,
  p_knowledge_object_id uuid,
  p_title text,
  p_body text,
  p_folder_id uuid,
  p_update_title boolean,
  p_update_body boolean,
  p_update_folder boolean,
  p_link_titles text[] default null,
  p_actor text default 'user'
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
  previous_body text;
  previous_folder_id uuid;
  updated_object public.knowledge_objects%rowtype;
  updated_note public.notes%rowtype;
  old_link_pattern text;
  changed_fields text[];
begin
  select knowledge_objects.title, notes.body, notes.folder_id
  into previous_title, previous_body, previous_folder_id
  from public.knowledge_objects
  join public.notes on notes.knowledge_object_id = knowledge_objects.id
  where knowledge_objects.id = p_knowledge_object_id
    and knowledge_objects.owner_id = p_owner_id
    and knowledge_objects.type = 'note'
    and knowledge_objects.deleted_at is null
  for update of knowledge_objects;

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
    ),
    touched as (
      update public.knowledge_objects
      set updated_at = pg_catalog.now()
      from rewritten
      where knowledge_objects.id = rewritten.knowledge_object_id
      returning knowledge_objects.id
    )
    insert into public.audit_log (owner_id, actor, action, knowledge_object_id, metadata)
    select
      p_owner_id,
      'system',
      'update',
      touched.id,
      pg_catalog.jsonb_build_object(
        'fields', pg_catalog.jsonb_build_array('body'),
        'cause', 'rename_propagation',
        'source_object_id', updated_object.id
      )
    from touched;

    perform public.attach_dangling_note_links(p_owner_id, updated_object.id);
  end if;

  -- Only fields whose value actually changed; a save that changes nothing
  -- (e.g. an autosave of an identical body) leaves no audit row.
  changed_fields := array_remove(
    array[
      case when p_update_title and previous_title is distinct from p_title then 'title' end,
      case when p_update_body and previous_body is distinct from p_body then 'body' end,
      case when p_update_folder and previous_folder_id is distinct from p_folder_id
        then 'folder_id' end
    ],
    null
  );

  if pg_catalog.cardinality(changed_fields) > 0 then
    perform public.write_note_audit(
      p_owner_id, p_actor, 'update', updated_object.id, changed_fields
    );
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

-- Soft delete (NOTE-05): the deleted_at guard keeps a repeat delete from
-- refreshing the timestamp, which would restart the retention clock (ADR-18).
-- Returns whether a note was deleted.
create function public.delete_note(
  p_owner_id uuid,
  p_knowledge_object_id uuid,
  p_deleted_at timestamptz,
  p_actor text default 'user'
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  update public.knowledge_objects
  set deleted_at = p_deleted_at, updated_at = p_deleted_at
  where knowledge_objects.id = p_knowledge_object_id
    and knowledge_objects.owner_id = p_owner_id
    and knowledge_objects.type = 'note'
    and knowledge_objects.deleted_at is null;

  if not found then
    return false;
  end if;

  perform public.write_note_audit(
    p_owner_id, p_actor, 'delete', p_knowledge_object_id, array['deleted_at']
  );
  return true;
end;
$$;

-- Restore from trash (NOTE-12): only notes soft-deleted at or after
-- `p_window_start` (the retention window) are restorable. Returns whether a
-- note was restored.
create function public.restore_note(
  p_owner_id uuid,
  p_knowledge_object_id uuid,
  p_restored_at timestamptz,
  p_window_start timestamptz,
  p_actor text default 'user'
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  update public.knowledge_objects
  set deleted_at = null, updated_at = p_restored_at
  where knowledge_objects.id = p_knowledge_object_id
    and knowledge_objects.owner_id = p_owner_id
    and knowledge_objects.type = 'note'
    and knowledge_objects.deleted_at is not null
    and knowledge_objects.deleted_at >= p_window_start;

  if not found then
    return false;
  end if;

  perform public.write_note_audit(
    p_owner_id, p_actor, 'restore', p_knowledge_object_id, array['deleted_at']
  );
  return true;
end;
$$;

revoke execute on function public.write_note_audit(uuid, text, text, uuid, text[], jsonb)
  from public, anon, service_role;
revoke execute on function public.create_note(uuid, text, text, uuid, date, text[], text)
  from public, anon, service_role;
revoke execute on function public.update_note(
  uuid, uuid, text, text, uuid, boolean, boolean, boolean, text[], text
) from public, anon, service_role;
revoke execute on function public.delete_note(uuid, uuid, timestamptz, text)
  from public, anon, service_role;
revoke execute on function public.restore_note(uuid, uuid, timestamptz, timestamptz, text)
  from public, anon, service_role;

grant execute on function public.write_note_audit(uuid, text, text, uuid, text[], jsonb)
  to authenticated;
grant execute on function public.create_note(uuid, text, text, uuid, date, text[], text)
  to authenticated;
grant execute on function public.update_note(
  uuid, uuid, text, text, uuid, boolean, boolean, boolean, text[], text
) to authenticated;
grant execute on function public.delete_note(uuid, uuid, timestamptz, text) to authenticated;
grant execute on function public.restore_note(uuid, uuid, timestamptz, timestamptz, text)
  to authenticated;
