-- FTS-01/02 (08_SEARCH §2): full-text search over active notes.
-- - Parsing: websearch_to_tsquery('english', …) — quoted phrases, implicit
--   AND, `or`, and `-exclusions`, from a plain text box; never raw tsquery.
-- - Ranking: ts_rank_cd (cover density) over notes.search_vector (the GIN-
--   indexed generated column), ties broken by recency then id so pages are
--   deterministic and an offset cursor is stable (FTS-10).
-- - Snippets (FR-SEARCH-2): ts_headline over the body (the title when the body
--   is empty), computed only for the page being returned. Matches are wrapped
--   in U+0002 / U+0003 control characters rather than HTML, so no markup ever
--   leaves the database; the client renders them as <mark> (09_SECURITY T4).
-- Owner-scoped and soft-delete filtered at the query level; SECURITY INVOKER
-- with an empty search_path, so RLS stays the authorization floor (FR-SEARCH-3).

create function public.search_notes(
  p_owner_id uuid,
  p_query text,
  p_limit integer,
  p_offset integer default 0
)
returns table (
  id uuid,
  title text,
  created_at timestamptz,
  updated_at timestamptz,
  score real,
  snippet text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with query as (
    select pg_catalog.websearch_to_tsquery('english'::pg_catalog.regconfig, p_query) as tsq
  ),
  ranked as (
    select
      knowledge_objects.id,
      knowledge_objects.title,
      knowledge_objects.created_at,
      knowledge_objects.updated_at,
      notes.body,
      pg_catalog.ts_rank_cd(notes.search_vector, query.tsq) as score
    from query, public.notes
    join public.knowledge_objects on knowledge_objects.id = notes.knowledge_object_id
    where notes.owner_id = p_owner_id
      and knowledge_objects.owner_id = p_owner_id
      and knowledge_objects.deleted_at is null
      and pg_catalog.numnode(query.tsq) > 0
      and notes.search_vector operator(pg_catalog.@@) query.tsq
    order by score desc, knowledge_objects.updated_at desc, knowledge_objects.id desc
    limit greatest(least(p_limit, 101), 1)
    offset greatest(p_offset, 0)
  )
  select
    ranked.id,
    ranked.title,
    ranked.created_at,
    ranked.updated_at,
    ranked.score,
    pg_catalog.ts_headline(
      'english'::pg_catalog.regconfig,
      case when pg_catalog.btrim(ranked.body) = '' then ranked.title else ranked.body end,
      query.tsq,
      'StartSel=' || pg_catalog.chr(2) || ', StopSel=' || pg_catalog.chr(3)
        || ', MaxWords=30, MinWords=12, MaxFragments=2, FragmentDelimiter=" … "'
    ) as snippet
  from ranked, query
  order by ranked.score desc, ranked.updated_at desc, ranked.id desc;
$$;

revoke execute on function public.search_notes(uuid, text, integer, integer)
  from public, anon, service_role;
grant execute on function public.search_notes(uuid, text, integer, integer) to authenticated;
