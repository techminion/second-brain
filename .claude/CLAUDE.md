# Second Brain

Welcome to the Second Brain repository.

Before making any changes, understand that this project is documentation-driven.

The documentation is the source of truth.

If code and documentation disagree, do not guess.

Stop and explain the inconsistency.

---

# Project Vision

Second Brain is an AI-native Knowledge Operating System.

It is **not** simply a note-taking application.

The goal is to create a durable knowledge graph that both humans and AI agents can use through the Model Context Protocol (MCP).

Optimize for long-term maintainability over short-term implementation speed.

---

# Read Order

Load `.ai/PROJECT_CONTEXT.md` first — it is the session-start digest.

For deeper work, read the spec in order (the index is `docs/DOCUMENT_INDEX.md`):

1. docs/01_PRODUCT.md
2. docs/02_PRD.md
3. docs/03_ARCHITECTURE.md
4. docs/04_DATABASE.md
5. docs/05_API.md
6. docs/06_MCP.md

If implementing AI features:

- docs/07_AI.md
- docs/08_SEARCH.md

If implementing UI:

- docs/10_DESIGN.md

If implementing security-sensitive code:

- docs/09_SECURITY.md

Every implementer, regardless of area:

- docs/11_CONTRIBUTING.md (the rulebook)
- docs/12_TASKS.md (the backlog your task comes from)

---

# Architecture Rules

Authoritative list: `.ai/ARCHITECTURE_RULES.md`. Quick digest:

Never:

- Access Supabase directly from React components.
- Put business logic inside UI components.
- Duplicate business logic.
- Introduce infrastructure not documented in the architecture.
- Use `any`.
- Expose service keys.
- Bypass Row Level Security.

Always:

- Use the service layer.
- Keep components focused.
- Prefer composition over duplication.
- Write strongly typed code.
- Follow the documented folder structure.

---

# Development Workflow

The authoritative pipeline and session protocol live in `.ai/AGENT_WORKFLOW.md`:

Architect → Implementation → Review → Testing → Documentation → Merge

Nothing is complete until documentation is updated.

---

# Before Starting Work

Review:

- `.ai/PROJECT_CONTEXT.md` (always first)
- `docs/PROJECT_STATE.md`
- `.ai/TASK_QUEUE.md`
- `docs/AI_HANDOFF.md` (top entry)

Understand:

- current milestone
- active work
- blockers
- next priority

Do not duplicate work already in progress. Claim your task in `.ai/TASK_QUEUE.md` before writing code.

---

# After Completing Work

Update:

- `docs/PROJECT_STATE.md`
- `docs/AI_HANDOFF.md` (append an entry)
- `.ai/TASK_QUEUE.md` (statuses)
- `docs/CHANGELOG.md` (if user-visible behavior changed)
- `docs/DECISIONS.md` (if a decision was made or changed)

---

# Documentation Layout

Stable specifications: `docs/01`–`docs/12` + `docs/DOCUMENT_INDEX.md`

Project tracking: `docs/ROADMAP.md`, `docs/MILESTONES.md`, `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`

AI context digests: `.ai/` (digests always lose to `docs/` — GOV-4)

Agent role definitions: `agents/`

Do not mix these responsibilities.

---

# Repository Philosophy

Prefer:

Simple code

Readable code

Well-tested code

Explicit architecture

Small pull requests

Good documentation

Avoid cleverness.

Optimize for future contributors.

---

# AI Collaboration

Claude acts primarily as:

- Architect
- Reviewer
- Planner

Implementation may also be performed by:

- Codex
- Cursor
- Future AI agents

All agents must follow the same architecture and documentation. Role boundaries: `agents/`.

---

# If You Are Unsure

Never invent architecture.

Never make assumptions.

Explain the ambiguity.

Recommend options.

Wait for a decision if the correct path is unclear.
