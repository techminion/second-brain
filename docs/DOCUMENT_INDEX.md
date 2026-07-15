# Second Brain — Documentation Index

This is the single source of truth for the Second Brain engineering documentation set. Every implementation decision — by a human or an AI coding agent — should trace back to one of these documents. If a decision isn't covered here, the docs are incomplete; raise it before writing code.

**Audience:** senior engineers and AI coding agents implementing the product.

**Source brief:** [.claude/ARCHITECT_PROMPT.md](../.claude/ARCHITECT_PROMPT.md) defines the scope and constraints for this documentation set.

**Read order:** the numbering below is the intended reading order for someone onboarding cold. Later documents assume familiarity with earlier ones (e.g. `05_API.md` assumes `04_DATABASE.md`).

## Status

| # | Document | Status |
|---|----------|--------|
| 01 | PRODUCT | ✅ Created |
| 02 | PRD | ✅ Created |
| 03 | ARCHITECTURE | ✅ Created |
| 04 | DATABASE | ✅ Created |
| 05 | API | ✅ Created |
| 06 | MCP | ✅ Created |
| 07 | AI | ✅ Created |
| 08 | SEARCH | ✅ Created |
| 09 | SECURITY | ✅ Created |
| 10 | DESIGN | ✅ Created |
| 11 | CONTRIBUTING | ✅ Created |
| 12 | TASKS | ✅ Created |

## Documents

### [01_PRODUCT.md](01_PRODUCT.md)
Why Second Brain exists. Introduces the **Knowledge Object** — the core abstraction every other document builds on (notes and attachments are the only MVP subtypes; everything else is a future connector) — plus vision, core philosophy, target users, guiding principles, product pillars (Collect/Connect/Discover/Collaborate), self-organizing knowledge as a long-term differentiator, and a competitive analysis against Obsidian, Notion, AppFlowy, Capacities, Reflect, and Logseq. Start here — every other document inherits its priorities from this one.

### [02_PRD.md](02_PRD.md)
The Product Requirements Document. ~55 functional requirements (`FR-KO-*` through `FR-MCP-*`) covering the Knowledge Object model and all MVP features, six end-to-end acceptance-criteria flows, non-functional requirement budgets (latency, uptime, durability), a six-milestone delivery plan (M0–M5), success metrics, and a future roadmap mapping every long-term feature to the MVP capability it depends on. Translates the vision in `01_PRODUCT.md` into buildable requirements.

### [03_ARCHITECTURE.md](03_ARCHITECTURE.md)
System architecture: a layered monolith on Vercel + Supabase, with component and sequence diagrams for auth, standard read/write, hybrid search, the async embedding pipeline, AI chat (RAG), and MCP requests. Includes storage/deployment architecture, 7 Architecture Decision Records, and an explicit table of infrastructure (Docker, Redis, Kafka, Kubernetes, microservices) deliberately excluded and the triggers that would revisit each. The technical backbone that `04_DATABASE.md` through `08_SEARCH.md` implement in detail.

### [04_DATABASE.md](04_DATABASE.md)
Complete database schema: 13 tables implementing the Knowledge Object supertype/subtype pattern (`knowledge_objects` + `notes`/`attachments`), an ER diagram, naming conventions, indexes, constraints, 5 schema-level ADRs (denormalized `owner_id` for RLS, `text`+`CHECK` over native enums, etc.), soft-delete mechanics, uniform RLS policy shape, a minimal append-only audit log, migration strategy, and the future-schema implications (new object types, shared graphs, version history) flagged in advance.

### [05_API.md](05_API.md)
The logical service layer (not HTTP endpoints): `NoteService`, `FolderService`, `SearchService`, `GraphService`, `EmbeddingService`, `AttachmentService`, `AIService`, `UserService`. Every public method documented with inputs, outputs, and a shared, closed error taxonomy, plus cross-service interaction rules (e.g., why `NoteService` never calls `EmbeddingService` directly).

### [06_MCP.md](06_MCP.md)
Design of the MCP server — the mechanism that makes the graph accessible to any MCP-compatible AI assistant. 14 tools and 2 resources, each mapped to a `05_API.md` method; authentication via per-user bearer credentials; an explicit list of what's deliberately *not* exposed (chat, attachment upload, credential management) and why; security considerations including prompt injection via note content; and how future connectors extend the same pattern.

### [07_AI.md](07_AI.md)
AI architecture: model-tier selection (not hardcoded model names), embedding strategy and chunking, RAG context assembly, a fixed 4-part prompt template with a non-negotiable citation requirement, token budgeting, SSE streaming with mid-stream failure handling, caching (embeddings *are* the cache), rate limits, and why summarization has no persisted artifact in MVP.

### [08_SEARCH.md](08_SEARCH.md)
Hybrid search: full-text search (`tsvector`/`ts_rank_cd`), semantic search (pgvector, HNSW over IVFFlat with rationale), Reciprocal Rank Fusion for combining the two with a worked example, backlinks, trigram-based `[[` autocomplete kept deliberately separate from ranked search for latency, match-type-aware snippet generation, and performance techniques for the search latency budgets in `02_PRD.md`.

### [09_SECURITY.md](09_SECURITY.md)
The threat-model-driven security authority: fail-closed principles, the three-layer authorization model (RLS floor → service layer → surface layer), an exhaustive enumeration of service-role-key usage (exactly two places), concrete rate-limit starting values, security headers, a 9-threat model (including prompt injection and cost exhaustion), OWASP Top 10 mapping, and the privacy/data-ownership commitments — including an honest statement of why E2E encryption is structurally incompatible with the product.

### [10_DESIGN.md](10_DESIGN.md)
The design system: semantic design tokens (typography, spacing, single-accent color) that make dark mode a token swap, shadcn/ui component philosophy, the live-formatted-markdown editor UX decision (Obsidian-style hybrid, not raw+preview), WCAG 2.1 AA by construction, the full keyboard shortcut map anchored on a `⌘K` command palette, motion rules, graph-view UX, and desktop-first responsive behavior.

### [11_CONTRIBUTING.md](11_CONTRIBUTING.md)
The engineering rulebook: feature-first folder structure with import-boundary enforcement, coding standards (each with its enforcement mechanism), naming conventions, a layered testing strategy (including mandatory cross-user RLS tests per table), commit/PR conventions, the load-bearing architecture rules restated as review-time checks, explicit rules for AI coding agents, and the hard-floor "never do" list.

### [12_TASKS.md](12_TASKS.md)
The master implementation backlog: 306 tasks across 6 phases matching the PRD milestones (Foundations → Collect → Connect → Discover → Collaborate → Launch Readiness), each with a stable ID, complexity estimate (S/M/L), explicit dependencies, and a traceable reference to the requirement or design decision it implements. Ends with post-MVP backlog seeds deliberately left undecomposed. The document AI coding agents are assigned work from directly.
