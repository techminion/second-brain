# Project State

> The living snapshot of the project. **Every implementation session must update this file** ([.ai/AGENT_WORKFLOW.md](../.ai/AGENT_WORKFLOW.md)). History lives in [AI_HANDOFF.md](AI_HANDOFF.md) and [CHANGELOG.md](CHANGELOG.md); this file is only ever *now*.

## Current Milestone

**M0 — Foundations** (in progress — Sprint 1 of ~3 complete)

## Current Sprint

**Sprint 2 — Schema, Auth Core & App Shell** (scope and priorities in [.ai/TASK_QUEUE.md](../.ai/TASK_QUEUE.md); promoted 2026-07-17)
Done: Sprint 0 (governance), Sprint 1 (repo & tooling foundation — all 21 tasks reviewed and merged)

## Overall Progress

| Track | Status |
|---|---|
| Engineering documentation (12 docs) | ✅ Complete, audited twice for consistency |
| Governance layer (this file set) | ✅ Complete |
| Implementation | 25 Done + 5 In Review / 309 tasks ([12_TASKS.md](12_TASKS.md)) |

## Completed

- 12-document engineering spec (`docs/01`–`docs/12` + `DOCUMENT_INDEX.md`), committed through `c559cca`.
- Two consistency audits: 84 stale cross-references repaired; 8 contradictions resolved (FTS scope, export FR-KO-6, embedding freshness budget, rename propagation, and others — see commit `c559cca`).
- Governance layer: roadmap, milestones, state/handoff/decision/changelog files, `.ai/` context set, `.github/` templates, `agents/` role definitions.
- SETUP-01..14: strict Next.js foundation, semantic Tailwind tokens, shadcn primitives, feature-first structure, typed shared modules, theme plumbing, and test tooling. **Reviewed and verified 2026-07-16** (typecheck/lint/format/tests/build green; lint rules probe-verified; ADR-8/9 conformance confirmed).
- DB-01: provisioned the `second-brain` Supabase Cloud development project (`zkzyfwclvquiargnwgtw`), validated its clean baseline, and adopted the Cloud-only workflow in ADR-10. **Reviewed 2026-07-16** (spec edits consistent, no secrets committed, three ADR-10 ripple gaps fixed in review; cloud-side state not independently verifiable from the repo).
- DB-02: applied the `profiles` table and Auth signup trigger to the shared Cloud project, with `id = auth.uid()` SELECT/UPDATE RLS policies. The cross-user denial check passed against Cloud; security and performance advisors are clean. **Review condition cleared 2026-07-16** — the owed repeatable test was delivered by DB-16.
- DB-16: Supabase browser/server-session/service-role client factories, static public-env access (publishable key), and the ADR-12 Cloud integration harness with the `profiles` cross-user RLS test. **Reviewed and verified 2026-07-16** — reviewer ran the Cloud integration test live (green, cleanup confirmed), verified the dev-project hostname pin, fail-closed behavior, and that `src/` cannot import test code.

- CI-01: GitHub Actions PR gate — four independent checks (Typecheck, Lint, Format, Unit tests) on Node 22.12. **Reviewed and merged 2026-07-17** via PR #1 (`38c1282`) — the first task through the full branch → PR → review → merge pipeline.
- CI-02: Vercel Git integration — preview deployment per PR, production deployment from `main`; `vercel.json` pins the Next.js framework. **Reviewed and merged 2026-07-17** via PR #2 (`2a634a0`) — reviewer probed the preview URL live (HTTP 200) and confirmed the first production deployment succeeded on the merge commit. Env vars deferred to CI-07.
- CI-03: `main` branch protection — strict up-to-date requirement, the four CI-01 contexts required, admin enforcement, force-push/deletion disabled. **Reviewed and merged 2026-07-17** via PR #3 (`64e0c2c`) — protection read back live from the GitHub API and the direct-push block proven empirically. Repo made public to enable protection (user decision, GOV-7; full-history secret scan clean). **All Sprint 1 P0s are Done — the pipeline is now enforced, not voluntary.**

- OBS-01: dependency-free structured JSON logger — content-free enforced structurally (metadata admits only boolean/number/null), request id + user id required, injection- and serialization-hook-resistant. **Reviewed and merged 2026-07-17** via PR #5 (`f367cc1`) — reviewer re-ran the test suite locally. **Sprint 1 complete.**
- DB-03: `knowledge_objects` envelope table live on the shared Cloud project — uniform RLS, ADR-14 cascade FK, least-privilege grants, cross-user denial test (GOV-6). **Reviewed and merged 2026-07-17** via PR #10 (`318f958`) — reviewer ran the Cloud integration suite live (green). First Sprint 2 task done; DB-04 and DB-06..10 unblocked.
- DB-05: `folders` table live — ADR-14 cascade + first ADR-15 `SET NULL` FK, uniform RLS, GOV-6 test incl. live parent-purge behavior. **Reviewed and merged 2026-07-17** via PR #15 (`0b30c56`) — reviewer ran the Cloud suite live from an isolated worktree (5 tests green). DB-04 fully unblocked.
- SHELL-01: root layout — Inter/JetBrains Mono wired to token vars, cookie-coordinated ThemeProvider (ADR-9), theme-bound sonner Toaster. **Reviewed and merged 2026-07-17** via PR #13 (`f016273`) — first Antigravity task through the pipeline; reviewer fixup for stray conflict markers. SHELL-02 claimable.
- DB-04: `notes` subtype live — generated FTS vector per 08_SEARCH §2, daily-note partial unique index, ADR-14/15 FKs, uniform RLS. **Reviewed and merged 2026-07-17** via PR #17 (`c3594bf`) — reviewer ran the Cloud suite live from a worktree (8/8 on rerun). DB-06..10 remain for the schema chain.
- DB-06: `tags` + `knowledge_object_tags` live — ADR-16 tag-cascade verified against Cloud, case-insensitive uniqueness, uniform RLS. **Reviewed and merged 2026-07-17** via PR #21 (`08d4095`) — full suite 10/10. Remaining schema chain: DB-07..12 → DB-13.
- DB-07: `links` live — unique pair edges, backlinks-critical target index, ADR-14 cascades. **Reviewed and merged 2026-07-17** via PR #23 (`341eeb8`) — 3× 12/12 Cloud-suite passes. Schema chain: 7/13 tables; DB-08..12 remain.
- DB-08: pgvector + `embeddings` live — 1536-dim cosine HNSW per spec; harness hardening shipped alongside (shared user pair + bounded retry; both debt items closed). **Reviewed and merged 2026-07-17** via PR #25 (`1257a09`) — 4× consecutive 14/14 suite passes. Schema chain: 8/13; DB-09..12 remain.
- DB-09: `attachments` + private storage live — signed-URL-only reads DB-enforced via operation-scoped policies; owner-path defense-in-depth. **Reviewed and merged 2026-07-17** via PR #27 (`6182d17`) — suite 17/17 live. Schema chain: 9/13; DB-10..12 remain.
- DB-10: chat tables live — scope/role CHECKs, both cascade chains verified live. **Reviewed and merged 2026-07-17** via PR #29 (`bbb5042`) — suite 20/20. Schema chain: 10/13; DB-11/12 then the DB-13 audit.
- DB-11: `mcp_credentials` live — hash-only credential storage, uniform RLS. **Reviewed and merged 2026-07-17** via PR #31 (`d4c8d1b`) — suite 22/22. Schema chain: 11/13; DB-12 then DB-13.

## In Progress

- DB-12: append-only `audit_log` is live on the shared Cloud project with SELECT/INSERT-only grants and policies, ADR-14 owner cascade, and the ADR-16 object-reference `SET NULL` exception. **In Review** — focused tests 3/3 and full Cloud suite 25/25 green; DB-13 was not started.
- SHELL-07 (PR #14) — substance approved; needs rebase onto main + the PROJECT_STATE section fix. **Reassigned to Codex** (Antigravity and the multi-folder setup were scratched 2026-07-17; implementation is now Codex alone, alternating with Claude per task in one checkout).

## Blocked

- None.

## Upcoming

- Sprint 2 critical path: the DB-03..13 schema chain (database), AUTH-01..05 (backend/frontend), SHELL-01..02 (frontend). Sprint 3 candidates listed in the queue's deferred note.

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

## Current Branch

`feature/db-12-audit-log`

## Last Updated

2026-07-18 — DB-12 implemented and awaiting independent review; DB-13 not started (Codex, database implementation role)
