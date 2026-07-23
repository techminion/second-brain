# 05. API (Service Layer)

> Part of the [Documentation Index](DOCUMENT_INDEX.md). Implements the Service Layer box from [03_ARCHITECTURE.md §4](03_ARCHITECTURE.md#4-component-architecture) against the schema in [04_DATABASE.md](04_DATABASE.md). Precedes [06_MCP.md](06_MCP.md) (every MCP tool maps to a method below), [07_AI.md](07_AI.md) (extends `AIService`/`EmbeddingService`), and [08_SEARCH.md](08_SEARCH.md) (extends `SearchService`).
>
> This document specifies method signatures, not implementations — logical contracts, not HTTP routes. The Web API and MCP Server are both thin callers of what's defined here ([03_ARCHITECTURE.md §5.2](03_ARCHITECTURE.md#5-layering--code-organization-principles)).

## 1. Purpose & Scope

Eight services own all business logic in the system. Every mutation, from any caller (web app or MCP client), passes through exactly one of these — there is no other path to the database ([03_ARCHITECTURE.md §5.2–5.4](03_ARCHITECTURE.md#5-layering--code-organization-principles)).

| Service | Owns | Backing tables ([04_DATABASE.md](04_DATABASE.md)) |
|---|---|---|
| `NoteService` | Note lifecycle, wiki links, backlinks, daily notes, note tagging | `knowledge_objects`, `notes`, `links`, `knowledge_object_tags` |
| `FolderService` | Folder hierarchy | `folders` |
| `SearchService` | Full-text, semantic, hybrid search; tag browsing; title autocomplete | `notes.search_vector`, `embeddings`, `tags`, `knowledge_object_tags` |
| `GraphService` | Graph view (nodes/edges) | `knowledge_objects`, `links` |
| `EmbeddingService` | Vector embedding lifecycle for Knowledge Objects | `embeddings` |
| `AttachmentService` | Attachment lifecycle | `knowledge_objects`, `attachments` |
| `AIService` | Note chat, vault chat (RAG) | `chat_conversations`, `chat_messages` |
| `UserService` | Profile, account lifecycle, MCP credentials | `profiles`, `mcp_credentials` |

## 2. Conventions

- **`userId` is always the first parameter**, sourced from the verified session/token by the caller (Web API or MCP Server) — never accepted from request body/tool arguments. This is what makes FR-MCP-4 (MCP can't act outside its owner's scope) a service-layer guarantee, not just an RLS one ([04_DATABASE.md §7](04_DATABASE.md#7-row-level-security-rls-policies)).
- **Pagination** is cursor-based everywhere a method returns a list: `list(userId, options?: { cursor?: string; limit?: number })` returns `Paginated<T> = { items: T[]; nextCursor?: string }`. Chosen over offset/limit so results stay stable while a user is actively editing the graph mid-scroll.
- **Mutations return the full updated resource** (deletes return `void`), not just an id or a boolean — callers (UI, MCP tool responses) shouldn't need a follow-up read after every write.
- **Every method is `async`** (returns a `Promise`); there is no synchronous variant.
- **Errors are thrown, not returned as values**, from the fixed taxonomy in §3. Callers catch and translate — the Web API to HTTP status codes, the MCP Server to MCP error responses ([06_MCP.md](06_MCP.md)).

### Shared Types

Referenced across multiple services below; full field-level definition lives in [04_DATABASE.md](04_DATABASE.md) — these are the service-layer shapes, not table rows.

| Type | Shape |
|---|---|
| `KnowledgeObjectSummary` | `{ id, type, title, tags, createdAt, updatedAt }` — the common envelope, used in list/search results |
| `Note` | `KnowledgeObjectSummary & { body, folderId, dailyNoteDate }` |
| `Folder` | `{ id, name, parentFolderId, createdAt, updatedAt }` |
| `Attachment` | `KnowledgeObjectSummary & { mimeType, sizeBytes, url }` — `url` is a short-lived signed URL, generated per request, never stored |
| `SearchResult` | `{ object: KnowledgeObjectSummary; snippet: string; score: number; matchType: 'fulltext' \| 'semantic' \| 'hybrid' }` |
| `GraphNode` / `GraphEdge` | `{ id, title, type }` / `{ sourceId, targetId }` |
| `Conversation` | `{ id, scope: 'note' \| 'vault', noteId?, messages: ChatMessage[] }` |
| `ChatMessage` | `{ id, role: 'user' \| 'assistant', content, citations: { knowledgeObjectId }[], createdAt }` |
| `Paginated<T>` | `{ items: T[]; nextCursor?: string }` |

## 3. Error Taxonomy

A fixed, closed set — every service throws only from this list. No service invents its own error type.

| Error | Thrown when | Web API maps to | MCP maps to |
|---|---|---|---|
| `ValidationError` | Input fails shape/business validation (e.g., empty title) | 400 | Tool error, `invalid_params` |
| `NotFoundError` | Object doesn't exist, is soft-deleted and the caller didn't request trash, **or is owned by another user** (RLS makes it indistinguishable from nonexistent — see ADR-26) | 404 | Tool error, not found |
| `ForbiddenError` | Caller can see a resource but isn't permitted the operation. **Reserved for the future shared/multi-owner-graph model** ([04_DATABASE.md §10](04_DATABASE.md#10-future-schema-considerations)); under the current uniform owner-RLS model it is unreachable for owner-scoped access, which returns `NotFoundError` instead (ADR-26) | 403 | Tool error, unauthorized |
| `ConflictError` | Unique constraint violated (duplicate daily note date, duplicate tag name) | 409 | Tool error, conflict |
| `CyclicMoveError` | A folder move would make a folder its own ancestor ([04_DATABASE.md §4.5](04_DATABASE.md#45-folders)) | 400 | Tool error, `invalid_params` |
| `FileTooLargeError` | Upload exceeds the configured max size (FR-ATTACH-3) | 413 | Tool error, `invalid_params` |
| `RateLimitError` | Caller exceeded an AI or MCP rate limit ([09_SECURITY.md](09_SECURITY.md)) | 429 | Tool error, rate limited |
| `UpstreamProviderError` | OpenAI (or another external dependency) call failed | 502 | Tool error, upstream failure |

**404-over-403 for inaccessible resources (ADR-26):** RLS ([04_DATABASE.md §7](04_DATABASE.md#7-row-level-security-rls-policies)) makes a foreign-owned row return an empty result that is *indistinguishable* from a nonexistent or soft-deleted one. A service therefore **cannot** tell those cases apart without a privileged existence probe — and adding one would be an enumeration oracle (letting an authenticated user discover which object IDs exist across all users) and would violate the exhaustive service-role/`SECURITY DEFINER` constraints of [09_SECURITY.md §5](09_SECURITY.md#5-service-role-key-usage). So every owner-scoped single-resource access (`get`/`update`/`delete`/`restore`/tag ops across the services below) returns `NotFoundError` for a nonexistent, soft-deleted, **or foreign-owned** target. `ForbiddenError` stays in the taxonomy but is thrown only where the caller can already see the resource yet lacks permission — a case that does not arise under the current uniform owner-RLS model and is reserved for the future shared-graph model.

## 4. NoteService

| Method | Input | Output | Errors |
|---|---|---|---|
| `create` | `{ title, body?, folderId? }` | `Note` | `ValidationError` |
| `get` | `noteId` | `Note` | `NotFoundError` |
| `update` | `noteId, { title?, body?, folderId? }` | `Note` | `NotFoundError`, `ValidationError` |
| `delete` | `noteId` | `void` | `NotFoundError` |
| `restore` | `noteId` | `Note` | `NotFoundError` (outside retention window) |
| `list` | `{ folderId? } & PaginationOptions` | `Paginated<Note>` | — |
| `getBacklinks` | `noteId` | `{ object: KnowledgeObjectSummary; snippet: string }[]` — snippet is the text surrounding the link in the source note, for the backlinks panel | `NotFoundError` |
| `getOrCreateDailyNote` | `date` | `Note` | — |
| `addTag` | `noteId, tagName` | `Note` | `NotFoundError` |
| `removeTag` | `noteId, tagId` | `Note` | `NotFoundError` |

**Behavioral notes:**
- `update` re-parses `[[wiki links]]` out of `body` and reconciles the `links` table (insert new, delete removed) in the same transaction as the note save — this is what makes FR-LINK-6 true without a separate reindex step ([04_DATABASE.md §4.8](04_DATABASE.md#48-links)).
- `update` writes `notes.title` and `knowledge_objects.title` together, always — `NoteService` is the schema's designated single writer for both ([04_DATABASE.md §4.3](04_DATABASE.md#43-notes)).
- **Rename propagation (FR-NOTE-3):** when `title` changes, `update` uses the `links` table to find every note linking to this one and rewrites their `[[old title]]` occurrences to `[[new title]]` in the same transaction. Link *edges* are ID-based and unchanged — only display text in referencing bodies is updated. This keeps raw markdown human-readable (`[[title]]`, never opaque IDs), which is what makes export ([09_SECURITY.md §11](09_SECURITY.md#11-privacy--data-ownership)) portable without a translation step.
- `getOrCreateDailyNote` is an upsert against the `(owner_id, daily_note_date)` unique constraint — it never races itself into a `ConflictError` under normal use.
- Neither `create` nor `update` calls `EmbeddingService` directly. Re-embedding is triggered by the database webhook described in [03_ARCHITECTURE.md §6.4](03_ARCHITECTURE.md#64-embedding-pipeline), not a synchronous service-to-service call — see §10.

**Example — `create`:**
```
Input:  { title: "Q3 Planning", folderId: "f_9a2..." }
Output: {
  id: "n_7c1...", type: "note", title: "Q3 Planning",
  body: "", folderId: "f_9a2...", tags: [], dailyNoteDate: null,
  createdAt: "2026-07-15T10:00:00Z", updatedAt: "2026-07-15T10:00:00Z"
}
```

## 5. FolderService

| Method | Input | Output | Errors |
|---|---|---|---|
| `create` | `{ name, parentFolderId? }` | `Folder` | `ValidationError`, `NotFoundError` (bad parent) |
| `rename` | `folderId, name` | `Folder` | `NotFoundError`, `ValidationError` |
| `move` | `folderId, newParentFolderId` | `Folder` | `NotFoundError`, `CyclicMoveError` |
| `delete` | `folderId, strategy: 'delete_contents' \| 'move_to_parent'` | `void` | `NotFoundError` |
| `list` | `parentFolderId?` | `Folder[]` | — |
| `getTree` | — | `FolderTreeNode[]` (nested) | — |

**Behavioral notes:** `delete` requires an explicit `strategy` argument — there is no default, by design, so FR-FOLDER-3 ("never silently delete contained notes") can't be violated by an omitted parameter.

## 6. SearchService

| Method | Input | Output | Errors |
|---|---|---|---|
| `search` | `query, options?: PaginationOptions` | `Paginated<SearchResult>` | `ValidationError` (empty query) |
| `semanticSearch` | `query, topK` | `SearchResult[]` | `ValidationError`, `UpstreamProviderError` |
| `suggestNoteTitles` | `partialTitle, limit?` | `KnowledgeObjectSummary[]` | — |
| `listByTag` | `tagId, options?: PaginationOptions` | `Paginated<KnowledgeObjectSummary>` | `NotFoundError` |
| `listTags` | — | `Tag[]` | — |

**Behavioral notes:**
- `search` runs full-text and semantic queries concurrently and merges them into one hybrid-ranked list — the two-branch flow in [03_ARCHITECTURE.md §6.3](03_ARCHITECTURE.md#63-search-hybrid); exact ranking formula is [08_SEARCH.md](08_SEARCH.md)'s responsibility.
- `semanticSearch` is called directly by `AIService` (§11) for RAG context assembly, in addition to being usable standalone.
- `suggestNoteTitles` backs the `[[` autocomplete UI (FR-LINK-3); it's a prefix/fuzzy match on title, not a full hybrid search — kept cheap and low-latency on purpose.
- Tag CRUD lives on the owning object's service (`NoteService.addTag`, `AttachmentService.addTag`); `listByTag`/`listTags` live here because browsing is a discovery operation, not a mutation.

**Example — `search`:**
```
Input:  { query: "roadmap", options: { limit: 10 } }
Output: {
  items: [
    { object: { id: "n_8b1...", title: "Product Roadmap 2026", ... },
      snippet: "...our <mark>roadmap</mark> for the next two quarters...",
      score: 0.97, matchType: "fulltext" },
    { object: { id: "n_4f2...", title: "Quarterly Planning", ... },
      snippet: "...no literal keyword match, but semantically similar to Q3 planning...",
      score: 0.81, matchType: "semantic" }
  ],
  nextCursor: null
}
```

## 7. GraphService

| Method | Input | Output | Errors |
|---|---|---|---|
| `getGraph` | `{ folderId?, tagId? }` | `{ nodes: GraphNode[]; edges: GraphEdge[] }` | — |
| `getLocalGraph` | `noteId, depth?` (default 1) | `{ nodes: GraphNode[]; edges: GraphEdge[] }` | `NotFoundError` |

**Behavioral notes:** `getGraph` with no filter returns the full owned graph (FR-GRAPH-1); `getLocalGraph` is the intended interaction past a few hundred nodes (FR-GRAPH-4, [02_PRD.md §6](02_PRD.md#6-non-functional-requirements)).

## 8. EmbeddingService

Unlike the services above, most callers of `EmbeddingService` are the embedding pipeline itself ([03_ARCHITECTURE.md §6.4](03_ARCHITECTURE.md#64-embedding-pipeline)), not a user-facing UI action.

| Method | Input | Output | Errors |
|---|---|---|---|
| `embedObject` | `knowledgeObjectId` | `EmbeddingStatus` | `NotFoundError`, `UpstreamProviderError` |
| `getStatus` | `knowledgeObjectId` | `EmbeddingStatus` (`'pending' \| 'ready' \| 'failed'`, `updatedAt`) | `NotFoundError` |
| `reembed` | `knowledgeObjectId` | `EmbeddingStatus` | `NotFoundError`, `UpstreamProviderError` |
| `deleteEmbeddings` | `knowledgeObjectId` | `void` | — |

**Behavioral notes:** `embedObject` is invoked by the Vercel Route Handler that receives the Supabase Database Webhook, not by `NoteService`. `reembed` exists for maintenance (e.g., after an embedding model change in [07_AI.md](07_AI.md)) and is deliberately separate from the automatic save-triggered path. `getStatus` is exposed so the UI can show "indexing..." rather than silently having new notes be unsearchable semantically for a few seconds.

## 9. AttachmentService

| Method | Input | Output | Errors |
|---|---|---|---|
| `upload` | `{ content: <binary stream>, fileName, mimeType, noteId? }` | `Attachment` | `ValidationError`, `FileTooLargeError` |
| `get` | `attachmentId` | `Attachment` (includes fresh signed URL) | `NotFoundError` |
| `delete` | `attachmentId` | `void` | `NotFoundError` |
| `restore` | `attachmentId` | `Attachment` | `NotFoundError` |
| `list` | `options?: PaginationOptions` | `Paginated<Attachment>` | — |
| `addTag` / `removeTag` | `attachmentId, tagName` / `attachmentId, tagId` | `Attachment` | `NotFoundError` |

**Behavioral notes:** `upload` enforces the max-size limit (FR-ATTACH-3) before any bytes reach Storage, not after. `get` never returns a stored/cached signed URL — Storage URLs are generated fresh per call so a revoked or expired URL can't leak from a stale cache.

## 10. AIService

| Method | Input | Output | Errors |
|---|---|---|---|
| `streamChat` | `{ scope: 'note' \| 'vault', noteId?, conversationId?, message }` | `AsyncIterable<ChatStreamEvent>` | `ValidationError`, `RateLimitError`, `UpstreamProviderError` |
| `getConversation` | `conversationId` | `Conversation` | `NotFoundError` |
| `listConversations` | `{ scope? } & PaginationOptions` | `Paginated<Conversation>` | — |

`ChatStreamEvent` is a discriminated union: `{ type: 'token'; value: string } \| { type: 'citation'; knowledgeObjectId: string } \| { type: 'done'; messageId: string }`.

**Behavioral notes:**
- `streamChat` with `scope: 'vault'` calls `SearchService.semanticSearch` first to retrieve context, then assembles a prompt and streams the completion — the flow in [03_ARCHITECTURE.md §6.5](03_ARCHITECTURE.md#65-ai-request-flow-vault-chat-rag); chunking/prompt-template detail is [07_AI.md](07_AI.md)'s responsibility.
- `scope: 'note'` requires `noteId`; `scope: 'vault'` requires it to be absent — enforced as a `ValidationError`, mirroring the constraint on `chat_conversations.note_id` ([04_DATABASE.md §4.10](04_DATABASE.md#410-chat_conversations)).
- Every `citation` event's `knowledgeObjectId` corresponds to a real object the caller can fetch via `NoteService.get` — citations are never synthesized text, satisfying FR-AI-3.
- `streamChat` only ever produces a `ChatMessage` in the conversation it's called on. It has no method that mutates any other Knowledge Object — this is the concrete enforcement of FR-AI-5 ([01_PRODUCT.md §11](01_PRODUCT.md#11-non-goals-mvp)): the AI service layer, as specified, is structurally incapable of writing to the graph outside of chat history.

## 11. UserService

| Method | Input | Output | Errors |
|---|---|---|---|
| `getProfile` | — | `Profile` | — |
| `updateProfile` | `{ displayName? }` | `Profile` | `ValidationError` |
| `deleteAccount` | — | `void` | — |
| `createMcpCredential` | `name` | `{ rawToken: string; credential: McpCredential }` | `ValidationError` |
| `listMcpCredentials` | — | `McpCredential[]` (never includes `rawToken` or `tokenHash`) | — |
| `revokeMcpCredential` | `credentialId` | `void` | `NotFoundError` |

**`Profile` shape** (ADR-23): the type returned by `getProfile`/`updateProfile`.

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | `string` (uuid) | `profiles.id` | Equals the auth user id |
| `displayName` | `string \| null` | `profiles.display_name` | Null until the user sets one (null at signup) |
| `email` | `string` | verified session (`auth.users`) | Read-only here; account email changes are not in MVP scope. Sourced at read time, not stored on `profiles` |
| `createdAt` | `string` (ISO 8601) | `profiles.created_at` | |

**`updateProfile` validation contract** (ADR-23): `displayName` is trimmed of leading/trailing whitespace; an empty or whitespace-only value **clears** the name (stored as `null`); a non-empty value must be **1–80 characters** after trimming (any Unicode permitted) or the method throws `ValidationError`. Passing no `displayName` key leaves the stored value unchanged.

**Behavioral notes:** `createMcpCredential`'s `rawToken` is returned exactly once, at creation — it is never retrievable again, matching `mcp_credentials.token_hash`-only storage ([04_DATABASE.md §4.12](04_DATABASE.md#412-mcp_credentials)). `deleteAccount` is a service-layer orchestration: soft-delete every owned Knowledge Object, revoke every MCP credential, then — only after the FR-AUTH-6 grace period elapses — hand off to Supabase Auth account deletion, so deletion stays reversible until the grace period ends.

## 12. Cross-Service Interaction Rules

1. **Services may call each other synchronously for composition.** `AIService.streamChat` calls `SearchService.semanticSearch`; `GraphService` reads through the shared `knowledge_objects`/`links` tables directly, since the graph is a structural view over the envelope, not owned by any single type-specific service.
2. **Services never call each other to perform an async side effect.** The embedding pipeline is the one place this matters: `NoteService.update` does **not** call `EmbeddingService.embedObject`. That trigger is DB-webhook-driven ([03_ARCHITECTURE.md §6.4](03_ARCHITECTURE.md#64-embedding-pipeline)) specifically so `NoteService.update`'s latency is never coupled to OpenAI's.
3. **The `knowledge_objects` envelope table may be read directly by any service** (it's the shared supertype, not type-owned), but only `NoteService` and `AttachmentService` may *write* to it — each guards the invariant that its own subtype row and the envelope row stay consistent ([04_DATABASE.md §5](04_DATABASE.md#5-the-knowledge-object-supertypesubtype-pattern)).
4. **No service bypasses another service's public method to reach a type-owned table it doesn't own.** `GraphService` doesn't write to `notes`; `SearchService` doesn't write to `embeddings`. Ownership per §1's table is exhaustive.

## 13. Related Documents

- [03_ARCHITECTURE.md](03_ARCHITECTURE.md) — the layering rules this document's method boundaries implement, and the request flows (§6) that call these methods in sequence.
- [04_DATABASE.md](04_DATABASE.md) — the schema each service reads and writes.
- [06_MCP.md](06_MCP.md) — the MCP tool set, each tool a thin wrapper over one method above.
- [07_AI.md](07_AI.md) — chunking, prompt assembly, and streaming detail behind `AIService` and `EmbeddingService`.
- [08_SEARCH.md](08_SEARCH.md) — the ranking algorithm behind `SearchService.search`.
- [09_SECURITY.md](09_SECURITY.md) — rate limiting behind `RateLimitError`, and the full authorization model behind `ForbiddenError`.
