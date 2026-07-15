# 08. Search

> Part of the [Documentation Index](DOCUMENT_INDEX.md). Implements the search flow from [03_ARCHITECTURE.md §6.3](03_ARCHITECTURE.md#63-search-hybrid) against the schema in [04_DATABASE.md §4.3, §4.9](04_DATABASE.md#43-notes) and the `SearchService` contract in [05_API.md §6](05_API.md#6-searchservice). Consumes the embeddings produced by [07_AI.md §3–4](07_AI.md#3-embedding-strategy).

## 1. Purpose & Scope

This document specifies exactly how `SearchService.search` produces a single ranked list from two structurally different retrieval mechanisms, and how the other read paths that feel like "search" — backlinks, `[[` autocomplete, tag suggestions — are related but distinct. It satisfies FR-SEARCH-1–4 and FR-SEM-1–2 ([02_PRD.md §4.10–4.11](02_PRD.md#410-search-full-text)) within the latency budgets in [02_PRD.md §6](02_PRD.md#6-non-functional-requirements).

## 2. Full-Text Search

| Aspect | Decision |
|---|---|
| Index | `notes.search_vector`, a generated `tsvector` column over `title \|\| body`, GIN-indexed ([04_DATABASE.md §4.3](04_DATABASE.md#43-notes)). |
| Query parsing | User input is parsed with `websearch_to_tsquery`-style semantics (supports quoted phrases, implicit AND, `-exclude`) rather than requiring users to write raw `tsquery` syntax — search input is a plain text box, not a query language. |
| Ranking | `ts_rank_cd` (cover density) over the matched `tsvector`, favoring documents where matched terms appear close together — better suited to notes (short-to-medium prose) than plain `ts_rank`. |
| Language | `english` text search configuration for MVP. Multi-language notes are not specially handled; internationalized search is a future consideration, not tracked as a requirement today. |
| Scope | Notes only (`notes.search_vector`) in MVP — Attachments have no extractable text (§6, and [07_AI.md §3](07_AI.md#3-embedding-strategy)). |

## 3. Semantic Search (pgvector)

| Aspect | Decision |
|---|---|
| Index target | `embeddings.embedding`, `vector(1536)` ([04_DATABASE.md §4.9](04_DATABASE.md#49-embeddings)). |
| Query vector | The user's query text is embedded on-the-fly, using the same embedding model as note content ([07_AI.md §2](07_AI.md#2-model-selection-strategy)) — query and document vectors must come from the same model to be comparable. |
| Distance metric | Cosine similarity. |
| Candidate retrieval | Over-fetch top-K (e.g., top 20) nearest chunks before hybrid ranking (§4) and before `AIService`'s per-note dedupe ([07_AI.md §5](07_AI.md#5-context-assembly-rag)) — the final result list is smaller than the candidate set. |
| ANN index | HNSW over IVFFlat (below). |

**Index choice — HNSW vs. IVFFlat:**

| | HNSW | IVFFlat |
|---|---|---|
| Query performance | Faster, better recall at query time | Requires tuning `lists` for the current row count; degrades if the table grows past what `lists` was set for |
| Build cost / memory | Higher | Lower |
| Maintenance | No periodic re-clustering needed | Needs periodic reindex as data grows to keep recall stable |

**Decision:** HNSW. The workload is read-heavy and write-light per user (notes are edited far more often than they're bulk-imported), and per-user embedding counts stay well within the 10,000-note NFR ceiling ([02_PRD.md §6](02_PRD.md#6-non-functional-requirements)) where HNSW's higher memory/build cost is a non-issue. IVFFlat's need for ongoing `lists` retuning as each user's graph grows is exactly the kind of operational overhead this system avoids per [01_PRODUCT.md §6.1](01_PRODUCT.md#6-guiding-principles).

## 4. Hybrid Ranking

Full-text scores (`ts_rank_cd`, unbounded-ish, corpus-dependent) and semantic scores (cosine similarity, bounded 0–1 but on a different distribution) are **not comparable on a shared scale** — averaging or weighting them directly is a common mistake this design avoids. Instead, results are merged with **Reciprocal Rank Fusion (RRF)**:

$$\text{score}(d) = \sum_{\text{ranker} \in \{\text{fts}, \text{semantic}\}} \frac{1}{k + \text{rank}_{\text{ranker}}(d)}$$

with `k = 60` (a standard, widely-used default that de-emphasizes rank-1-vs-rank-2 noise while still rewarding top placement). A document unranked by a given ranker (didn't appear in its top-K at all) contributes 0 from that ranker, not a penalty — being absent from full-text results because a note used no matching literal words shouldn't count against a strong semantic match.

**Worked example** (`k = 60`):

| Note | FTS rank | Semantic rank | RRF score |
|---|---|---|---|
| "Product Roadmap 2026" (literal match) | 1 | 5 | 1/61 + 1/65 = **0.0318** |
| "Planning Notes — July" (semantic only) | — | 1 | 0 + 1/61 = **0.0164** |
| "Q2 Retro" (weak on both) | 8 | 12 | 1/68 + 1/72 = **0.0286** |

Final order: Product Roadmap 2026 → Q2 Retro → Planning Notes — July. Note that a document ranked well by *both* rankers outranks one ranked #1 by only one — RRF rewards agreement, which is what makes it robust to either ranker being individually noisy.

**Why RRF over a trained/learned ranker:** RRF requires no training data, no relevance-labeling process, and no ongoing model maintenance — appropriate for a per-user personal corpus where there's no shared query log to learn from across users. Revisit only if ranking quality proves inadequate in practice, not preemptively.

## 5. Backlinks

Not a search operation architecturally, but the same "what points at this" retrieval shape:

```
SELECT * FROM links WHERE target_object_id = :note_id
```

Backed by the `target_object_id` index on `links` ([04_DATABASE.md §4.8](04_DATABASE.md#48-links)) — called out there as the single most important index for FR-LINK-5/6, restated here because it's conceptually part of the same "how do I find related things" surface as search, even though it's exact-match, not ranked. Exposed via `NoteService.getBacklinks` ([05_API.md §4](05_API.md#4-noteservice)), not `SearchService` — it's not a query, it's a lookup.

## 6. Wiki Links & Autocomplete

`[[` autocomplete (FR-LINK-3) has a much tighter latency requirement than search — it fires on every keystroke, not on a deliberate submit — so it deliberately does **not** go through hybrid ranking (§4):

| Aspect | Decision |
|---|---|
| Method | `SearchService.suggestNoteTitles` ([05_API.md §6](05_API.md#6-searchservice)) |
| Index | Trigram index (`pg_trgm`) on `notes.title`, not `search_vector` — `tsvector` matches whole lexemes and doesn't handle prefix/substring/typo-tolerant matching well; trigram similarity does. |
| Latency target | Sub-100ms — three times tighter than the 300ms full-text budget ([02_PRD.md §6](02_PRD.md#6-non-functional-requirements) sets the floor; autocomplete must feel instantaneous per keystroke, not just "fast"). |
| Scope | Title-only match, no body text, no semantic component — precision over recall; a user typing `[[` wants the note they're thinking of, not a conceptually related one. |

## 7. Snippets

Snippet generation differs by why a result matched, since a semantic-only match has no literal term to highlight:

| Match type | Snippet source |
|---|---|
| `fulltext` | `ts_headline` over the matched `search_vector`, producing a highlighted excerpt around the matched terms. |
| `semantic` | The `chunk_text` of the matching embedding row ([04_DATABASE.md §4.9](04_DATABASE.md#49-embeddings)) verbatim — there's no literal term to center a headline on, so the chunk that scored the match *is* the snippet. |
| `hybrid` (matched both) | `ts_headline` output is preferred, since a literal-match excerpt is more immediately scannable than a raw chunk. |

This is why `SearchResult.matchType` ([05_API.md §2](05_API.md#2-conventions)) is part of the result shape, not an internal-only detail — the UI needs it to decide how to render the snippet.

## 8. Suggestions

Three distinct suggestion surfaces exist; none of them share an implementation, because they're solving different-shaped problems:

| Surface | Backing mechanism | Notes |
|---|---|---|
| `[[` link autocomplete | §6, trigram title match | Covered above. |
| Inline tag creation (FR-TAG-2) | Prefix match against `tags.name` for the current owner | Cheap, exact-ish match; creating a genuinely new tag is the common case, not the exception, so this is a suggest-as-you-type list, not a strict validator. |
| Query "did you mean" / spelling correction | Not implemented in MVP | Explicitly out of scope — flagged here rather than silently absent, since it's a natural-sounding feature that isn't in [02_PRD.md §4](02_PRD.md#4-functional-requirements) and shouldn't be assumed. |

## 9. Performance Considerations

Budgets from [02_PRD.md §6](02_PRD.md#6-non-functional-requirements): full-text p95 < 300ms, hybrid p95 < 800ms.

| Technique | Why it matters |
|---|---|
| Concurrent FTS + semantic execution | The two branches run in parallel, not sequentially ([03_ARCHITECTURE.md §6.3](03_ARCHITECTURE.md#63-search-hybrid)) — sequential execution would roughly double the slower path's contribution to total latency. |
| GIN index on `search_vector` | Makes full-text matching index-backed rather than a sequential scan, required to hold the 300ms budget as a graph approaches the 10,000-note NFR ceiling. |
| HNSW index on `embedding` | Same reasoning for the semantic branch — see §3. |
| Top-K candidate limiting | Semantic search retrieves a bounded candidate set (§3) rather than ranking the full embeddings table — cosine-distance computation cost is bounded by K, not by corpus size. |
| Connection pooling | Supabase's connection pooler is used for search's read-heavy query pattern, avoiding per-request connection setup cost. |
| Graceful degradation | If the semantic branch errors or times out, `search` returns full-text-only results rather than failing the whole request — a slightly less complete result beats no result. The reverse (full-text fails, semantic succeeds) degrades the same way. |

## 10. Related Documents

- [03_ARCHITECTURE.md §6.3](03_ARCHITECTURE.md#63-search-hybrid) — the concurrent-execution flow this document's ranking algorithm plugs into.
- [04_DATABASE.md §4.3, §4.8, §4.9](04_DATABASE.md#43-notes) — the `search_vector`, `links`, and `embeddings` structures this document indexes and queries.
- [05_API.md §6](05_API.md#6-searchservice) — the `SearchService` method contracts this document is the algorithmic specification for.
- [07_AI.md §3–5](07_AI.md#3-embedding-strategy) — the embedding and chunking strategy that determines what semantic search is searching over.
- [02_PRD.md §6](02_PRD.md#6-non-functional-requirements) — the latency budgets this document's index and execution choices are justified against.
