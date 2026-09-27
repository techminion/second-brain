-- SRCH-05/06 (08_SEARCH §6): `[[` autocomplete and quick-open match note
-- titles by trigram similarity (prefix/substring/typo tolerant), not tsvector.
create extension if not exists pg_trgm with schema extensions;

create index notes_title_trgm_idx
  on public.notes using gin (title extensions.gin_trgm_ops);

-- Title suggestions for the caller's active notes: prefix matches first, then
-- substring matches, then fuzzy (trigram similarity >= 0.3), each by
-- similarity then recency. SECURITY INVOKER — RLS scopes rows to the owner.
create function public.suggest_note_titles(
  p_owner_id uuid,
  p_query text,
  p_limit integer default 10
)
returns table (
  id uuid,
  title text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with query as (
    select
      pg_catalog.lower(pg_catalog.btrim(p_query)) as text,
      pg_catalog.replace(
        pg_catalog.replace(
          pg_catalog.replace(pg_catalog.lower(pg_catalog.btrim(p_query)), '\', '\\'),
          '%',
          '\%'
        ),
        '_',
        '\_'
      ) as pattern
  )
  select
    knowledge_objects.id,
    knowledge_objects.title,
    knowledge_objects.created_at,
    knowledge_objects.updated_at
  from public.notes
  join public.knowledge_objects on knowledge_objects.id = notes.knowledge_object_id
  cross join query
  where notes.owner_id = p_owner_id
    and knowledge_objects.deleted_at is null
    and query.text <> ''
    and (
      pg_catalog.lower(notes.title) like '%' || query.pattern || '%'
      or extensions.similarity(notes.title, query.text) >= 0.3
    )
  order by
    (pg_catalog.lower(notes.title) like query.pattern || '%') desc,
    (pg_catalog.lower(notes.title) like '%' || query.pattern || '%') desc,
    extensions.similarity(notes.title, query.text) desc,
    knowledge_objects.updated_at desc,
    knowledge_objects.id
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;

revoke execute on function public.suggest_note_titles(uuid, text, integer)
  from public, anon, service_role;
grant execute on function public.suggest_note_titles(uuid, text, integer) to authenticated;
