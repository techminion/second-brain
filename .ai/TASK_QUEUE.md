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
| SETUP-01 | Next.js 15 + React 19 + TS strict scaffold | P0 | S | — | backend | Done | M0 | Per [12_TASKS](../docs/12_TASKS.md); builds clean with strict TS |
| DB-01 | Supabase Cloud project + migration workflow | P0 | M | — | database | Done | M0 | Cloud project active; migration workflow documented; no local Docker stack (ADR-10) |
| SETUP-02 | Tailwind + semantic token scaffold | P0 | M | SETUP-01 | designer | Done | M0 | Tokens + values per [10_DESIGN §3.3](../docs/10_DESIGN.md#33-color) (ADR-8), incl. automated contrast check of the listed pairs |
| SETUP-04 | ESLint: strict TS + import boundaries | P0 | M | SETUP-01 | backend | Done | M0 | Boundary rules per [11_CONTRIBUTING §2](../docs/11_CONTRIBUTING.md#2-folder-structure) |
| SETUP-05 | Prettier + import sorting | P1 | S | SETUP-01 | backend | Done | M0 | Format check script wired |
| SETUP-06 | Feature-first folder skeleton | P0 | S | SETUP-01 | backend | Done | M0 | Matches [11_CONTRIBUTING §2](../docs/11_CONTRIBUTING.md#2-folder-structure) |
| SETUP-03 | Vendor shadcn/ui base primitives | P1 | S | SETUP-02 | frontend | Done | M0 | Six named primitives themed by tokens |
| SETUP-07 | Lint rule: no Tailwind arbitrary values | P1 | S | SETUP-04 | backend | Done | M0 | `p-[13px]` fails lint |
| SETUP-08 | Lint rule: no `NEXT_PUBLIC_` secrets | P1 | S | SETUP-04 | backend | Done | M0 | Violation fails CI |
| SETUP-09 | Vitest + Testing Library setup | P0 | S | SETUP-01 | backend | Done | M0 | Colocated test convention works |
| SETUP-10 | Playwright + dev-server smoke test | P1 | M | SETUP-01 | backend | Done | M0 | Smoke test green |
| SETUP-11 | Shared error taxonomy classes | P0 | S | SETUP-06 | backend | Done | M0 | All 8 errors from [05_API §3](../docs/05_API.md#3-error-taxonomy) |
| SETUP-12 | Shared envelope/pagination types | P0 | S | SETUP-06 | backend | Done | M0 | Types per [05_API §2](../docs/05_API.md#2-conventions) |
| SETUP-13 | Dark mode plumbing | P1 | M | SETUP-02 | frontend | Done | M0 | `.dark` class strategy + cookie-persisted override, SSR-stamped, no first-paint flash (ADR-9) |
| SETUP-14 | Env var docs + typed accessor | P1 | S | SETUP-06 | backend | Done | M0 | No untyped `process.env` access |
| DB-02 | `profiles` migration + signup trigger | P1 | S | DB-01 | database | Done | M0 | Per [04_DATABASE §4.1, §7](../docs/04_DATABASE.md#41-profiles) (ADR-11, GOV-6). **Review note:** the cross-user denial check was performed manually against Cloud, not committed as a repeatable test — the automated test is owed by DB-16's harness (see that row) |
| DB-16 | Typed Supabase client factories | P1 | M | DB-01, SETUP-06 | database | Done | M0 | Delivered in full incl. env-inlining fix, ADR-12 harness, and the DB-02-owed profiles test — reviewer-verified live against Cloud (see Completed) |
| OBS-01 | Structured logging module | P1 | M | SETUP-06 | backend | Queued | M0 | Request id + user id, content-free |
| CI-01 | CI: typecheck/lint/format/tests on PR | P0 | M | SETUP-04, SETUP-09 | backend | Done | M0 | Merged via PR #1 (`38c1282`) after review — four green checks on GitHub runners, Node 22.12 pinned (see Completed) |
| CI-02 | Vercel: preview per PR, prod on main | P0 | S | SETUP-01 | backend | Queued | M0 | Preview URL on a test PR |
| CI-03 | Branch protection + required checks | P0 | S | CI-01 | backend | Queued | M0 | Direct pushes to main blocked; require the four CI-01 contexts (Typecheck, Lint, Format, Unit tests). **Also require branches to be up to date before merge** — the CI-01 workflow runs on `pull_request` only, so without this, post-merge `main` is never re-validated (CI-01 review finding) |

## Next Up (Sprint 2 candidates — not yet claimable)

Remaining M0: DB-03..15 (schema + RLS + cross-user tests), AUTH-01..14, SHELL-01..10, CI-04..08. Promotion happens when Sprint 1's P0s are `Done`.

## Completed

- **SETUP-01..14** — implemented by Codex (`22c74bc`), reviewed and verified by Claude (reviewer role) on 2026-07-16: typecheck/lint/format/unit tests green, custom lint rules probe-verified, production build clean, token values match ADR-8, theme plumbing matches ADR-9. Playwright E2E not independently re-run by the reviewer.
- **DB-01** — implemented by Codex (`ade209c`), reviewed by Claude (reviewer role) on 2026-07-16: ADR-10 spec edits internally consistent, no secrets committed, no migration files (infrastructure-only, as scoped). Three ripple gaps fixed in review (03 §8 env table, CI-04 wording, `agents/database.md`). Cloud-project state (`zkzyfwclvquiargnwgtw`) not independently verifiable from the repo; CI-04 mechanism decision opened in PROJECT_STATE.
- **DB-02** — implemented by Codex (`1c5e2e3`), reviewed by Claude (reviewer role) on 2026-07-16: SQL matches ADR-11 exactly (RLS shape, `SECURITY DEFINER` + pinned `search_path`, initplan-cached `auth.uid()`, no INSERT/DELETE policies); FK cascade recorded back into 04 §4.1. **Conditional pass:** the cross-user denial check was manual-against-Cloud, not a committed test — owed by DB-16's harness; queue-AC rewording by the implementer flagged as a GOV-2 process violation. Cloud state and advisor results implementer-attested. **Condition cleared 2026-07-16:** DB-16 delivered the repeatable test; reviewer ran it green against Cloud.
- **CI-01** — implemented by Codex (PR #1, merged `38c1282`), reviewed and merged by Claude (reviewer role) on 2026-07-17: four independent jobs with stable context names for CI-03, Node 22.12 pinned, least-privilege permissions, per-PR concurrency cancellation; all checks green on GitHub runners. First task through the full branch → PR → review → merge pipeline. Non-blocking findings: no `push: main` trigger (mitigate via CI-03's up-to-date-branches requirement); actions tag-pinned rather than SHA-pinned (optional hardening, SEC-07 territory).
- **DB-16** — implemented by Codex (`f4be50b`), reviewed and verified by Claude (reviewer role) on 2026-07-16: typecheck/lint/format/unit tests/build green; **Cloud integration test run live by the reviewer and passed** (two isolated users, cross-user read/update denied, self-access preserved, cleanup verified) under Node 23; harness pins the dev-project hostname and fails closed; `src/` provably does not import test code; env-inlining bug fixed with static references; anon→publishable-key rename ripple complete. Two implementation decisions (publishable-key naming, Node ≥ 22.12 engine floor) were made without DECISIONS entries — accepted post-hoc in review, noted as a recurring reporting gap.
