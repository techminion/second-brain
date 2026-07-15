# Second Brain — Project Context

> **Load this file first in every AI session.** It is a digest — the 12-document spec in `docs/` is the source of truth, and on any conflict, `docs/` wins (GOV-4, [docs/DECISIONS.md](../docs/DECISIONS.md)). After this file, read [docs/PROJECT_STATE.md](../docs/PROJECT_STATE.md), then [.ai/TASK_QUEUE.md](TASK_QUEUE.md).

## Vision

Second Brain is an **AI-native knowledge operating system** — not a note-taking app with AI features, but a knowledge graph with a note-taking interface. Every artifact is a **Knowledge Object** (MVP: Markdown Note and Attachment; future: PDFs, GitHub, Jira, Slack, email, calendar…) in one unified graph. Humans use a markdown editor and search; AI assistants use the **Model Context Protocol (MCP)** — the same service layer, the same guarantees. Full story: [docs/01_PRODUCT.md](../docs/01_PRODUCT.md).

Nine philosophy commitments (01_PRODUCT §4): Markdown-first · AI-native · Cloud-hosted · MCP-first · Fast · Extensible · Open · Unified knowledge graph · **Knowledge compounds** (every interaction should increase the graph's long-term value).

## Goals (MVP)

Four pillars → six milestones (M0 Foundations → M5 Launch Readiness, [docs/ROADMAP.md](../docs/ROADMAP.md)):

| Pillar | MVP scope |
|---|---|
| Collect | Notes, folders, tags, attachments, daily notes |
| Connect | Wiki links, backlinks, graph view |
| Discover | Full-text + semantic (hybrid RRF) search |
| Collaborate | Note/vault AI chat with citations, MCP server (14 tools) |

57 functional requirements in [docs/02_PRD.md](../docs/02_PRD.md); 309 tasks in [docs/12_TASKS.md](../docs/12_TASKS.md).

## Architecture

**Layered monolith on managed infrastructure.** One Next.js app on Vercel + one Supabase project. Explicitly excluded until a measured need exists: Docker, Redis, Kafka, Kubernetes, RabbitMQ, microservices ([docs/03_ARCHITECTURE.md §12](../docs/03_ARCHITECTURE.md#12-explicitly-excluded-infrastructure)).

```
Browser ──> UI (React) ──> Web API (route handlers) ──┐
MCP clients ──────────────> MCP Server (route handler) ─┤──> Service Layer ──> Repositories ──> Supabase (Postgres+pgvector, Auth, Storage)
                                                        └──────────────────────> OpenAI (chat + embeddings)
```

Load-bearing facts:
- **All business logic lives in the service layer** (8 services, [docs/05_API.md](../docs/05_API.md)). UI and route handlers are thin. The MCP server calls the *same* services as the web app — that's what guarantees FR-MCP-2 parity.
- **Postgres RLS is the authorization floor** (`owner_id = auth.uid()` on every table, [docs/04_DATABASE.md §7](../docs/04_DATABASE.md#7-row-level-security-rls-policies)). The service-role key is allowed in exactly two places ([docs/09_SECURITY.md §5](../docs/09_SECURITY.md#5-service-role-key-usage)).
- **Embeddings are asynchronous**: note save → DB webhook → Vercel endpoint → OpenAI → pgvector. Never synchronous on save.
- **Schema**: class-table inheritance — `knowledge_objects` envelope + `notes`/`attachments` subtypes; 13 tables ([docs/04_DATABASE.md](../docs/04_DATABASE.md)).
- **Search**: tsvector full-text + pgvector HNSW semantic, merged with Reciprocal Rank Fusion, run concurrently ([docs/08_SEARCH.md](../docs/08_SEARCH.md)).

## Tech Stack

Canonical table: [docs/03_ARCHITECTURE.md §2.1](../docs/03_ARCHITECTURE.md#21-technology-stack). Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind + shadcn/ui · TanStack Query · React Hook Form · Tiptap · React Flow · Supabase (Postgres, pgvector, Auth, Storage, RLS) · OpenAI · Vercel.

## Folder Structure

Feature-first ([docs/11_CONTRIBUTING.md §2](../docs/11_CONTRIBUTING.md#2-folder-structure)):

```
src/app/            routes + thin route handlers only
src/features/<x>/   components/ hooks/ <x>-service.ts <x>-repository.ts types.ts
src/shared/         ui/ (shadcn primitives) · lib/ (clients, errors) · types/
supabase/migrations/
docs/               the spec + governance    .ai/  agent context    agents/  role definitions
```

## Coding Philosophy

- The docs are the spec. Ambiguity → ask, never invent product decisions.
- No business logic in components or route handlers; only repositories touch the DB; `userId` always comes from the verified session, never from input.
- Every new table ships with RLS + a cross-user denial test, same PR.
- Strong typing everywhere; no `any` at service boundaries; errors only from the closed taxonomy ([docs/05_API.md §3](../docs/05_API.md#3-error-taxonomy)).
- Design tokens only — no raw hex/px; dark mode is a token swap ([docs/10_DESIGN.md](../docs/10_DESIGN.md)).
- Tests per [docs/11_CONTRIBUTING.md §5](../docs/11_CONTRIBUTING.md#5-testing-strategy); AI calls always mocked in tests.
- Documentation is part of implementation — no task is done until [docs/PROJECT_STATE.md](../docs/PROJECT_STATE.md) and [docs/AI_HANDOFF.md](../docs/AI_HANDOFF.md) are updated.

## Where to Go Deeper

| Question | Read |
|---|---|
| Why does this product exist? | [docs/01_PRODUCT.md](../docs/01_PRODUCT.md) |
| What exactly must be built? | [docs/02_PRD.md](../docs/02_PRD.md) |
| How do components fit together? | [docs/03_ARCHITECTURE.md](../docs/03_ARCHITECTURE.md) |
| Schema / service contracts / MCP tools? | [docs/04](../docs/04_DATABASE.md) / [05](../docs/05_API.md) / [06](../docs/06_MCP.md) |
| AI, search internals? | [docs/07_AI.md](../docs/07_AI.md), [docs/08_SEARCH.md](../docs/08_SEARCH.md) |
| Security, design, contribution rules? | [docs/09](../docs/09_SECURITY.md) / [10](../docs/10_DESIGN.md) / [11](../docs/11_CONTRIBUTING.md) |
| What do I work on? | [.ai/TASK_QUEUE.md](TASK_QUEUE.md) → [docs/12_TASKS.md](../docs/12_TASKS.md) |
