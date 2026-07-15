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
| 03 | ARCHITECTURE | ⏳ Planned |
| 04 | DATABASE | ⏳ Planned |
| 05 | API | ⏳ Planned |
| 06 | MCP | ⏳ Planned |
| 07 | AI | ⏳ Planned |
| 08 | SEARCH | ⏳ Planned |
| 09 | SECURITY | ⏳ Planned |
| 10 | DESIGN | ⏳ Planned |
| 11 | CONTRIBUTING | ⏳ Planned |
| 12 | TASKS | ⏳ Planned |

## Documents

### [01_PRODUCT.md](01_PRODUCT.md)
Why Second Brain exists. Introduces the **Knowledge Object** — the core abstraction every other document builds on (notes and attachments are the only MVP subtypes; everything else is a future connector) — plus vision, core philosophy, target users, guiding principles, product pillars (Collect/Connect/Discover/Collaborate), self-organizing knowledge as a long-term differentiator, and a competitive analysis against Obsidian, Notion, AppFlowy, Capacities, Reflect, and Logseq. Start here — every other document inherits its priorities from this one.

### [02_PRD.md](02_PRD.md)
The Product Requirements Document. ~55 functional requirements (`FR-KO-*` through `FR-MCP-*`) covering the Knowledge Object model and all MVP features, six end-to-end acceptance-criteria flows, non-functional requirement budgets (latency, uptime, durability), a six-milestone delivery plan (M0–M5), success metrics, and a future roadmap mapping every long-term feature to the MVP capability it depends on. Translates the vision in `01_PRODUCT.md` into buildable requirements.

### 03_ARCHITECTURE.md *(planned)*
System architecture: component diagrams, sequence diagrams for auth/search/embedding/AI request flows, storage architecture, deployment architecture, and future scalability considerations. The technical backbone that `04_DATABASE.md` through `08_SEARCH.md` implement in detail.

### 04_DATABASE.md *(planned)*
Complete database schema: tables, relationships, indexes, foreign keys, constraints, naming conventions, migration strategy, RLS policies, soft deletes, and audit strategy.

### 05_API.md *(planned)*
The logical service layer (not HTTP endpoints): `NoteService`, `FolderService`, `SearchService`, `AIService`, `GraphService`, `EmbeddingService`, `AttachmentService`, `UserService`. Every public method documented with inputs, outputs, errors, and examples.

### 06_MCP.md *(planned)*
Design of the MCP server — the mechanism that makes every note accessible to any MCP-compatible AI assistant. Tool definitions, schemas, resources, authentication, security considerations, and sample requests/responses.

### 07_AI.md *(planned)*
AI architecture: embedding strategy, chunking, context assembly, prompt templates, streaming, caching, rate limits, summarization, RAG, token budgeting, and model selection strategy.

### 08_SEARCH.md *(planned)*
Hybrid search design: full-text search, pgvector semantic search, ranking, backlinks, wiki links, snippets, suggestions, and performance considerations.

### 09_SECURITY.md *(planned)*
Authentication, authorization, RLS, secrets management, storage security, rate limiting, security headers, OWASP considerations, threat model, privacy, and data ownership.

### 10_DESIGN.md *(planned)*
The design system: typography, spacing, component philosophy, accessibility, dark mode, keyboard shortcuts, motion/animation, responsive behavior, and editor UX.

### 11_CONTRIBUTING.md *(planned)*
Coding standards, folder structure, naming conventions, testing strategy, commit conventions, PR requirements, architecture rules, and explicit rules for AI coding agents — including what they must never do.

### 12_TASKS.md *(planned)*
The master implementation backlog — roughly 250–400 independently implementable tasks, organized by phase and feature, with dependencies and complexity estimates. The document AI coding agents are assigned work from directly.
