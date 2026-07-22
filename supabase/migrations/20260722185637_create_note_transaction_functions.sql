create function public.create_note(
  p_owner_id uuid,
  p_title text,
  p_body text,
  p_folder_id uuid,
  p_daily_note_date date
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
language sql
volatile
security invoker
set search_path = ''
as $$
  with inserted_object as (
    insert into public.knowledge_objects (owner_id, type, title)
    values (p_owner_id, 'note', p_title)
    returning
      knowledge_objects.id,
      knowledge_objects.owner_id,
      knowledge_objects.title,
      knowledge_objects.created_at,
      knowledge_objects.updated_at,
      knowledge_objects.deleted_at
  ),
  inserted_note as (
    insert into public.notes (
      knowledge_object_id,
      owner_id,
      title,
      body,
      folder_id,
      daily_note_date
    )
    select
      inserted_object.id,
      inserted_object.owner_id,
      inserted_object.title,
      p_body,
      p_folder_id,
      p_daily_note_date
    from inserted_object
    returning
      notes.knowledge_object_id,
      notes.body,
      notes.folder_id,
      notes.daily_note_date
  )
  select
    inserted_object.id,
    inserted_object.owner_id,
    inserted_object.title,
    inserted_note.body,
    inserted_note.folder_id,
    inserted_note.daily_note_date,
    inserted_object.created_at,
    inserted_object.updated_at,
    inserted_object.deleted_at
  from inserted_object
  join inserted_note
    on inserted_note.knowledge_object_id = inserted_object.id;
$$;

revoke execute on function public.create_note(uuid, text, text, uuid, date)
  from public, anon;
grant execute on function public.create_note(uuid, text, text, uuid, date)
  to authenticated;

create function public.update_note(
  p_owner_id uuid,
  p_knowledge_object_id uuid,
  p_title text,
  p_body text,
  p_folder_id uuid,
  p_update_title boolean,
  p_update_body boolean,
  p_update_folder boolean
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
  updated_object public.knowledge_objects%rowtype;
  updated_note public.notes%rowtype;
begin
  update public.knowledge_objects
  set
    title = case when p_update_title then p_title else knowledge_objects.title end,
    updated_at = now()
  where knowledge_objects.id = p_knowledge_object_id
    and knowledge_objects.owner_id = p_owner_id
    and knowledge_objects.type = 'note'
  returning knowledge_objects.* into updated_object;

  if not found then
    return;
  end if;

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

revoke execute on function public.update_note(
  uuid,
  uuid,
  text,
  text,
  uuid,
  boolean,
  boolean,
  boolean
) from public, anon;
grant execute on function public.update_note(
  uuid,
  uuid,
  text,
  text,
  uuid,
  boolean,
  boolean,
  boolean
) to authenticated;
