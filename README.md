# Second Brain

An AI-native knowledge operating system: a unified knowledge graph of markdown notes (and, over time, other Knowledge Object types) that both humans and AI assistants can read, search, and extend — humans through a modern editor, AI through the [Model Context Protocol](https://modelcontextprotocol.io).

> **Status:** pre-implementation. The complete engineering specification is written and audited; implementation begins with milestone M0.

## Start Here

| You are… | Read |
|---|---|
| Anyone new to the project | [docs/DOCUMENT_INDEX.md](docs/DOCUMENT_INDEX.md) — the spec's table of contents and read order |
| An AI coding agent starting a session | [.ai/PROJECT_CONTEXT.md](.ai/PROJECT_CONTEXT.md), then [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md), then [.ai/TASK_QUEUE.md](.ai/TASK_QUEUE.md) |
| Looking for what to build | [docs/12_TASKS.md](docs/12_TASKS.md) (309-task backlog) via [.ai/TASK_QUEUE.md](.ai/TASK_QUEUE.md) (live queue) |
| Contributing code | [docs/11_CONTRIBUTING.md](docs/11_CONTRIBUTING.md) — the rulebook, including rules for AI agents |

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind + shadcn/ui · Tiptap · React Flow · Supabase (Postgres + pgvector, Auth, Storage, RLS) · OpenAI · Vercel — canonical table in [docs/03_ARCHITECTURE.md §2.1](docs/03_ARCHITECTURE.md#21-technology-stack).

This project is documentation-driven: the docs are the source of truth, and no feature is complete until its documentation is updated.
