# 02. Product Requirements Document (PRD)

> Part of the [Documentation Index](DOCUMENT_INDEX.md). Builds on [01_PRODUCT.md](01_PRODUCT.md) — read that first for the Knowledge Object model, product pillars, and MVP scope boundaries this document assumes. Precedes [03_ARCHITECTURE.md](DOCUMENT_INDEX.md#03_architecturemd-planned), which designs the system that satisfies these requirements.

## 1. Purpose & Scope

This document specifies *what* must be built for MVP, in enough detail that [12_TASKS.md](DOCUMENT_INDEX.md#12_tasksmd-planned) can decompose it into independently implementable tasks without re-deriving product decisions. It does not specify *how* — schema, service signatures, and UI design are [04_DATABASE.md](DOCUMENT_INDEX.md#04_databasemd-planned), [05_API.md](DOCUMENT_INDEX.md#05_apimd-planned), and [10_DESIGN.md](DOCUMENT_INDEX.md#10_designmd-planned)'s job respectively.

Every requirement below implements a feature already named in [01_PRODUCT.md §7](01_PRODUCT.md#7-product-pillars) (Product Pillars). If a requirement doesn't trace back to that table, it doesn't belong in MVP — raise it as a Future Roadmap item (§9) instead.

## 2. How to Read This Document

**Requirement IDs** are scoped by area: `FR-KO-*` (Knowledge Object, cross-cutting), `FR-AUTH-*`, `FR-NOTE-*`, `FR-FOLDER-*`, `FR-TAG-*`, `FR-LINK-*` (wiki links/backlinks), `FR-GRAPH-*`, `FR-ATTACH-*`, `FR-DAILY-*`, `FR-SEARCH-*` (full-text), `FR-SEM-*` (semantic/hybrid), `FR-AI-*` (chat), `FR-MCP-*`.

**Priority** follows MoSCoW, applied *within* MVP — everything in §4 is scoped to MVP; "Should"/"Could" items are not future-roadmap items, they're MVP items that can slip a milestone if time-constrained:

| Priority | Meaning |
|---|---|
| **Must** | MVP is not shippable without this. |
| **Should** | Expected in MVP; may slip one milestone under time pressure without blocking launch. |
| **Could** | Desirable polish; safe to cut from MVP entirely if needed. |

## 3. Feature List (MVP)

| Feature | Pillar ([01_PRODUCT §7](01_PRODUCT.md#7-product-pillars)) | Knowledge Object type(s) touched |
|---|---|---|
| Authentication & account | — (cross-cutting) | — |
| Markdown notes | Collect | Markdown Note |
| Folders | Collect | Markdown Note |
| Tags | Collect | Markdown Note, Attachment |
| Attachments | Collect | Attachment |
| Daily notes | Collect | Markdown Note |
| Wiki links | Connect | Markdown Note |
| Backlinks | Connect | Markdown Note |
| Graph view | Connect | Markdown Note |
| Full-text search | Discover | Markdown Note, Attachment |
| Semantic search | Discover | Markdown Note |
| AI chat (note-level) | Collaborate | Markdown Note |
| Vault chat | Collaborate | Markdown Note |
| MCP server | Collaborate | Markdown Note, Attachment |

## 4. Functional Requirements

### 4.1 Knowledge Object (cross-cutting)

Applies to every object type, present and future ([01_PRODUCT §2](01_PRODUCT.md#2-the-knowledge-object)).

| ID | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| FR-KO-1 | Every stored artifact is represented with a common metadata envelope: id, owner, type, title, created/updated timestamps, tags, deletion state. | A Markdown Note and an Attachment both expose the same envelope fields via the service layer, differing only in type-specific payload. | Must |
| FR-KO-2 | Any Knowledge Object may hold outbound links to any other Knowledge Object, independent of type. | Creating a link does not require the two objects to share a type. | Must |
| FR-KO-3 | Deletion is soft: a deleted object is recoverable for a defined retention window, not immediately purged. | Deleting a note removes it from all listings/search but it can be restored within the retention window (value set in [04_DATABASE.md](DOCUMENT_INDEX.md#04_databasemd-planned)). | Must |
| FR-KO-4 | Every Knowledge Object is scoped to exactly one owner in MVP. | No UI or API path exposes an object to a user other than its owner (see [09_SECURITY.md](DOCUMENT_INDEX.md#09_securitymd-planned)). | Must |
| FR-KO-5 | MVP implements exactly two Knowledge Object types: Markdown Note and Attachment. | No other object type is creatable through any client in MVP. | Must |

### 4.2 Authentication & Account

| ID | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| FR-AUTH-1 | Users can sign up and log in with email + password. | A new email/password pair creates an account and an authenticated session. | Must |
| FR-AUTH-2 | Users can sign up and log in via at least one OAuth provider. | Provider selection deferred to [03_ARCHITECTURE.md](DOCUMENT_INDEX.md#03_architecturemd-planned); Google is the default assumption. | Should |
| FR-AUTH-3 | Users can reset a forgotten password via an emailed verification link. | Password reset flow completes without support intervention. | Must |
| FR-AUTH-4 | Sessions persist securely across browser restarts until explicit logout or expiry. | Closing and reopening the browser does not require re-authentication within the session lifetime. | Must |
| FR-AUTH-5 | First successful signup provisions an empty, owned graph. | A brand-new user lands in an authenticated app shell with zero Knowledge Objects, not an error state. | Must |
| FR-AUTH-6 | Users can delete their account, which removes (or schedules removal of) all owned Knowledge Objects. | Account deletion is confirmable, reversible within a grace period, and irreversible after it. | Should |

### 4.3 Notes (Markdown Note)

| ID | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| FR-NOTE-1 | Users can create a note with a title and markdown body. | New note appears in the note list immediately after creation. | Must |
| FR-NOTE-2 | Users edit a note's body with a rich markdown editor that round-trips to plain markdown without data loss. | Content authored via the rich editor, exported, and re-imported is byte-equivalent in markdown semantics. | Must |
| FR-NOTE-3 | Renaming a note does not break existing wiki links pointing to it. | Links resolve by stable object ID, not by title string (see FR-LINK-2). | Must |
| FR-NOTE-4 | Users can delete a note. | Deletion follows FR-KO-3 (soft delete). | Must |
| FR-NOTE-5 | Notes autosave without an explicit save action. | Navigating away from an edited note does not prompt "save changes?" or lose edits. | Must |
| FR-NOTE-6 | The system retains enough edit metadata to show "last edited" time. | Note list/detail view displays last-modified timestamp. Full version history is out of scope for MVP ([01_PRODUCT §11](01_PRODUCT.md#11-non-goals-mvp)). | Should |

### 4.4 Folders

| ID | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| FR-FOLDER-1 | Users organize notes into a nested folder hierarchy. | A folder can contain notes and other folders to arbitrary depth. | Must |
| FR-FOLDER-2 | Users move a note between folders without changing its identity or breaking links. | Moving a note preserves its ID, tags, and all incoming/outgoing links. | Must |
| FR-FOLDER-3 | Deleting a non-empty folder requires the user to choose what happens to its contents. | Deleting a folder never silently deletes the notes inside it — user is prompted to delete or relocate them. | Must |

### 4.5 Tags

| ID | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| FR-TAG-1 | Users assign zero or more tags to any Knowledge Object. | Both notes and attachments can be tagged. | Must |
| FR-TAG-2 | Tags are creatable inline while editing, with no separate tag-management step. | Typing a new tag name while editing a note creates it on save if it doesn't already exist. | Must |
| FR-TAG-3 | Users browse/filter Knowledge Objects by tag. | Selecting a tag shows every object carrying it, across folders. | Must |

### 4.6 Wiki Links & Backlinks

| ID | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| FR-LINK-1 | Users create a wiki-style link to another note using `[[note title]]` syntax. | Typing `[[` followed by a title and closing brackets renders as a navigable link. | Must |
| FR-LINK-2 | Wiki links resolve to a stable object ID at save time, not at render time. | Renaming the target note updates the link's display text without re-parsing the linking note's body. | Must |
| FR-LINK-3 | The editor offers autocomplete suggestions when typing `[[`. | A dropdown of matching note titles appears and is keyboard-navigable. | Should |
| FR-LINK-4 | Links to a note that doesn't yet exist support "create on click." | Clicking an unresolved link creates the target note and navigates to it. | Should |
| FR-LINK-5 | Every note displays a backlinks panel listing notes that link to it. | Opening a note shows an accurate, non-empty backlinks panel when at least one inbound link exists. | Must |
| FR-LINK-6 | Backlinks update within one page load after the linking note is saved. | No manual refresh or reindex step is required to see a new backlink. | Must |

### 4.7 Graph View

| ID | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| FR-GRAPH-1 | Users view a visual graph of notes as nodes and wiki links as edges. | Graph view renders the full owned graph on request. | Must |
| FR-GRAPH-2 | Users open a note directly from a graph node. | Clicking a node navigates to that note. | Must |
| FR-GRAPH-3 | Graph view supports filtering by tag and/or folder. | Applying a filter visually reduces the rendered node/edge set accordingly. | Should |
| FR-GRAPH-4 | Graph view supports a local-graph mode (a note and its immediate neighbors) in addition to global. | Opening local-graph from a note shows only that note and its direct links. | Should |

### 4.8 Attachments

| ID | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| FR-ATTACH-1 | Users upload a file as an Attachment object and reference it from a note. | Uploaded file appears embedded/linked in the note and is independently listable. | Must |
| FR-ATTACH-2 | Attachments are stored with the same ownership-based access control as other Knowledge Objects. | A second user cannot fetch another user's attachment by any means, including direct storage URL (see [09_SECURITY.md](DOCUMENT_INDEX.md#09_securitymd-planned)). | Must |
| FR-ATTACH-3 | The system enforces a maximum upload file size and rejects oversized uploads with a clear error. | Oversized upload fails client-side with an explicit message, not a silent truncation or server error. | Must |
| FR-ATTACH-4 | Image attachments render inline in note preview. | An uploaded image displays as an image, not a download link, in the rendered note. | Should |

### 4.9 Daily Notes

| ID | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| FR-DAILY-1 | Users open "today's" note with one action; if absent, it's created automatically from a template. | A single click/shortcut opens today's note whether or not it already existed. | Must |
| FR-DAILY-2 | Users navigate to the daily note for any past or future date. | A date picker or equivalent opens the note for an arbitrary date, creating it on demand. | Should |
| FR-DAILY-3 | Daily notes are ordinary Markdown Note objects distinguished only by naming/date convention. | No separate "daily note" object type exists in the data model ([01_PRODUCT §2](01_PRODUCT.md#2-the-knowledge-object)). | Must |

### 4.10 Search (Full-Text)

| ID | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| FR-SEARCH-1 | Users full-text search across all owned Knowledge Objects (titles + body). | A query matching text anywhere in a note's title or body returns that note. | Must |
| FR-SEARCH-2 | Results show a relevant snippet with the matching term highlighted. | Each result row displays surrounding context, not just the title. | Must |
| FR-SEARCH-3 | Search is scoped to the requesting user's graph only. | No query can return another user's objects, tested explicitly (see [09_SECURITY.md](DOCUMENT_INDEX.md#09_securitymd-planned)). | Must |
| FR-SEARCH-4 | Search returns results within the latency budget defined in §6. | p95 measured in production meets the NFR target. | Must |

### 4.11 Semantic Search

| ID | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| FR-SEM-1 | Users run a natural-language query and get results ranked by semantic similarity, not just keyword match. | A query with no literal keyword overlap still surfaces conceptually related notes. | Must |
| FR-SEM-2 | Full-text and semantic results are combined into a single hybrid-ranked result set. | Search UI presents one ranked list, not two separate result panels (ranking detail in [08_SEARCH.md](DOCUMENT_INDEX.md#08_searchmd-planned)). | Must |
| FR-SEM-3 | New and edited notes are re-embedded asynchronously without blocking save. | Saving a note returns immediately; embedding availability lags by a bounded, monitored delay (see [07_AI.md](DOCUMENT_INDEX.md#07_aimd-planned)). | Must |

### 4.12 AI Chat & Vault Chat

| ID | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| FR-AI-1 | Users converse with an AI assistant scoped to a single note (summarize, ask questions, request edits). | Note-level chat answers questions using that note's content as context. | Must |
| FR-AI-2 | Users converse with a "vault chat" that retrieves and cites information across the entire graph. | A vault-chat question answerable only by combining two different notes returns a correct, sourced answer. | Must |
| FR-AI-3 | AI responses referencing specific notes include citations/links back to the source note(s). | Every factual claim traceable to a note renders as a clickable reference. | Must |
| FR-AI-4 | AI chat responses stream to the UI token-by-token. | Response text appears incrementally, not after a full-response wait. | Should |
| FR-AI-5 | AI chat in MVP is read/answer-oriented and never autonomously writes to the graph. | No chat interaction modifies a note without an explicit, separate user-confirmed action ([01_PRODUCT §8](01_PRODUCT.md#8-self-organizing-knowledge), [§11](01_PRODUCT.md#11-non-goals-mvp)). | Must |

### 4.13 MCP Server

| ID | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| FR-MCP-1 | The system exposes an MCP server that authenticates the requesting client to one user's graph. | Connecting an MCP client requires a credential tied to exactly one Second Brain account. | Must |
| FR-MCP-2 | The MCP server exposes tools to search, read, create, and update Knowledge Objects via the same service layer as the web app. | An MCP tool call and an equivalent web-app action produce identical resulting state ([01_PRODUCT §6.6](01_PRODUCT.md#6-guiding-principles)). | Must |
| FR-MCP-3 | Any MCP-compatible client can connect using the same server, without Second-Brain-specific client code. | Claude Desktop, Cursor, and at least one other MCP client each connect and successfully call a tool, using only standard MCP configuration. | Must |
| FR-MCP-4 | MCP write operations enforce the same ownership/authorization rules as the web app. | An MCP client cannot read or write another user's objects under any tool call (see [09_SECURITY.md](DOCUMENT_INDEX.md#09_securitymd-planned)). | Must |

## 5. Acceptance Criteria — Key Flows

Requirement-level acceptance criteria (§4) cover individual behaviors. These six flows are cross-cutting and worth stating end-to-end, since they're where integration bugs hide.

**Account signup**
Given a visitor with no account, when they complete email/password signup, then they land in an authenticated app shell with an empty, owned graph (FR-AUTH-1, FR-AUTH-5) and no error state.

**Create a note and link it**
Given an existing note A, when the user creates note B and writes `[[A]]` in its body, then note A's backlinks panel lists note B without a manual refresh (FR-LINK-1, FR-LINK-5, FR-LINK-6).

**Rename a linked note**
Given note A is linked from note B via `[[A]]`, when the user renames A to "A2", then the link in B still resolves and displays "A2" — B's raw markdown content is unchanged except through the rename, not re-parsed as broken text (FR-NOTE-3, FR-LINK-2).

**Hybrid search**
Given a graph containing a note about "quarterly planning" that never uses the word "roadmap," when the user searches "roadmap," then that note appears in results, ranked alongside any literal keyword matches (FR-SEM-1, FR-SEM-2).

**Vault chat with citations**
Given two notes that together answer a question neither answers alone, when the user asks vault chat that question, then the response is correct and cites both source notes as links (FR-AI-2, FR-AI-3).

**External MCP client read/write**
Given a user has connected Claude Desktop as an MCP client, when they ask it to create a note, then the note appears in the Second Brain web app under that user's graph, owned by that user, indistinguishable from a web-created note (FR-MCP-1, FR-MCP-2, FR-MCP-4).

## 6. Non-Functional Requirements

| Category | Requirement | Target | Rationale |
|---|---|---|---|
| Performance — note open | p95 time from navigation to editable content rendered | < 200ms | [01_PRODUCT §6.5](01_PRODUCT.md#6-guiding-principles) — "speed is a feature." |
| Performance — full-text search | p95 query-to-results latency | < 300ms | Search must feel instant to replace habitual note-scanning. |
| Performance — hybrid/semantic search | p95 query-to-results latency | < 800ms | Vector search + ranking is inherently costlier than full-text; still must feel responsive. |
| Performance — AI chat first token | p95 time to first streamed token | < 1.5s | Bounded mostly by the upstream model provider; app-layer overhead budgeted separately at < 300ms. |
| Performance — graph view | Interactive (pan/zoom) at 60fps | Up to 2,000 nodes | Beyond this, local-graph mode (FR-GRAPH-4) is the intended interaction, not global rendering. |
| Availability | Monthly uptime | ≥ 99.5% | Matches what's achievable on managed Vercel + Supabase without custom infrastructure ([01_PRODUCT §6.1](01_PRODUCT.md#6-guiding-principles)). |
| Scalability | Search and note-open latency budgets hold at | ≥ 10,000 notes per user graph | Must remain index-backed, not full-scan, at realistic power-user vault sizes (see [08_SEARCH.md](DOCUMENT_INDEX.md#08_searchmd-planned)). |
| Data durability | Silent data loss incidents | Zero tolerance | Not a target range — a knowledge base that loses data has failed its core purpose regardless of any other metric. |
| Security | Cross-user data access | Zero tolerance, enforced at the database layer (RLS), not application logic alone | See [09_SECURITY.md](DOCUMENT_INDEX.md#09_securitymd-planned). |
| Accessibility | Core flows (auth, note edit, search, chat) | WCAG 2.1 AA | See [10_DESIGN.md](DOCUMENT_INDEX.md#10_designmd-planned). |
| Browser support | Desktop web | Latest 2 versions of Chrome, Firefox, Safari, Edge | No legacy browser support commitment for a new product. |
| Observability | Every service-layer method call | Logged/traceable sufficient to debug a production incident without local repro | Mechanism deferred to [03_ARCHITECTURE.md](DOCUMENT_INDEX.md#03_architecturemd-planned). |

## 7. Milestones

| Milestone | Goal | Key Deliverables | Exit Criteria |
|---|---|---|---|
| **M0 — Foundations** | Deployable skeleton | Repo scaffold, Supabase project, base Knowledge Object schema, auth (§4.2), CI/CD to Vercel | A user can sign up, log in, and see an empty authenticated app shell in production. |
| **M1 — Collect** | Capture works end-to-end | Notes, folders, tags, attachments, daily notes (§4.3–§4.5, §4.8–§4.9) | A user can create, edit, organize, tag, and delete notes and attachments entirely in production. |
| **M2 — Connect** | The graph exists | Wiki links, backlinks, graph view (§4.6–§4.7) | A user can link notes, see accurate backlinks, and visually navigate the graph. |
| **M3 — Discover** | Everything is findable | Full-text search, embedding pipeline, hybrid search (§4.10–§4.11) | A user can find any owned note by keyword or natural-language query within the §6 latency budgets. |
| **M4 — Collaborate** | AI is a first-class participant | Note chat, vault chat, MCP server (§4.12–§4.13) | A user can converse with their graph in-app, and connect an external MCP client to read and write it. |
| **M5 — Launch Readiness** | Ship publicly | Performance hardening against §6 budgets, security review ([09_SECURITY.md](DOCUMENT_INDEX.md#09_securitymd-planned)), accessibility pass ([10_DESIGN.md](DOCUMENT_INDEX.md#10_designmd-planned)) | §6 NFR budgets hold under production monitoring; security review signed off; public beta opens. |

Milestones are sequential by dependency (M2 requires M1's note model; M3's embeddings require M1's notes to embed; M4's vault chat requires M3's retrieval). Within a milestone, "Should"/"Could" requirements (§2) may be deferred to the next milestone without blocking exit criteria, since exit criteria are written against "Must" requirements only.

## 8. Success Metrics

**Product / adoption** — targets are placeholders for the team to calibrate post-launch, not commitments made by this document:

| Metric | Definition | Why it matters |
|---|---|---|
| Activation rate | % of signups that create ≥ 3 Knowledge Objects in their first session | Measures whether Collect (§4.3–§4.9) is frictionless enough to reach the "aha" moment. |
| Week-4 retention | % of signups who open the app at least once in week 4 | A knowledge base's value is realized over time, not in one session. |
| AI engagement | % of weekly-active users using note chat or vault chat at least once/week | Validates the "AI-native" philosophy ([01_PRODUCT §4](01_PRODUCT.md#4-core-philosophy)) isn't a novelty. |
| MCP adoption | % of weekly-active users with ≥ 1 connected external MCP client | Validates the "MCP-first" philosophy — a low number here means the MCP server exists but isn't the differentiator it's meant to be. |

**Engineering SLIs** — directly tied to §6 NFR budgets, tracked continuously, not just at launch:

| Metric | Target |
|---|---|
| Note-open p95 latency | < 200ms |
| Full-text search p95 latency | < 300ms |
| Hybrid search p95 latency | < 800ms |
| Monthly uptime | ≥ 99.5% |
| Embedding pipeline lag (save → embedded) | Bounded and monitored (specific target set in [07_AI.md](DOCUMENT_INDEX.md#07_aimd-planned)) |
| Data-loss incidents | Zero |

## 9. Future Roadmap

Every item below is explicitly out of MVP scope ([01_PRODUCT §11](01_PRODUCT.md#11-non-goals-mvp)). Listed here so `12_TASKS.md` never accidentally schedules one, and so the Knowledge Object model (§4.1) is validated against the shape of what it will eventually need to support.

| Feature | Description | Depends on (MVP capability) |
|---|---|---|
| GitHub integration | Repositories/files as Knowledge Objects | FR-KO-5 extended with a new object type |
| Jira integration | Tickets as Knowledge Objects | FR-KO-5 extended; FR-MCP-2 pattern reused |
| Confluence integration | Pages as Knowledge Objects | FR-KO-5 extended |
| Slack integration | Threads as Knowledge Objects | FR-KO-5 extended |
| Google Drive integration | Documents as Knowledge Objects | FR-KO-5 extended |
| Email integration | Messages as Knowledge Objects | FR-KO-5 extended |
| Calendar integration | Events as Knowledge Objects | FR-KO-5 extended |
| OCR | Makes PDF/Image object types searchable and embeddable | FR-SEARCH-*, FR-SEM-* generalized beyond Markdown Note |
| Voice notes | Audio as a Knowledge Object with transcription | FR-KO-5 extended; embedding pipeline (FR-SEM-3) |
| Tasks | Structured, queryable task objects | FR-KO-5 extended |
| Canvas | Freeform visual composition of Knowledge Objects | FR-GRAPH-* rendering layer reused |
| Whiteboard | Freeform visual ideation surface | Independent of Knowledge Object model |
| Version history | Full revision history per object | FR-NOTE-6 (currently: last-edited metadata only) |
| Self-organizing knowledge | AI-proposed merges, auto-links, canonical notes | FR-MCP-2 write path; [01_PRODUCT §8](01_PRODUCT.md#8-self-organizing-knowledge) |
| Shared / team graphs | Multi-owner graphs | FR-KO-4 relaxed from single-owner; [01_PRODUCT §5](01_PRODUCT.md#5-target-users) |

## 10. Out of Scope (MVP)

This document does not restate [01_PRODUCT.md §11 (Non-Goals)](01_PRODUCT.md#11-non-goals-mvp) — it is the authoritative list of what MVP deliberately excludes and why. Every requirement in §4 above was checked against it before being included here.

## 11. Related Documents

- [01_PRODUCT.md](01_PRODUCT.md) — the vision, Knowledge Object model, and pillars this document turns into requirements.
- [03_ARCHITECTURE.md](DOCUMENT_INDEX.md#03_architecturemd-planned) — the system design satisfying these requirements, including the auth provider decision (FR-AUTH-2) and observability mechanism (§6).
- [04_DATABASE.md](DOCUMENT_INDEX.md#04_databasemd-planned) — the schema implementing the Knowledge Object envelope (§4.1) and soft-delete retention window (FR-KO-3).
- [07_AI.md](DOCUMENT_INDEX.md#07_aimd-planned) — the embedding pipeline behind FR-SEM-3 and the chat design behind §4.12.
- [08_SEARCH.md](DOCUMENT_INDEX.md#08_searchmd-planned) — the ranking algorithm behind FR-SEM-2.
- [09_SECURITY.md](DOCUMENT_INDEX.md#09_securitymd-planned) — the authorization model referenced throughout §4 and §6.
- [12_TASKS.md](DOCUMENT_INDEX.md#12_tasksmd-planned) — the backlog decomposing every FR above into implementable tasks.
