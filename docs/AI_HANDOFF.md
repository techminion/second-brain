# AI Handoff Log

> **Every AI session must append an entry here before ending** (newest first). The goal: any agent — Claude Code, Codex, Cursor, or a future tool — can read the top entry plus [PROJECT_STATE.md](PROJECT_STATE.md) and continue immediately. Session protocol: [.ai/AGENT_WORKFLOW.md](../.ai/AGENT_WORKFLOW.md).

## Entry Template

```
## <date> — <agent / role>
Session Date:
Agent:
Objective:
Files Modified:
Files Added:
Architecture Decisions:
Outstanding Work:
Known Bugs:
Risks:
Suggested Next Task:
Estimated Context Needed:
```

---

## 2026-07-17 — Claude (Reviewer) — CI-01 review & merge

**Session Date:** 2026-07-17
**Agent:** Claude (Claude Code), reviewer role
**Objective:** Review and merge CI-01 (GitHub PR #1).
**Files Modified:** `.ai/TASK_QUEUE.md` (CI-01 → Done; CI-03 gains the up-to-date-branches requirement), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md`. Merged PR #1 as `38c1282` (squash; branch deleted).
**Files Added:** None.
**Architecture Decisions:** None. The four-independent-jobs structure (one stable status context per check, ready for CI-03 branch protection) is a sound implementation choice, correctly reported in the implementer's handoff this time.
**Verification performed:** Workflow reviewed line-by-line: `pull_request` trigger, `permissions: contents: read` (least privilege), per-PR concurrency cancellation, 10-minute timeouts, npm cache, Node 22.12.0 pinned per the DB-16 review note. PR #1 verified via `gh`: all four checks `SUCCESS` on GitHub-hosted runners; file scope exactly the workflow + governance updates; conventional-commit title. PR was in draft — marked ready and squash-merged after review.
**Outstanding Work:** CI-02 and CI-03 (backend) close out Sprint 1's P0s; OBS-01 remains. CI-04 mechanism decision still open.
**Known Bugs:** None.
**Risks:** (1) Workflow runs on `pull_request` only — post-merge `main` is never re-validated; mitigated by CI-03 requiring branches to be up to date before merge (now in its AC). (2) Actions are tag-pinned (`@v7`), not SHA-pinned — acceptable now; optional supply-chain hardening under SEC-07. (3) Until CI-03 lands, direct pushes to `main` remain possible — governance commits (like this one) still go direct; that ends with CI-03.
**Suggested Next Task:** CI-03 (backend role) — highest leverage: it makes the pipeline every future task must follow enforceable. CI-02 in parallel.
**Estimated Context Needed:** CI-02/CI-03 queue rows + `.github/workflows/ci.yml` + GitHub repo settings access.

---

## 2026-07-16 — Codex (Backend Engineer) — CI-01 completion

**Session Date:** 2026-07-16
**Agent:** Codex, backend implementation role
**Objective:** Implement CI-01 only: GitHub Actions typecheck, lint, format, and unit-test checks on every pull request.
**Files Modified:** `.ai/TASK_QUEUE.md`; `docs/PROJECT_STATE.md`; `docs/AI_HANDOFF.md`.
**Files Added:** `.github/workflows/ci.yml`.
**Architecture Decisions:** None. Used four independent read-only GitHub Actions jobs so every acceptance check has its own stable status context for CI-03. Pinned Node 22.12.0 per the DB-16 review note and package engine floor.
**Verification performed:** Under local Node 24, typecheck, lint, format check, and 5 unit tests pass. GitHub PR #1 executed all four jobs on `ubuntu-latest` with Node 22.12.0; Typecheck, Lint, Format, and Unit tests all passed. The workflow grants only `contents: read` and cancels superseded runs for the same PR.
**Outstanding Work:** Claude review and merge of PR #1. CI-02 is independently claimable. CI-03 remains dependency-blocked until CI-01 is reviewed and marked Done.
**Known Bugs:** None.
**Risks:** Four independent jobs each run `npm ci`; this spends more runner minutes than a single sequential job but preserves complete failure visibility and four enforceable branch-protection contexts.
**Suggested Next Task:** CI-02. After CI-01 is Done, claim CI-03 and require the four CI status contexts on `main`.
**Estimated Context Needed:** PR #1; `.github/workflows/ci.yml`; CI-01/CI-03 queue rows; `docs/11_CONTRIBUTING.md §6`.

---

## 2026-07-16 — Claude (Reviewer) — DB-16 review

**Session Date:** 2026-07-16
**Agent:** Claude (Claude Code), reviewer role
**Objective:** Review the Codex DB-16 implementation (`f4be50b`) against the expanded acceptance criteria (factories, env-inlining fix, ADR-12 harness, DB-02's owed test).
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-16 → Done; CI-01 Node-pin note; DB-02 condition cleared), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md`.
**Files Added:** None.
**Architecture Decisions:** None new. Two implementation decisions shipped without DECISIONS entries and are accepted post-hoc: (1) `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` naming (Supabase's current key system, ripple to 09 §6 and `.env.example` verified complete); (2) Node engines floor `>=22.12.0` (supabase-js needs native WebSocket). Both sound; both should have been flagged as decisions — third instance of the reporting gap.
**Verification performed (all independent):** typecheck/lint/format/unit tests (5)/production build green. **Cloud integration test executed live by the reviewer under Node 23 and passed** — two isolated users created, cross-user SELECT/UPDATE correctly denied (empty result sets, the right RLS semantics), self-access preserved, users deleted. Harness verified: dev-project hostname pin, fail-closed without credentials, correct empty-vs-error assertions. `src/` → `tests/` imports: zero (ADR-12 importability constraint holds). Env-inlining bug fixed via static references. Reproduced the Node 20 failure mode (confusing WebSocket error) — hence the CI-01 pin note.
**Outstanding Work:** Sprint 1 remainder: CI-01..03, OBS-01. CI-04 mechanism decision still open. DB-02's review condition is cleared.
**Known Bugs:** None found.
**Risks:** Contributor machines defaulting to Node < 22.12 hit a cryptic failure on integration tests; `engines` declares the floor but npm doesn't enforce it without `engine-strict` — CI pin (CI-01 note) is the mitigation of record.
**Suggested Next Task:** CI-01..03 (backend role) — the last P0s of Sprint 1 and the fix for the recurring direct-to-main process gap.
**Estimated Context Needed:** CI queue rows + `docs/11_CONTRIBUTING.md §6` + `.github/` templates.

---

## 2026-07-16 — Codex (Database Engineer) — DB-16 completion

**Session Date:** 2026-07-16
**Agent:** Codex, database implementation role
**Objective:** Implement DB-16 only: typed Supabase client factories, static public-environment access, and the ADR-12 Cloud integration harness with the owed `profiles` cross-user RLS test.
**Files Modified:** `.gitignore`; `package.json`; `package-lock.json`; `src/shared/lib/env.ts`; `vitest.config.ts`; `docs/09_SECURITY.md`; `.ai/TASK_QUEUE.md`; `docs/PROJECT_STATE.md`; `docs/CHANGELOG.md`; `docs/AI_HANDOFF.md`.
**Files Added:** `.env.example`; `src/shared/lib/env.test.ts`; browser, server-session, and service-role Supabase client factories in `src/shared/lib`; `vitest.integration.config.ts`; `tests/integration/supabase-test-harness.ts`; `tests/integration/profiles-rls.integration.test.ts`.
**Architecture Decisions:** None. Implemented ADR-12. The public contract uses Supabase's current publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) instead of the legacy anon key. Node is pinned to `>=22.12.0`, satisfying both Vite's current engine floor and the integration runner's native `--env-file-if-exists` support while CI-provided environment variables retain precedence.
**Verification performed:** Under Node 24: format check, strict typecheck, lint, unit tests (5), production build, and the Cloud integration test pass. The test created two isolated users, verified user B could neither read nor update user A's profile while retaining self-access, and deleted both users. Post-test verification found zero `db16-*` Auth users and zero profile rows. The Cloud `profiles` table has RLS enabled and matches the documented columns/PK/FK; security and performance advisors returned no findings. `npm audit --omit=dev --audit-level=high` passed with two pre-existing moderate Next.js/PostCSS findings.
**Outstanding Work:** Claude review. No implementation work remains in DB-16.
**Known Bugs:** None.
**Risks:** The integration harness legitimately uses a privileged development-project key under ADR-12. It remains confined to test code, validates the exact development-project hostname, fails closed without credentials, and cleans up isolated users.
**Suggested Next Task:** Review DB-16. Do not begin another task from this session.
**Estimated Context Needed:** `.ai/TASK_QUEUE.md` DB-16 row; `docs/09_SECURITY.md §5`; `docs/04_DATABASE.md §11`; `tests/integration/`.

---

## 2026-07-16 — Codex (Database Engineer) — DB-16 implementation hold

**Session Date:** 2026-07-16
**Agent:** Codex, database implementation role
**Objective:** Implement DB-16 only: typed Supabase client factories, the static public-environment fix, and the ADR-12 Cloud integration harness with the owed `profiles` cross-user RLS test.
**Files Modified:** `package.json`, `package-lock.json`, `src/shared/lib/env.ts`, `vitest.config.ts`, `.ai/TASK_QUEUE.md`, `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md`.
**Files Added:** `src/shared/lib/env.test.ts`; browser, server-session, and service-role Supabase client factories in `src/shared/lib`; `vitest.integration.config.ts`; and the integration harness plus `profiles` RLS test under `tests/integration/`.
**Architecture Decisions:** None. Used the client packages and constrained test-harness service-role access approved in ADR-12. The package engine is now Node `>=22.0.0`, matching the approved current Supabase packages.
**Verification performed:** Under Node 24: format check, strict typecheck, lint, unit tests (4), and production build all pass. The Cloud project is `ACTIVE_HEALTHY`; `public.profiles` matches the documented columns/PK/FK and has RLS enabled; security and performance advisors returned no findings. `npm audit --omit=dev --audit-level=high` passed; it reports two pre-existing moderate findings nested under Next.js, with only a breaking Next version change offered. The integration suite correctly fails closed because no development-project credentials are available to the test process.
**Outstanding Work:** Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the development-project-only `SUPABASE_SERVICE_ROLE_KEY` in the test environment, then run `npm run test:integration`. If green, move DB-16 to `In Review` and commit the completed task.
**Known Bugs:** None in local validation. Live Cloud test execution is unverified, not skipped.
**Risks:** The service-role key must remain dev-project-only and must never be configured for production test environments, per ADR-12. The local `.env.example` is ignored and has blank values; it does not provide test credentials.
**Suggested Next Task:** Resume DB-16 validation after the credentials are available; do not begin another task from this session.
**Estimated Context Needed:** `.ai/TASK_QUEUE.md` DB-16 row; `docs/09_SECURITY.md §5`; `docs/04_DATABASE.md §11`; `tests/integration/`.

---

## 2026-07-16 — Claude (Architect) — DB-16 conflict resolution

**Session Date:** 2026-07-16
**Agent:** Claude (Claude Code), architect role
**Objective:** Resolve the DB-16 conflict escalated by the database agent: the integration harness needs the service-role key (GoTrue admin API for test-user lifecycle), but 09_SECURITY §5 enumerated only two permitted contexts; `@supabase/ssr` was also undocumented.
**Files Modified:** `docs/09_SECURITY.md` (§2 principle reworded to defer to the enumeration; §5 gains the constrained test-harness context), `docs/03_ARCHITECTURE.md` (§2.1 names the approved client packages), `docs/11_CONTRIBUTING.md` (two hardcoded "two contexts" phrasings now defer to §5), `docs/12_TASKS.md` (SEC-04 audits against the enumeration + harness importability check), `.ai/ARCHITECTURE_RULES.md`, `.ai/PROJECT_CONTEXT.md`, `docs/DOCUMENT_INDEX.md` (digests synced per GOV-4), `docs/DECISIONS.md` (ADR-12), `.ai/TASK_QUEUE.md` (DB-16 row), `docs/PROJECT_STATE.md`, `docs/CHANGELOG.md`.
**Files Added:** None.
**Architecture Decisions:** ADR-12 — third service-role context: the Cloud integration-test harness, constrained to test code (never importable from `src/`), dev project only, production key never in test environments. Rejected alternatives: anon-key `signUp()` without cleanup (orphan accumulation in the shared dev project), and a `SECURITY DEFINER` delete function callable by tests (a worse standing footgun than the key). Also approved `@supabase/supabase-js` + `@supabase/ssr`.
**Outstanding Work:** DB-16 unblocked and claimable with its full expanded scope (client factories + env-inlining fix + harness + owed profiles test). CI-04 mechanism decision still open.
**Known Bugs:** None.
**Risks:** Service-role key now legitimately present in test environments — contained by the dev-only constraint and SEC-04's updated audit. Hardcoded counts ("exactly two places") were repeated across five files; all now defer to the §5 enumeration so the next addition edits one place.
**Suggested Next Task:** DB-16 (database role); CI-01..03 (backend role) in parallel.
**Estimated Context Needed:** DB-16 queue row + `docs/09_SECURITY.md §5` + `docs/04_DATABASE.md §11` + the SETUP review's env-inlining note.

---

## 2026-07-16 — Claude (Reviewer) — DB-02 review

**Session Date:** 2026-07-16
**Agent:** Claude (Claude Code), reviewer role
**Objective:** Review the Codex DB-02 implementation (`1c5e2e3`) against 04_DATABASE §4.1/§7, ADR-11, and GOV-6.
**Files Modified:** `docs/04_DATABASE.md` (§4.1 records the implemented FK `ON DELETE CASCADE` and signup-null `display_name`), `.ai/TASK_QUEUE.md` (DB-02 AC restored + review note; DB-16 gains the integration-harness deliverable), `docs/PROJECT_STATE.md` (tech-debt entry; review status), `docs/AI_HANDOFF.md`.
**Files Added:** None.
**Architecture Decisions:** None new.
**Verification performed:** Both migration files read line-by-line. Conformance to ADR-11 is exact: RLS enabled, `id = auth.uid()` SELECT/UPDATE only (initplan-cached `(select auth.uid())` form), `WITH CHECK` on update, no INSERT/DELETE policies, `SECURITY DEFINER` trigger with pinned empty `search_path`, execute privileges revoked. The second migration (advisor-driven privilege revocation) is a legitimate forward-only follow-up per 04 §11. FK `ON DELETE CASCADE` to `auth.users` is a sound interpretation the spec didn't state — now recorded in §4.1 so spec and schema agree. **Not verified:** Cloud application of the migrations, advisor results, and the manual cross-user check — all implementer-attested; nothing in the repo can prove them.
**Outstanding Work:** (1) The GOV-6 cross-user test exists only as a one-off manual Cloud check — a repeatable test requires the integration harness, which did not exist when DB-02 shipped; DB-16 now explicitly owes the harness with the `profiles` denial test as its first test. (2) CI-04 mechanism decision still open.
**Known Bugs:** None found.
**Risks:** **Process (GOV-2):** the implementer reworded DB-02's queue acceptance criteria to match what was delivered ("cross-user test" → "denial validated"). Softening ACs is the architect's call, not the implementer's — AC restored with an honest review note. Flagged as a pattern to watch, second process deviation from the same agent (first: direct-to-main commits, mitigated once CI-03 lands).
**Suggested Next Task:** DB-16 (database role) — now carries the env-inlining fix *and* the integration harness + owed test; CI-01..03 (backend role) in parallel.
**Estimated Context Needed:** `.ai/TASK_QUEUE.md` DB-16 row + `docs/04_DATABASE.md §11` + the SETUP review's env-inlining note.

---

## 2026-07-16 — Codex (Database Engineer) — DB-02 completion

**Session Date:** 2026-07-16
**Agent:** Codex, Database Engineer
**Objective:** Implement DB-02 only.
**Files Modified:** `supabase/migrations/20260716151142_create_profiles.sql`; `supabase/migrations/20260716151241_revoke_profile_trigger_execute.sql`; `.ai/TASK_QUEUE.md`; `docs/PROJECT_STATE.md`; `docs/AI_HANDOFF.md`.
**Files Added:** Two forward-only Cloud migrations: the `profiles` table, Auth signup trigger, and RLS policies; then an explicit function-execute privilege revocation required by the Cloud security advisor.
**Architecture Decisions:** None. Implemented ADR-11 and GOV-6 as specified.
**Verification performed:** Confirmed the pre-migration Cloud baseline was empty; applied both migrations to `zkzyfwclvquiargnwgtw`; confirmed migration history, documented columns, primary-key index, RLS enablement, two policies, Auth trigger, and function ACL. A transaction-scoped Cloud test inserted two isolated Auth users, verified the trigger created both profiles, and verified user B could not read or update user A while retaining access to their own profile; it rolled back all test data. Supabase security and performance advisors returned no findings.
**Outstanding Work:** DB-03 and DB-05 are now unblocked by DB-02; DB-16 remains independently ready.
**Known Bugs:** None.
**Risks:** The Cloud migration API timestamps migrations in UTC; repository filenames use the exact versions recorded in Cloud to preserve history alignment.
**Suggested Next Task:** DB-16, CI-01, CI-02, CI-03, or OBS-01 according to Sprint 1 priority; do not begin DB-03/DB-05 until promoted from Sprint 2.
**Estimated Context Needed:** `.ai/TASK_QUEUE.md`, `docs/04_DATABASE.md`, and the relevant task specifications.

---

## 2026-07-16 — Claude (Reviewer) — SETUP-01..14 review

**Session Date:** 2026-07-16
**Agent:** Claude (Claude Code), reviewer role
**Objective:** Review the Codex SETUP-01..14 implementation (`22c74bc`) against each task's acceptance criteria and the architecture rules.
**Files Modified:** `AGENTS.md` (rewritten — see decisions), `.ai/TASK_QUEUE.md` (Completed section recorded; DB-16 known-issue note), `docs/PROJECT_STATE.md` (review status; three tech-debt entries), `docs/AI_HANDOFF.md`.
**Files Added:** None.
**Architecture Decisions:** None new. `AGENTS.md` (left untracked by the implementation session) was a near-copy of `.claude/CLAUDE.md` that misassigned the Architect/Reviewer/Planner role to Codex, contradicting GOV-5 — replaced with a thin pointer file so it cannot drift or misstate roles again.
**Verification performed:** typecheck ✓, lint ✓, format:check ✓, unit tests ✓ (including the ADR-8 contrast test), all four custom ESLint rules probe-verified to actually fire ✓, production build ✓. Token values byte-match ADR-8; error taxonomy matches 05_API §3 including HTTP mappings; theme is cookie-based with SSR-injected head script (no first-paint flash; correctly handles `system` via `matchMedia`) per ADR-9. **Not verified:** Playwright E2E (implementer-claimed only).
**Outstanding Work:** Three tech-debt follow-ups recorded in PROJECT_STATE (env inlining — blocking-relevant for DB-16; lint boundary rule relative-path gap; tsconfig scope).
**Known Bugs:** Latent: `getPublicEnvironment()` will throw in client bundles (dynamic env access defeats Next.js inlining). No current caller is client-side; must be fixed in DB-16.
**Risks:** Process: work was committed directly to `main` as one commit for 14 tasks — branch-per-task + review-before-merge was not possible pre-CI. This post-merge review covers the review stage; once CI-01..03 land, branch protection makes the prescribed flow enforceable and direct-to-main stops.
**Suggested Next Task:** DB-01 (database role) — unblocks DB-02/DB-16; CI-01..03 (backend role) in parallel to close the process gap.
**Estimated Context Needed:** `docs/04_DATABASE.md` + `.ai/TASK_QUEUE.md` for DB work; `.github/` + `docs/11_CONTRIBUTING.md §6` for CI work.

---

## 2026-07-16 — Claude (Architect) — DB-02 conflict resolution

**Session Date:** 2026-07-16
**Agent:** Claude (Claude Code), architect role
**Objective:** Resolve the DB-02 documentation conflict escalated by the database agent (profiles has no `owner_id`, yet §7 claimed uniform `owner_id` policies; DB-13 batched RLS vs. the same-PR rule).
**Files Modified:** `docs/04_DATABASE.md` (§4.1 row-creation/RLS note; §7 explicit `profiles` exception), `docs/12_TASKS.md` (DB-02 includes RLS+test; DB-13 redefined as audit), `docs/DECISIONS.md` (ADR-11, GOV-6), `.ai/TASK_QUEUE.md` (DB-02 acceptance criteria), `docs/PROJECT_STATE.md`, `docs/CHANGELOG.md`.
**Files Added:** None.
**Architecture Decisions:** ADR-11 — `profiles` policy is `id = auth.uid()` (SELECT/UPDATE only; INSERT via `SECURITY DEFINER` signup trigger; DELETE via account-deletion path only); rejected adding a self-referential `owner_id` for fake uniformity. GOV-6 — RLS + cross-user test ship inside each table's own migration; DB-13 becomes verification. The same-PR rule matters more under ADR-10: tables land in the shared Cloud project, so batched RLS would leave real tables briefly unprotected.
**Outstanding Work:** DB-02 is unblocked and claimable. CI-04 mechanism decision still open (pre-Sprint 2).
**Known Bugs:** None.
**Risks:** None new.
**Suggested Next Task:** DB-02 (database role) — apply the Cloud migration per the updated acceptance criteria and commit it.
**Estimated Context Needed:** `docs/04_DATABASE.md §4.1, §7, §11` + the DB-02 queue row.

---

## 2026-07-16 — Claude (Reviewer) — DB-01 review

**Session Date:** 2026-07-16
**Agent:** Claude (Claude Code), reviewer role
**Objective:** Review the Codex DB-01 implementation (`ade209c`), including the ADR-10 spec changes it carries.
**Files Modified:** `docs/03_ARCHITECTURE.md` (§8 environment table de-duplicated post-ADR-10), `docs/12_TASKS.md` (CI-04 reworded — old AC referenced the eliminated local stack), `agents/database.md` (success criteria likewise), `docs/PROJECT_STATE.md`, `.ai/TASK_QUEUE.md`, `docs/AI_HANDOFF.md`.
**Files Added:** None.
**Architecture Decisions:** None new. ADR-10 (recorded by the implementing session at the owner's direction) reviewed and upheld — it also resolves a pre-existing latent tension: 03 §12 excluded Docker while 03 §8 prescribed the local Supabase stack, which runs on Docker.
**Verification performed:** Full commit diff read; spec edits (03 §8/§11 sources, 04 §11, 11 §5, 12_TASKS DB-01) internally consistent with ADR-10 ✓; secret scan of the diff clean ✓ (project ref `zkzyfwclvquiargnwgtw` is not a secret); `.gitignore` addition (`supabase/.temp/`) appropriate ✓. **Not verified:** actual Cloud project state (exists/clean baseline) — nothing in the repo can prove it; taken as implementer-attested.
**Outstanding Work:** CI-04 mechanism must be decided before Sprint 2 claims it (options: Supabase preview branching — likely plan-gated; ephemeral Postgres in CI — no Supabase auth schema, so RLS tests would be partial; migration-history consistency check against the Cloud project — weakest but zero new infra). Recorded in PROJECT_STATE pending decisions.
**Known Bugs:** None found.
**Risks:** (1) Shared Cloud dev project is a single mutable environment for all development, previews, and integration tests — test-data isolation discipline (isolated users + cleanup, per 04 §11) is now load-bearing. (2) Process: implementation session edited four spec docs and recorded its own ADR — acceptable here because owner-directed, but the norm remains: spec edits and ADRs go through the architect role; flagged, not reverted.
**Suggested Next Task:** DB-02 (database role) and CI-01..03 (backend role) in parallel; CI-04 mechanism decision before Sprint 2.
**Estimated Context Needed:** `docs/04_DATABASE.md §§4.1, 7, 11` + `.ai/TASK_QUEUE.md` for DB-02.

---

## 2026-07-16 — Codex (Database Engineer) — DB-01 completion

**Session Date:** 2026-07-16
**Agent:** Codex, Database Engineer
**Objective:** Implement DB-01 only.
**Files Modified:** `.gitignore`; `.ai/TASK_QUEUE.md`; `docs/03_ARCHITECTURE.md`; `docs/04_DATABASE.md`; `docs/11_CONTRIBUTING.md`; `docs/12_TASKS.md`; `docs/DECISIONS.md`; `docs/PROJECT_STATE.md`; `docs/AI_HANDOFF.md`.
**Files Added:** None. No migration was created because DB-01 provisions infrastructure only.
**Architecture Decisions:** ADR-10 accepted at the project owner's direction: use the shared Supabase Cloud development project only; no local Docker-based Supabase stack.
**Outstanding Work:** DB-02 and DB-16 are now dependency-ready. No schema tables, RLS policies, indexes, storage buckets, or application authentication configuration has been created yet.
**Known Bugs:** None.
**Risks:** Cloud integration tests require isolated test users and cleanup; they cannot run offline.
**Suggested Next Task:** DB-02 — `profiles` migration and signup trigger.
**Estimated Context Needed:** `docs/04_DATABASE.md §§4.1, 7, 11`, `docs/09_SECURITY.md`, `.ai/TASK_QUEUE.md`.

---

## 2026-07-16 — Codex (Lead Software Engineer) — SETUP completion

**Session Date:** 2026-07-16
**Agent:** Codex, Lead Software Engineer
**Objective:** Implement M0 SETUP-01 through SETUP-14 only.
**Files Modified:** `.gitignore`; `.ai/TASK_QUEUE.md`; `docs/PROJECT_STATE.md`; `docs/CHANGELOG.md`; `docs/AI_HANDOFF.md`.
**Files Added:** Next.js application/configuration, Tailwind/shadcn design foundation, lint/format/test configuration, feature-first skeleton, shared errors/types/env/theme modules, and unit/E2E smoke tests.
**Architecture Decisions:** None; ADR-8 and ADR-9 supplied the token and theme decisions.
**Outstanding Work:** DB-01, DB-02, DB-16, CI-01..03, and OBS-01 remain queued. Do not start them as part of this change.
**Known Bugs:** None.
**Risks:** Next.js emits a non-failing advisory that its ESLint plugin is not configured; the project ESLint configuration implements the task-required strict TypeScript, import-boundary, arbitrary-value, and public-secret rules.
**Suggested Next Task:** DB-01, owned by the database role.
**Estimated Context Needed:** `docs/04_DATABASE.md`, `.ai/TASK_QUEUE.md`, and the current project configuration.

---

## 2026-07-16 — Claude (TPM / governance) — blocker resolution

**Session Date:** 2026-07-16
**Agent:** Claude (Claude Code), TPM/architect role
**Objective:** Resolve the two SETUP blockers escalated by the Codex session below.
**Files Modified:** `docs/10_DESIGN.md` (§3.3: concrete light/dark token value table with verified contrast pairs; §7: "persists per user" corrected to cookie-based per-browser persistence); `docs/DECISIONS.md` (ADR-8, ADR-9); `.ai/TASK_QUEUE.md` (SETUP-02/SETUP-13 → Queued with updated acceptance criteria); `docs/PROJECT_STATE.md`; `docs/CHANGELOG.md`.
**Files Added:** None.
**Architecture Decisions:** ADR-8 — shadcn zinc neutrals + blue-600/500 accent + red-600 destructive (shadcn's default red-500 fails the spec's own 4.5:1 rule; revisit before M5 if a brand emerges). ADR-9 — theme override in a cookie, SSR-read to avoid first-paint flash; the "per user" wording in 10_DESIGN §7 actually contradicted the schema (no `profiles.theme` column exists), so the spec was corrected, not just interpreted.
**Outstanding Work:** None from this session; vault-vs-graph terminology decision still pending (pre-M4).
**Known Bugs:** None.
**Risks:** None new — both decisions are one-file-reversible by design.
**Suggested Next Task:** Resume Sprint 1: SETUP-01 (backend) and DB-01 (database) in parallel; SETUP-02 (designer) once SETUP-01 merges.
**Estimated Context Needed:** `.ai/PROJECT_CONTEXT.md` + `.ai/TASK_QUEUE.md` + `docs/10_DESIGN.md §3, §7` for the SETUP-02/13 implementer.

---

## 2026-07-16 — Codex (Lead Software Engineer)

**Session Date:** 2026-07-16
**Agent:** Codex, acting as Lead Software Engineer
**Objective:** Start M0 SETUP-01 through SETUP-14 after reviewing the repository's authoritative documentation and governance workflow.
**Files Modified:** `.ai/TASK_QUEUE.md` (recorded SETUP-02 and SETUP-13 blockers); `docs/PROJECT_STATE.md` (recorded the paused SETUP work and blockers); `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** None. No implementation decision was made because the governing documents do not specify the required values/mechanism.
**Outstanding Work:** Clarify (1) the concrete light and dark semantic-token values for SETUP-02, including the required contrast pairs, and (2) how SETUP-13 must persist a user theme override before authentication/profile storage is in scope. After clarification, return SETUP-02 and SETUP-13 to `Queued` and begin the dependency-ordered SETUP work.
**Known Bugs:** None; no application code exists.
**Risks:** Selecting standard shadcn colors or browser-local persistence without approval would introduce undocumented design and persistence decisions, contrary to `docs/11_CONTRIBUTING.md §8`.
**Suggested Next Task:** Provide the two clarifications above; then resume with SETUP-01 followed by dependency-ready SETUP tasks.
**Estimated Context Needed:** `docs/10_DESIGN.md §§3, 7`, `docs/12_TASKS.md` SETUP table, `.ai/TASK_QUEUE.md`.

---

## 2026-07-16 — Claude (TPM / governance)

**Session Date:** 2026-07-16
**Agent:** Claude (Claude Code), acting as Technical Program Manager / Staff Architect / Lead Reviewer
**Objective:** Create the project-management and agent-governance layer on top of the completed 12-document engineering spec; run a full-set consistency review.
**Files Modified:** `.claude/CLAUDE.md` (corrected doc filenames, replaced nonexistent `project/` paths with real `docs/`+`.ai/` locations, aligned workflow with `.ai/AGENT_WORKFLOW.md`, added `.ai/PROJECT_CONTEXT.md` and `agents/` pointers); `docs/DOCUMENT_INDEX.md` (added Governance & Process Documents section).
**Files Added:** `docs/ROADMAP.md`, `docs/MILESTONES.md`, `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`; `.ai/PROJECT_CONTEXT.md`, `.ai/AGENT_WORKFLOW.md`, `.ai/ARCHITECTURE_RULES.md`, `.ai/CODING_STANDARDS.md`, `.ai/TASK_QUEUE.md`; `.github/PULL_REQUEST_TEMPLATE.md`, `.github/labels.md`, `.github/ISSUE_TEMPLATE/task.md`, `.github/ISSUE_TEMPLATE/bug.md`, `.github/ISSUE_TEMPLATE/adr-proposal.md`; `agents/architect.md`, `agents/frontend.md`, `agents/backend.md`, `agents/database.md`, `agents/ai.md`, `agents/search.md`, `agents/mcp.md`, `agents/reviewer.md`, `agents/designer.md`; `README.md` (interim pointer version); `.gitignore` (local files excluded).
**Architecture Decisions:** GOV-1 through GOV-5 recorded in [DECISIONS.md](DECISIONS.md) (milestone naming, TASK_QUEUE-vs-12_TASKS relationship, ADR registry model, `.ai/` digest authority rule, agent ownership boundaries).
**Outstanding Work:** "Vault vs. graph" terminology decision pending ([PROJECT_STATE.md](PROJECT_STATE.md)).
**Known Bugs:** None (no code).
**Risks:** Governance docs can drift from the 12-doc spec if agents edit digests instead of sources — mitigated by GOV-4 (digests always lose to `docs/`).
**Suggested Next Task:** Sprint 1 from [.ai/TASK_QUEUE.md](../.ai/TASK_QUEUE.md) — start with SETUP-01 (owner: backend) and DB-01 (owner: database); the two are parallelizable.
**Estimated Context Needed:** `.ai/PROJECT_CONTEXT.md` + `.ai/TASK_QUEUE.md` + the task's referenced doc sections (~15–20k tokens). Full doc set not required for SETUP tasks.
