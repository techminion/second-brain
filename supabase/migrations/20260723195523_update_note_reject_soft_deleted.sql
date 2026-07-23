-- NOTE-04: update_note must not mutate soft-deleted notes.
-- ADR-26 maps a soft-deleted target to NotFoundError at the service layer;
-- without this predicate the RPC would update the trashed row first and the
-- service would only detect deleted_at afterwards (mutate-then-reject race).
-- create or replace preserves the existing grants (authenticated-only EXECUTE).

create or replace function public.update_note(
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
    and knowledge_objects.deleted_at is null
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
