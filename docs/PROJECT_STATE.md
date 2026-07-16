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
| Implementation | 15 / 309 tasks ([12_TASKS.md](12_TASKS.md)) |

## Completed

- 12-document engineering spec (`docs/01`–`docs/12` + `DOCUMENT_INDEX.md`), committed through `c559cca`.
- Two consistency audits: 84 stale cross-references repaired; 8 contradictions resolved (FTS scope, export FR-KO-6, embedding freshness budget, rename propagation, and others — see commit `c559cca`).
- Governance layer: roadmap, milestones, state/handoff/decision/changelog files, `.ai/` context set, `.github/` templates, `agents/` role definitions.
- SETUP-01..14: strict Next.js foundation, semantic Tailwind tokens, shadcn primitives, feature-first structure, typed shared modules, theme plumbing, and test tooling. **Reviewed and verified 2026-07-16** (typecheck/lint/format/tests/build green; lint rules probe-verified; ADR-8/9 conformance confirmed).
- DB-01: provisioned the `second-brain` Supabase Cloud development project (`zkzyfwclvquiargnwgtw`), validated its clean baseline, and adopted the Cloud-only workflow in ADR-10. **Reviewed 2026-07-16** (spec edits consistent, no secrets committed, three ADR-10 ripple gaps fixed in review; cloud-side state not independently verifiable from the repo).
- DB-02: applied the `profiles` table and Auth signup trigger to the shared Cloud project, with `id = auth.uid()` SELECT/UPDATE RLS policies. The cross-user denial check passed against Cloud; security and performance advisors are clean.

## In Progress

- None. The two SETUP blockers were resolved by ADR-8 (concrete token values, now in [10_DESIGN.md §3.3](10_DESIGN.md#33-color)) and ADR-9 (cookie-based theme persistence, [10_DESIGN.md §7](10_DESIGN.md#7-dark-mode)) — Sprint 1 is fully unblocked.

## Blocked

- None.

## Upcoming

- Sprint 1: DB-16, CI-01..03, OBS-01 (see [.ai/TASK_QUEUE.md](../.ai/TASK_QUEUE.md)).

## Known Technical Debt

- `env.ts` dynamic `process.env[name]` access breaks Next.js client-bundle inlining of `NEXT_PUBLIC_*` vars — must be fixed when DB-16 adds the browser Supabase factory (noted on the DB-16 queue row).
- The `profiles` cross-user denial check exists only as a one-off manual Cloud verification — no repeatable test in the repo. DB-16 delivers the Cloud integration-test harness with this as its first test; DB-13 audits completeness.
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

`main` (no feature branches yet)

## Last Updated

2026-07-16 — DB-02 review completed: conditional pass — SQL conforms to ADR-11; automated cross-user test deferred to DB-16's harness (Claude, reviewer role)
