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
| Implementation | 17 Done + 1 In Review / 309 tasks ([12_TASKS.md](12_TASKS.md)) |

## Completed

- 12-document engineering spec (`docs/01`–`docs/12` + `DOCUMENT_INDEX.md`), committed through `c559cca`.
- Two consistency audits: 84 stale cross-references repaired; 8 contradictions resolved (FTS scope, export FR-KO-6, embedding freshness budget, rename propagation, and others — see commit `c559cca`).
- Governance layer: roadmap, milestones, state/handoff/decision/changelog files, `.ai/` context set, `.github/` templates, `agents/` role definitions.
- SETUP-01..14: strict Next.js foundation, semantic Tailwind tokens, shadcn primitives, feature-first structure, typed shared modules, theme plumbing, and test tooling. **Reviewed and verified 2026-07-16** (typecheck/lint/format/tests/build green; lint rules probe-verified; ADR-8/9 conformance confirmed).
- DB-01: provisioned the `second-brain` Supabase Cloud development project (`zkzyfwclvquiargnwgtw`), validated its clean baseline, and adopted the Cloud-only workflow in ADR-10. **Reviewed 2026-07-16** (spec edits consistent, no secrets committed, three ADR-10 ripple gaps fixed in review; cloud-side state not independently verifiable from the repo).
- DB-02: applied the `profiles` table and Auth signup trigger to the shared Cloud project, with `id = auth.uid()` SELECT/UPDATE RLS policies. The cross-user denial check passed against Cloud; security and performance advisors are clean. **Review condition cleared 2026-07-16** — the owed repeatable test was delivered by DB-16.
- DB-16: Supabase browser/server-session/service-role client factories, static public-env access (publishable key), and the ADR-12 Cloud integration harness with the `profiles` cross-user RLS test. **Reviewed and verified 2026-07-16** — reviewer ran the Cloud integration test live (green, cleanup confirmed), verified the dev-project hostname pin, fail-closed behavior, and that `src/` cannot import test code.

## In Progress

- CI-01 is in review on GitHub PR #1. Its four independent pull-request checks—Typecheck, Lint, Format, and Unit tests—passed on GitHub-hosted runners under Node 22.12.0.

## Blocked

- None.

## Upcoming

- Sprint 1: CI-02, CI-03, and OBS-01 (see [.ai/TASK_QUEUE.md](../.ai/TASK_QUEUE.md)).

## Known Technical Debt

- The `feature-boundaries` lint rule only catches `@/features/...` alias imports; relative-path imports bypass it. Follow-up hardening candidate.
- `tsconfig.json` typechecks `src/**` only — `e2e/`, `tools/`, and config files are not typechecked.
- Interim pointer-README in place; OBS-10 replaces it with the full public README at launch.

## Architecture Decisions Pending

| Pending decision | Where it's deferred | Decide by |
|---|---|---|
| Concrete embedding/chat model identifiers (tiers are decided; IDs are config) | [07_AI.md §2](07_AI.md#2-model-selection-strategy) | EMB-01 / AICH-04 implementation |
| MCP protocol version pin | [06_MCP.md §3](06_MCP.md#3-transport--connection) | MCP-01 implementation |
| "Vault" vs. "graph" user-facing terminology (see consistency report, [AI_HANDOFF.md](AI_HANDOFF.md) 2026-07-16 entry) | Proposed for [DECISIONS.md](DECISIONS.md) | Before M4 UI copy is written |
| CI-04 migration-check mechanism under ADR-10 (no local stack): Supabase preview branching vs. ephemeral Postgres in CI vs. migration-history consistency check against the Cloud project | Flagged in DB-01 review; options in [AI_HANDOFF.md](AI_HANDOFF.md) | Before CI-04 is claimed (Sprint 2) |

## Current Branch

`chore/ci-01-github-actions`

## Last Updated

2026-07-16 — CI-01 implemented and live-validated on GitHub PR #1; moved to In Review (Codex, backend implementation role)
