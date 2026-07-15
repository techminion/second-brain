# Project State

> The living snapshot of the project. **Every implementation session must update this file** ([.ai/AGENT_WORKFLOW.md](../.ai/AGENT_WORKFLOW.md)). History lives in [AI_HANDOFF.md](AI_HANDOFF.md) and [CHANGELOG.md](CHANGELOG.md); this file is only ever *now*.

## Current Milestone

**M0 — Foundations** (not started — pre-implementation)

## Current Sprint

**Sprint 0 — Governance setup** (this sprint: documentation + project-management layer; no code)
Next: **Sprint 1 — Repo & tooling foundation** (scope defined in [.ai/TASK_QUEUE.md](../.ai/TASK_QUEUE.md))

## Overall Progress

| Track | Status |
|---|---|
| Engineering documentation (12 docs) | ✅ Complete, audited twice for consistency |
| Governance layer (this file set) | ✅ Complete |
| Implementation | 0 / 309 tasks ([12_TASKS.md](12_TASKS.md)) |

## Completed

- 12-document engineering spec (`docs/01`–`docs/12` + `DOCUMENT_INDEX.md`), committed through `c559cca`.
- Two consistency audits: 84 stale cross-references repaired; 8 contradictions resolved (FTS scope, export FR-KO-6, embedding freshness budget, rename propagation, and others — see commit `c559cca`).
- Governance layer: roadmap, milestones, state/handoff/decision/changelog files, `.ai/` context set, `.github/` templates, `agents/` role definitions.

## In Progress

- None.

## Blocked

- None.

## Upcoming

- Sprint 1: SETUP-01..14, DB-01, DB-02, DB-16, CI-01..03, OBS-01 (see [.ai/TASK_QUEUE.md](../.ai/TASK_QUEUE.md)).

## Known Technical Debt

- None (no code exists yet). An interim pointer-README is in place; OBS-10 replaces it with the full public README at launch.

## Architecture Decisions Pending

| Pending decision | Where it's deferred | Decide by |
|---|---|---|
| Concrete embedding/chat model identifiers (tiers are decided; IDs are config) | [07_AI.md §2](07_AI.md#2-model-selection-strategy) | EMB-01 / AICH-04 implementation |
| MCP protocol version pin | [06_MCP.md §3](06_MCP.md#3-transport--connection) | MCP-01 implementation |
| "Vault" vs. "graph" user-facing terminology (see consistency report, [AI_HANDOFF.md](AI_HANDOFF.md) 2026-07-16 entry) | Proposed for [DECISIONS.md](DECISIONS.md) | Before M4 UI copy is written |

## Current Branch

`main` (no feature branches yet)

## Last Updated

2026-07-16 — governance-layer creation session (Claude, TPM role)
