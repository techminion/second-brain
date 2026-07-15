# Task Queue — Live Operational View

> The canonical backlog is [docs/12_TASKS.md](../docs/12_TASKS.md) (309 tasks, immutable IDs, dependencies, complexity). This file never redefines a task (GOV-2) — it adds the operational state: what is queued *now*, who owns it, and where it stands. Acceptance criteria live with the task's referenced FR/doc section in the backlog.

## Rules

- **Statuses:** `Queued` → `Claimed (<agent>)` → `In Review` → `Done`, plus `Blocked (<reason>)`.
- **Claiming:** set status to `Claimed` with your agent name before writing code; only claim tasks whose dependencies are `Done`; one agent per area prefix at a time (GOV-5).
- **Atomicity:** `S` tasks are 1–4 hour units — claim as-is. `M` tasks: claim whole, but post a sub-checklist in the PR. `L` tasks: **split into sub-units at claim time** and record the split in your AI_HANDOFF entry.
- **Priorities:** `P0` — on the critical path of the current sprint; `P1` — this sprint, parallelizable; `P2` — next in line, claimable if idle.
- When the sprint's queue empties, the architect role promotes the next dependency-ready wave from [docs/12_TASKS.md](../docs/12_TASKS.md).

## Current Sprint: Sprint 1 — Repo & Tooling Foundation (M0)

Goal: a scaffolded, linted, tested, CI-gated repo with a provisioned Supabase project — the substrate every other M0 phase needs.

| ID | Title | Priority | Cx | Depends on | Owner | Status | Milestone | Acceptance criteria |
|---|---|---|---|---|---|---|---|---|
| SETUP-01 | Next.js 15 + React 19 + TS strict scaffold | P0 | S | — | backend | Queued | M0 | Per [12_TASKS](../docs/12_TASKS.md); builds clean with strict TS |
| DB-01 | Supabase project + local CLI stack | P0 | M | — | database | Queued | M0 | Local stack runs; workflow documented |
| SETUP-02 | Tailwind + semantic token scaffold | P0 | M | SETUP-01 | designer | Queued | M0 | Tokens per [10_DESIGN §3](../docs/10_DESIGN.md#3-design-tokens) |
| SETUP-04 | ESLint: strict TS + import boundaries | P0 | M | SETUP-01 | backend | Queued | M0 | Boundary rules per [11_CONTRIBUTING §2](../docs/11_CONTRIBUTING.md#2-folder-structure) |
| SETUP-05 | Prettier + import sorting | P1 | S | SETUP-01 | backend | Queued | M0 | Format check script wired |
| SETUP-06 | Feature-first folder skeleton | P0 | S | SETUP-01 | backend | Queued | M0 | Matches [11_CONTRIBUTING §2](../docs/11_CONTRIBUTING.md#2-folder-structure) |
| SETUP-03 | Vendor shadcn/ui base primitives | P1 | S | SETUP-02 | frontend | Queued | M0 | Six named primitives themed by tokens |
| SETUP-07 | Lint rule: no Tailwind arbitrary values | P1 | S | SETUP-04 | backend | Queued | M0 | `p-[13px]` fails lint |
| SETUP-08 | Lint rule: no `NEXT_PUBLIC_` secrets | P1 | S | SETUP-04 | backend | Queued | M0 | Violation fails CI |
| SETUP-09 | Vitest + Testing Library setup | P0 | S | SETUP-01 | backend | Queued | M0 | Colocated test convention works |
| SETUP-10 | Playwright + dev-server smoke test | P1 | M | SETUP-01 | backend | Queued | M0 | Smoke test green |
| SETUP-11 | Shared error taxonomy classes | P0 | S | SETUP-06 | backend | Queued | M0 | All 8 errors from [05_API §3](../docs/05_API.md#3-error-taxonomy) |
| SETUP-12 | Shared envelope/pagination types | P0 | S | SETUP-06 | backend | Queued | M0 | Types per [05_API §2](../docs/05_API.md#2-conventions) |
| SETUP-13 | Dark mode plumbing | P1 | M | SETUP-02 | frontend | Queued | M0 | `.dark` class strategy + persisted override |
| SETUP-14 | Env var docs + typed accessor | P1 | S | SETUP-06 | backend | Queued | M0 | No untyped `process.env` access |
| DB-02 | `profiles` migration + signup trigger | P1 | S | DB-01 | database | Queued | M0 | Per [04_DATABASE §4.1](../docs/04_DATABASE.md#41-profiles) |
| DB-16 | Typed Supabase client factories | P1 | M | DB-01, SETUP-06 | database | Queued | M0 | Browser/session/service-role factories in `shared/lib` |
| OBS-01 | Structured logging module | P1 | M | SETUP-06 | backend | Queued | M0 | Request id + user id, content-free |
| CI-01 | CI: typecheck/lint/format/tests on PR | P0 | M | SETUP-04, SETUP-09 | backend | Queued | M0 | All four checks gate PRs |
| CI-02 | Vercel: preview per PR, prod on main | P0 | S | SETUP-01 | backend | Queued | M0 | Preview URL on a test PR |
| CI-03 | Branch protection + required checks | P0 | S | CI-01 | backend | Queued | M0 | Direct pushes to main blocked |

## Next Up (Sprint 2 candidates — not yet claimable)

Remaining M0: DB-03..15 (schema + RLS + cross-user tests), AUTH-01..14, SHELL-01..10, CI-04..08. Promotion happens when Sprint 1's P0s are `Done`.

## Completed

*(none yet)*
