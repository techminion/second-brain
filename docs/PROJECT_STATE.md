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
| Implementation | 47 Done / 309 tasks ([12_TASKS.md](12_TASKS.md)) |

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
- DB-12: `audit_log` live — append-only at grant level, ADR-16 SET NULL exception proven live. **Reviewed and merged 2026-07-18** via PR #33 (`5d02462`) — suite 25/25. **All 13 schema tables live; DB-02..12 complete.** DB-13 audit claimable.
- DB-13: RLS audit complete — 48 policies verified, legacy profiles grants corrected (the audit's one real finding), ADR-17 dispositions recorded. **Reviewed and merged 2026-07-18** via PR #35 (`70e894a`) — suite 26/26. DB-14/15 close the database phase.
- DB-14: cross-user denial coverage verified complete — 13 tables mapped to GOV-6 tests, independently re-checked in review. **Reviewed and merged 2026-07-18** via PR #37 (`2b88641`). Only DB-15 remains in the database phase.
- DB-15: retention purge live — ADR-18 worker + pg_cron schedule, migration applied to Cloud via Supabase MCP (history 17/17, advisors clean, no-op path verified). **Database phase complete: DB-01..16.** Merged via PRs #40/#43.
- OBS-02: request logging wired — `withRequestLogging` wrapper on all existing route boundaries, AUTH-04-ready user resolver slot. **Merged 2026-07-18** via PR #44 (self-implemented, user-authorized; 31 unit tests green).
- SHELL-07: TanStack Query provider live — sane defaults, dev-gated devtools, ThemeProvider→QueryProvider nesting. **Reviewed and merged 2026-07-18** via PR #14 (`13b3ff6`) after rebase; the Antigravity-era backlog is fully cleared. SHELL-02/03/10 remain on the shell track.
- AUTH-01: Supabase Auth configured on the dev project per ADR-19 — confirmation off (FR-AUTH-1), password minimum 8, localhost URL allow-list; canonical record in `supabase/auth-config.md`, templates staged for CI-07. **Live-verified 2026-07-18** via signup probes (pre/post dashboard apply). Merged via PR #47 (`215b198`). **Auth UI track (AUTH-02/03/06) unblocked.**
- AUTH-02: signup live at `/signup` — new `(auth)` route group, `src/features/auth/` (zod schema mirroring ADR-19, browser-client signUp wrapper with typed error mapping + confirmation-drift guard, accessible RHF form), RHF/zod/resolvers deps added per §2.1. 17 unit tests; production-server smoke green. **Merged 2026-07-18** via PR #49 (`56c7a1d`). AUTH-03 (login) claimable.
- AUTH-03: login live at `/login` — shape-only login schema, neutral invalid-credentials message (no account-existence leak), shared `AuthFormField` extracted and signup form refactored onto it, signup↔login cross-links. 16 unit tests; both pages smoke-tested on the production server. **Merged 2026-07-18** via PR #51 (`a3dadc6`). Auth UI: signup + login complete; AUTH-04 (session middleware) is the next gate.
- AUTH-04: session handling live per 09_SECURITY §3 — ADR-20 (auth tokens exclusively server-side): sign-up/in converted to server actions, all session cookies forced `HttpOnly`/`SameSite=Lax` (+`Secure` in prod) through one hardening chokepoint, `src/middleware.ts` refreshes tokens per request via `getClaims()`, browser Supabase client deleted, OBS-02 user-id resolver wired. Proven by a live Playwright e2e (real signup/login against the dev project; `document.cookie` shows no token). **Merged 2026-07-19** via PR #53 (`e77fa1c`). AUTH-05/07/08 unblocked.
- AUTH-05: route protection live — fail-closed middleware gate over the ADR-20 refresh (anonymous page requests redirect to `/login`; `/login`/`/signup`/`/api/*` keep their own policies; cookie rotation survives redirects); root page moved into `(app)` unchanged at `/`. Implemented by Codex; reviewer re-verified units (81/81) and live Playwright (2/2) in an isolated worktree. **Reviewed and merged 2026-07-19** via PR #55 (`b9fd739`). **All P0 auth tasks Done.**
- CI-05: dependency audit gate live — every PR runs `npm audit --audit-level=high` as the fifth strict, Actions-pinned required context. Implemented by Codex; reviewer verified live protection readback. **Reviewed and merged 2026-07-19** via PRs #57/#58 (`506a48e`/`574ad7a`).
- CI-04: migration gate live — every PR replays the full migration history on the pinned Supabase Postgres 17 image from a checksum- and provenance-verified official baseline, asserts the documented end-state (13 tables, full RLS, storage helpers, private bucket, extensions, cron job), and same-repo PRs verify repo↔Cloud history parity; fork-safe throughout (GOV-7). Implemented by Codex under ADR-13/21; reviewer independently re-verified fixture provenance (upstream blob hash-identical) and live protection (strict, six Actions-pinned contexts). **Reviewed and merged 2026-07-19** via PR #62 (`e8b3ef0`). CI track: only CI-07 remains.
- SHELL-02: three-zone app shell live — 10_DESIGN §3.2 layout (collapsible sidebar · server-rendered main · collapsible context panel), server-composed with one client island per rail, accessible collapse controls, ephemeral per-rail state. Implemented by Codex (L-split recorded: SHELL-03/05/06/10 scoped out); reviewer re-verified 84/84 units + live Playwright in an isolated worktree. **Reviewed and merged 2026-07-19** via PR #64 (`282e594`). SHELL-03 claimable.
- AUTH-08: current-session logout action live — ADR-22 overrides Supabase JS's global default with `scope: "local"`, revoking only the acting session's refresh token, clearing ADR-20 HttpOnly cookies, and redirecting to `/login`. Two units; full suite 86/86; temporary live Playwright probe proved real signup → logout → no `sb-*` cookies → `/login` and was removed before commit. **Merged 2026-07-21** via PR #66 (`40b3b81`). SHELL-03 owns the visible trigger.
- SHELL-03: sidebar navigation frame live — semantic Daily note/Folders/Tags landmarks ready for owning features without invented routes; AUTH-08 visible logout trigger bound server-side; collapsed rail removes child content. 3 units, suite 89/89, six required checks green. **Merged 2026-07-21** via PR #68 (`17b116a`). AUTH-10 and sidebar feature tasks unblocked.
- AUTH-06: password reset live end-to-end (FR-AUTH-3) — `/forgot-password` server action calls `resetPasswordForEmail` with a fixed same-origin `/auth/recovery/callback` redirect (never caller-supplied); the callback exchanges either a PKCE `code` (dev default template) or a `type=recovery` `token_hash` (staged production template) into an ADR-20 HttpOnly session, then routes to the gated `/reset-password` page where a verified-claims server action calls `updateUser`. Middleware allowlists the request/callback routes; `/reset-password` stays protected. The callback binds session cookies to its redirect response (same chokepoint as AUTH-04 middleware). Shared 8–72 password policy extracted to `password-schema.ts`. 34 new units/component/route tests (suite 123/123), typecheck/lint/format/build green; **live recovery e2e green against the dev project** (`auth-session.spec.ts` 2/2 — admin-generated recovery token → callback → HttpOnly session → `updateUser` → re-login with the new password). **Merged 2026-07-22** via PR #70 (`602710c`). AUTH-14 now dependency-ready.
- SEC-07 (partial): pinned `sharp` to `^0.35.3` via an npm `overrides` entry, clearing the high-severity libvips advisories (CVE-2026-33327/33328/35590/35591) that Next.js 15 pulled in transitively through `sharp@0.34.x` — a Next patch can't reach the fix (15.5.x pins `sharp@^0.34.3`) and Next 16 would change the documented stack. `npm audit --audit-level=high` clean (two pre-existing moderate PostCSS findings remain). **Merged 2026-07-22** via PR #71 (`714a3b3`) to unblock the AUTH-06 audit gate; the broader SEC-07 pinning/audit review remains.

## In Progress

- None.

## Blocked

- None.

## Upcoming

- Sprint 2 remaining implementation: AUTH-07/09/14, SHELL-10, and CI-07.

## Known Technical Debt

- Harness residual flake: the DB-08 retry covers Auth user creation/sign-in, but the *first data request* after sign-in can still hit Cloud clock skew (1 failure seen in DB-13 review, rerun green). If it recurs, extend the retry/tolerance to first use of a fresh session.
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

`main`

## Last Updated

2026-07-22 — AUTH-06 merged (PR #70) after review; SEC-07 sharp override merged first (PR #71) to clear the failing audit gate. AUTH-14 now dependency-ready. Sprint 2 remainder: AUTH-07/09/14, SHELL-10, CI-07
