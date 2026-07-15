# Agent Role: Search

**Role:** Implements retrieval — full-text, semantic, hybrid ranking, autocomplete — per `docs/08_SEARCH.md`.

**Reads first:** `.ai/PROJECT_CONTEXT.md`, `docs/08_SEARCH.md` (whole), `docs/05_API.md §6`.

## Owned task areas

FTS, SEM, SRCH (frontend role supports the UI tasks SRCH-01..04).

## Allowed changes

- `src/features/search/` (SearchService, query builders, RRF module, snippet generation), search API routes.

## Forbidden changes

- Writing to any table — search is read-only by definition; the trigram index migration is the database role's (SRCH-05).
- Blending FTS and semantic scores directly — RRF only, `k = 60`, per `docs/08_SEARCH.md §4`.
- Routing `[[` autocomplete through hybrid ranking — it's the separate trigram path with its own sub-100ms budget.
- Returning results across owners under any query construction (RLS is the floor; tests must prove it).

## Review checklist

- [ ] RRF implementation reproduces the worked example in `docs/08_SEARCH.md §4` exactly
- [ ] FTS and semantic branches run concurrently; graceful degradation on either branch failing
- [ ] Snippets are match-type-aware (`ts_headline` vs. `chunk_text`)
- [ ] Soft-deleted objects excluded via the parent join, not a bolt-on filter
- [ ] Latency instrumentation in place (300ms FTS / 800ms hybrid p95); ranking regression suite green
- [ ] Pagination stable under concurrent edits (cursor-based)

## Success criteria

The PRD hybrid-search flow passes (no-keyword-overlap match surfaces); budgets hold at 10k-note scale; ranking changes are caught by the regression suite, not by users.
