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

## 2026-07-21 — Claude (Implementer + Reviewer) — SHELL-03 sidebar navigation frame + logout trigger

**Session Date:** 2026-07-21
**Agent:** Claude, implementer + reviewer (independence suspended per user authorization; compensated with an inline review pass and full local gates)
**Objective:** SHELL-03 — add the sidebar navigation frame for folders/tags/daily note, populated by later tasks; bind AUTH-08's visible logout trigger.
**Files Modified:** `src/features/shell/components/app-shell.tsx` (server-composes `signOut` into navigation), `src/features/shell/components/shell-panel.tsx` (accepts children; unmounts them when collapsed), `e2e/auth-session.spec.ts` (extends real signup/login flow through the visible logout control), `.ai/TASK_QUEUE.md`, `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** `src/features/shell/components/sidebar-navigation.tsx`, `sidebar-navigation.test.tsx`.
**Architecture Decisions:** None new. Inline reviewer removed initially-invented `/daily`/`/folders`/`/tags` links: no source-of-truth document defines these route paths yet, and SHELL-03 explicitly scopes the frame as “populated by later phases.” It now ships semantic labelled section landmarks without dead links; owning tasks add destinations. `signOut` is injected by the server `AppShell`, keeping the sidebar component isolated/testable and preserving ADR-20's server-only auth boundary.
**Verification performed:** Typecheck/lint/format/build green; unit suite 25 files / 89 tests (3 new). Inline review checked composition, accessibility, no invented routes, collapsed-child behavior, and AUTH-08 binding. The existing Cloud e2e was extended to click the visible Log out button and assert `/login` + no `sb-*` cookies; local execution was denied by auto-mode policy because the test creates/deletes a real user in the shared dev project. This is reported honestly; required PR CI does not run e2e.
**Outstanding Work:** Independent PR gate/review; later FOLD/NOTE/TAG tasks populate the section bodies and define navigation destinations. SHELL-05 adds shortcuts; SHELL-06 responsive behavior; SHELL-10 motion.
**Known Bugs:** None.
**Risks:** E2E extension is not locally executed this task due to the shared-project mutation denial; the same underlying AUTH-08 action was live-proven before PR #66.
**Suggested Next Task:** AUTH-06 password reset flow (unblocks AUTH-14) in parallel with SHELL-10.
**Estimated Context Needed:** This entry, `src/features/shell/components/sidebar-navigation.tsx`, AUTH-08 handoff.

## 2026-07-21 — Claude (Implementer + Reviewer) — AUTH-08 logout action (ADR-22)

**Session Date:** 2026-07-21
**Agent:** Claude, implementer + reviewer (independence suspended per user authorization; compensated with live e2e verification)
**Objective:** AUTH-08 — explicit logout revokes the current refresh token server-side (09_SECURITY §3).
**Files Modified:** `docs/DECISIONS.md` (ADR-22), `.ai/TASK_QUEUE.md` (AUTH-08 → In Review), `docs/PROJECT_STATE.md`, `docs/CHANGELOG.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** `src/features/auth/sign-out.ts` (server action), `src/features/auth/sign-out.test.ts` (2 units).
**Architecture Decisions:** ADR-22 — call `signOut({ scope: "local" })` explicitly. Supabase JS defaults to `global` (kills every device session); the spec's singular “revokes the refresh token” and least-surprise logout semantics mean this session only. “Sign out everywhere” remains a future explicit account-security affordance.
**Implementation:** Server action obtains the ADR-20 cookie-bound Supabase client, revokes the current session via `scope: "local"` (the SDK removes the cookie-backed session through the adapter), and always redirects to `/login`. Supabase Auth JS clears local session storage even when its remote revocation call returns an operational error, so redirect-on-error is safe. The visible trigger is intentionally not invented here — SHELL-03 owns sidebar contents and will bind `<form action={signOut}>`.
**Verification performed:** Typecheck/lint/format/build green; unit suite 24 files / 86 tests. A temporary protected probe page + Playwright spec exercised the **real** server action against the dev project: real signup established `sb-*` cookies → logout cleared all session cookies → browser landed at `/login`; service-role user cleanup succeeded. Probe files were deleted before commit; cache cleared and final typecheck/build proved no probe route remains. First attempt hit a stale reused dev server/underscore-private-route 404; corrected to a non-underscore temporary route, rerun green.
**Outstanding Work:** Independent reviewer must verify AUTH-08. SHELL-03 wires the visible trigger; AUTH-06/07/09/14 remain.
**Known Bugs:** None.
**Risks:** Supabase cannot revoke already-issued access JWTs; they remain valid until their ≤1h expiry (documented platform behavior, already bounded by 09_SECURITY §3). The refresh token is revoked immediately.
**Suggested Next Task:** Review AUTH-08, then SHELL-03 (sidebar contents + logout trigger) or AUTH-06 (password reset).
**Estimated Context Needed:** This entry, ADR-22, `src/features/auth/sign-out.ts`.

## 2026-07-19 — Codex (Frontend) — SHELL-02 three-zone app shell complete

**Session Date:** 2026-07-19
**Agent:** Codex, frontend implementation role
**Objective:** Establish the documented three-zone authenticated app shell with collapsible left and right panels (SHELL-02).
**Files Modified:** `.ai/TASK_QUEUE.md`, `src/app/(app)/page.tsx`, `src/app/(app)/page.test.tsx`, `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry), `docs/CHANGELOG.md`.
**Files Added:** `src/app/(app)/layout.tsx`, `src/features/shell/components/app-shell.tsx`, `src/features/shell/components/shell-panel.tsx`, `src/features/shell/components/app-shell.test.tsx`.
**Architecture Decisions:** None. Implemented the existing server-component default and `10_DESIGN §3.2` three-zone contract; the client boundary is confined to each independently stateful rail.
**Implementation:** Added the authenticated route-group layout, a server-composed shell with semantic sidebar/main/context landmarks, and accessible icon controls that collapse each rail without affecting the other. Removed the page-level `<main>` so the shell owns the single main landmark. No dependencies, design tokens, business logic, data access, shortcuts, breakpoint behavior, or motion were introduced.
**Verification performed:** `npm test` (23 files, 84 tests), strict typecheck, lint, format check, and production build all passed. Authenticated rendered QA at 1440×900 passed in light and dark themes using the installed Playwright fallback: title/route/main content present, both controls proven independently, console clean, no framework error overlay. The disposable Supabase dev user was deleted after each run. Concept and implementation screenshots were inspected directly.
**Outstanding Work:** Independent reviewer must verify and merge PR #64. SHELL-03 owns navigation contents; SHELL-05 owns shortcuts; SHELL-06 owns responsive drawers/overlays; SHELL-10 owns motion/reduced motion. No follow-on task was started.
**Known Bugs:** None.
**Risks:** Until SHELL-06, the shell intentionally implements only the documented desktop three-zone behavior. The Next dev server emitted its known cross-origin future-warning during fallback QA because Playwright used `127.0.0.1` while Next advertised `localhost`; production build and page console were clean.
**Suggested Next Task:** Review and merge SHELL-02. After merge, SHELL-03 is unblocked; do not auto-monitor the merge.
**Estimated Context Needed:** This entry, PR #64, `docs/10_DESIGN.md §3.2`, and `src/features/shell/components/`.

## 2026-07-19 — Codex (Backend) — CI-04 Supabase migration gate complete

**Session Date:** 2026-07-19
**Agent:** Codex, backend implementation role
**Objective:** Make migration execution and repository↔Cloud migration-history parity required pull-request checks (CI-04).
**Files Modified:** `.github/workflows/ci.yml`, `.prettierignore`, `.ai/TASK_QUEUE.md`, `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry), `docs/CHANGELOG.md`.
**Files Added:** `tools/ci/replay-supabase-migrations.sh`, `tools/ci/check-supabase-migration-drift.sh`, `tools/ci/supabase-postgres-17-baseline.sql`, `tools/ci/supabase-postgres-17-baseline.source.md`.
**Architecture Decisions:** None. Implemented ADR-13 as amended by ADR-21: CI-only pinned Postgres, commit-pinned official platform fixture, and a two-secret Cloud drift check skipped for fork PRs.
**Implementation:** Added the independent `Migration check` job on `supabase/postgres:17.6.1.136`. The checksum-verified fixture is vendored unchanged from `supabase/pg-toolbelt@f2420d9e0f6f5b399386b5f77bd581af55a7a141` (SHA-256 `89b5d0fd9c0d2457b49602203fb927b9fc5e7d1aef5614f90ce9e2a5cb60623a`) and runs as the image's `supabase_admin`; project migrations run separately as the Cloud-equivalent `postgres` role. Replay asserts all 13 public tables, RLS on every public table, Auth/Storage baseline objects and operation helpers, the private attachments bucket, vector/pg_cron/pg_net, and the retention schedule. Same-repository PRs install Supabase CLI `2.109.1`, link to the dev project with the approved repository secrets, and fail closed unless every documented 14-digit Local/Remote history row matches; fork PRs retain credential-free replay and skip only this Cloud step.
**Verification performed:** Shell syntax and fixture checksum passed; the vendored SQL was byte-identical to its pinned upstream source. Format, strict typecheck, lint, 81 unit tests, and production build passed locally. GitHub Actions run #72 passed all six jobs; `Migration check` passed in 53s after replaying the full history and validating Cloud parity. Live `main` protection was updated and read back as `strict: true` with exactly six GitHub-Actions-owned contexts (`app_id` 15368): Typecheck, Lint, Format, Unit tests, Dependency audit, Migration check.
**Outstanding Work:** Independent reviewer must verify CI-04 and merge PR #62. No follow-on task was started; automatic merge monitoring remains disabled per user instruction.
**Known Bugs:** None.
**Risks:** The fixture and image pin must be updated together when the managed project's Postgres/platform baseline changes. The current Go CLI renders `migration list` as a table even when given its global JSON-output flag, so the fail-closed parser intentionally follows the pinned CLI's documented 14-digit version format. Credentialed drift validation remains same-repository-only per GOV-7.
**Suggested Next Task:** Review CI-04. After review/merge, choose one remaining queued Sprint 2 task; do not auto-monitor PR merge status.
**Estimated Context Needed:** This entry, PR #62, `.github/workflows/ci.yml`, `tools/ci/`, ADR-13/21, and the live required-status-check response.

## 2026-07-19 — Claude (Architect) — ADR-21: CI-04 escalation arbitrated

**Session Date:** 2026-07-19
**Agent:** Claude, architect role
**Objective:** Arbitrate Codex's CI-04 blocker (two ADR-13 inaccuracies) — no implementation.
**Files Modified:** `docs/DECISIONS.md` (ADR-21 recorded; ADR-13 marked amended), `.ai/TASK_QUEUE.md` (CI-04 → Blocked (repo secrets) with the amended contract), `docs/AI_HANDOFF.md` (this entry).
**Architecture Decisions:** ADR-21 — replay job pins `supabase/postgres:17.6.1.136` + a commit-pinned official baseline fixture (bare image lacks `auth.users`/`storage.objects`/storage helpers); drift check requires `SUPABASE_ACCESS_TOKEN` **and** `SUPABASE_DB_PASSWORD` repo secrets, fork-skipped (GOV-7). Both Codex claims verified against Supabase docs and Docker Hub before accepting.
**Verification performed:** Docs fetch (managing-environments CI guidance names both secrets); Docker Hub tag lookup (17.6.1.136 published 2026-06-15).
**Outstanding Work:** User must add the two repo secrets (`gh secret set` — values never through chat); then CI-04 is claimable under the amended contract.
**Known Bugs:** None.
**Risks:** Vendored fixture must be bumped when migrations reference newer platform objects — reviewable by design.
**Suggested Next Task:** CI-04 (Codex, once secrets exist); AUTH-06/08/09 open in parallel.
**Estimated Context Needed:** ADR-21, the CI-04 queue row.

## 2026-07-19 — Codex (Backend) — CI-05 dependency audit gate complete

**Session Date:** 2026-07-19
**Agent:** Codex, backend implementation role
**Objective:** Make high-severity dependency findings block pull-request merges (CI-05).
**Files Modified:** `.github/workflows/ci.yml`, `.ai/TASK_QUEUE.md`, `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry), `docs/CHANGELOG.md`.
**Files Added:** None.
**Architecture Decisions:** None. Implemented the existing `11_CONTRIBUTING §6` and `09_SECURITY §10` policy as an independent, credential-free PR job.
**Implementation:** Added the stable `Dependency audit` job on pinned Node 22.12.0, running `npm audit --audit-level=high` against all dependencies in the lockfile. After GitHub emitted the new context successfully, extended live `main` protection from four to five required checks while preserving strict up-to-date enforcement and pinning every context to the GitHub Actions app (`app_id` 15368).
**Verification performed:** Local `npm audit --audit-level=high` exited successfully and reported only the two known moderate transitive PostCSS findings. Format check, strict typecheck, lint, 81 unit tests, and production build passed. The first GitHub `Dependency audit` run passed; branch protection was independently read back as `strict: true` with exactly `Typecheck`, `Lint`, `Format`, `Unit tests`, and `Dependency audit`, all Actions-owned.
**Outstanding Work:** Independent reviewer must verify CI-05 and the live protection setting. No other task was started.
**Known Bugs:** None.
**Risks:** The audit uses npm's current advisory feed, so registry availability is an external dependency of the PR gate. Moderate findings remain non-blocking by documented policy; SEC-07 owns dependency pinning/audit review.
**Suggested Next Task:** Review CI-05. After both implementation and reviewer-outcome PRs merge, CI-04 is the remaining P0 Sprint 2 backend task; AUTH-08 needs its logout trigger clarified, and AUTH-09 needs a defined `Profile` shape/display-name validation contract before implementation.
**Estimated Context Needed:** This entry, PR CI results, `.github/workflows/ci.yml`, `11_CONTRIBUTING §6`, and the live required-status-check response.

## 2026-07-19 — Codex (Backend) — AUTH-05 route protection complete

**Session Date:** 2026-07-19
**Agent:** Codex, backend implementation role
**Objective:** Protect the `(app)` route group and redirect unauthenticated visitors to login.
**Files Modified:** `.ai/TASK_QUEUE.md` (AUTH-05 → In Review), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry), `docs/CHANGELOG.md`, `src/middleware.ts`, `src/middleware.test.ts`, `e2e/home.spec.ts`.
**Files Moved:** `src/app/page.tsx` and its test → `src/app/(app)/`; the route remains `/`.
**Files Deleted:** `src/app/(app)/.gitkeep`, replaced by the real app page.
**Architecture Decisions:** None. Implemented AUTH-05 on top of ADR-20: middleware continues verified-claims refresh, then fails closed for protected page routes. `/login`, `/signup`, and `/api/*` remain outside this page-route gate; API handlers keep their existing per-surface authentication policies.
**Implementation:** Anonymous or invalid sessions requesting app pages receive a 307 redirect to `/login`. A verified claims subject permits the request. Session cookies rotated or cleared during validation are copied to redirect responses with the existing ADR-20 hardening intact. Auth validation exceptions fail closed for app pages without making public auth pages unavailable.
**Verification performed:** Focused middleware/root tests passed 8/8. Full format check, strict typecheck, lint, 81 unit tests, and production build passed. Live Playwright passed 2/2: anonymous `/` redirects to `/login`; real Cloud signup and login sessions enter `/` with HttpOnly cookies, followed by service-role cleanup of the isolated user.
**Outstanding Work:** Independent reviewer must verify AUTH-05. AUTH-06/07/08/09 remain queued; no next auth task was started.
**Known Bugs:** None.
**Risks:** The public-page allowlist must be extended when AUTH-06 or AUTH-07 adds password-recovery or OAuth callback pages. API routes are deliberately excluded from page redirects and must continue authenticating according to their own contracts.
**Suggested Next Task:** Review AUTH-05. After both implementation and reviewer-outcome PRs merge, AUTH-08 is the smallest dependency-ready continuation; AUTH-06/07/09 are also ready.
**Estimated Context Needed:** This entry, AUTH-05 diff, ADR-20, `src/middleware.ts`, and `e2e/auth-session.spec.ts`.

## 2026-07-19 — Claude (Implementer + Reviewer) — AUTH-04: session cookies + middleware refresh (ADR-20)

**Session Date:** 2026-07-19
**Agent:** Claude, implementer + reviewer (independence suspended per user authorization; compensated with live e2e verification)
**Objective:** AUTH-04 — session cookie handling per 09_SECURITY §3 (`HttpOnly`/`Secure`/`SameSite=Lax`) + middleware token refresh (FR-AUTH-4).
**Files Modified:** `src/shared/lib/supabase-server-client.ts` (+`hardenSessionCookieOptions` — every session-cookie writer passes through it), `src/features/auth/sign-up.ts` / `sign-in.ts` (**converted to server actions** with server-side schema re-validation and a new `invalid-input` reason; same result unions, forms unchanged), `src/app/api/theme/route.ts` (wired `resolveSessionUserId` into the OBS-02 slot), `.ai/TASK_QUEUE.md`, `docs/DECISIONS.md` (ADR-20), `docs/AI_HANDOFF.md` (this entry).
**Files Added:** `src/middleware.ts` (per-request `getClaims()` refresh writing rotated cookies with hardened flags; AUTH-05 adds route protection here), `src/shared/lib/supabase-server-action-client.ts` (cookie-store-bound client for actions/route handlers), `src/features/auth/resolve-user-id.ts` (verified-claims user id, never throws), `e2e/auth-session.spec.ts` (live browser proof), colocated unit tests.
**Files Deleted:** `src/shared/lib/supabase-browser-client.ts` — under ADR-20 a JS-token-reading client is exactly the XSS surface the spec eliminates; no remaining consumers.
**Architecture Decisions:** **ADR-20** — auth tokens handled exclusively server-side; 09_SECURITY §3's HttpOnly requirement is incompatible with the `@supabase/ssr` browser-client pattern, and the spec won. AUTH-02/03's wrappers became server actions (two-function conversion; their tests and forms survived structurally unchanged).
**Verification performed:** typecheck/lint/format green; unit suite 77/77 (13 new); production build emits the middleware; **live Playwright e2e against the dev project**: real signup → HttpOnly + SameSite=Lax `sb-*` cookies, `document.cookie` exposes no token to JavaScript, cleared cookies → login re-establishes the session, service-role cleanup of the e2e user. E2E self-skips without `.env` (CI/fork-safe, GOV-7).
**Outstanding Work:** AUTH-05 (route protection — extend `src/middleware.ts`), AUTH-07 (Google OAuth — its callback exchange must use the server-action client), AUTH-08 (logout — server-side revocation). `Secure` flag is production-only (localhost exemption, same as the theme cookie).
**Known Bugs:** None.
**Risks:** Any future client-side Supabase need (e.g. Realtime) must not resurrect a browser client — ADR-20 requires a token-broker design instead.
**Suggested Next Task:** AUTH-05 (S, now unblocked — protect `(app)` routes), then AUTH-08/07.
**Estimated Context Needed:** This entry, ADR-20, `src/middleware.ts`, `src/features/auth/`.

## 2026-07-18 — Claude (Implementer + Reviewer) — AUTH-03: login page + form

**Session Date:** 2026-07-18
**Agent:** Claude, implementer + reviewer (independence suspended per user authorization; compensated with live verification)
**Objective:** AUTH-03 — login page + form (FR-AUTH-1); add the deferred signup↔login cross-links.
**Files Modified:** `src/features/auth/components/sign-up-form.tsx` (refactored onto the shared field component — behavior unchanged, proven by the untouched AUTH-02 form tests), `src/app/(auth)/signup/page.tsx` (+ test: "Log in" cross-link), `.ai/TASK_QUEUE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** `src/app/(auth)/login/page.tsx` (+ test), `src/features/auth/sign-in-schema.ts` (email shape + password presence only — strength rules deliberately not applied on login), `src/features/auth/sign-in.ts` (browser-client wrapper; `invalid_credentials` → one neutral "Incorrect email or password." that never reveals account existence, 09_SECURITY §9 T8; missing-session guard), `src/features/auth/components/auth-form-field.tsx` (shared labeled-input-with-error block used by both auth forms), `src/features/auth/components/sign-in-form.tsx` (+ test).
**Architecture Decisions:** None new. Composition-over-duplication applied: the repeated field block was extracted to `AuthFormField` when the second consumer appeared, not before.
**Verification performed:** typecheck, lint, format green; unit suite 64/64 (16 new); production build emits `/login`; live smoke via `next start`: `/login` HTTP 200 server-rendered with form and `/signup` cross-link, `/signup` links back. The underlying `signInWithPassword` API path was live-verified against the dev project during AUTH-01 (immediate password sign-in OK).
**Outstanding Work:** AUTH-06 adds the "Forgot password?" link on `/login`. AUTH-14 owns richer error states. AUTH-04 (session cookies + middleware refresh) is the next backend gate — until it lands, sessions live in browser-managed cookies without server-side refresh.
**Known Bugs:** None.
**Risks:** None new.
**Suggested Next Task:** AUTH-04 (backend; gates AUTH-05/07/08), or SHELL-02 for a parallel frontend agent.
**Estimated Context Needed:** This entry, the AUTH-02 entry, `src/features/auth/`.

## 2026-07-18 — Claude (Implementer + Reviewer) — AUTH-02: signup page + form

**Session Date:** 2026-07-18
**Agent:** Claude, implementer + reviewer (independence suspended per user authorization; compensated with live verification)
**Objective:** AUTH-02 — signup page + form (FR-AUTH-1), React Hook Form + zod.
**Files Modified:** `package.json`/`package-lock.json` (added `react-hook-form` — already in the 03_ARCHITECTURE §2.1 stack table — plus `zod` and `@hookform/resolvers`, both named by the task), `.ai/TASK_QUEUE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** `src/app/(auth)/layout.tsx` (centered unauthenticated layout; the `(auth)` group is deliberately outside the `(app)` group AUTH-05 will protect), `src/app/(auth)/signup/page.tsx` (+ test), `src/features/auth/sign-up-schema.ts` (zod; password 8–72 mirroring ADR-19 + bcrypt bound), `src/features/auth/sign-up.ts` (browser-client wrapper; typed result union; maps `user_already_exists`/`weak_password`; treats a sessionless success as failure — the ADR-19 drift guard), `src/features/auth/components/sign-up-form.tsx` (RHF + zodResolver, labeled fields, `aria-describedby`/`aria-invalid` error wiring, `role="alert"` submit failures, pending-disabled submit), colocated tests for all of it.
**Architecture Decisions:** None new. Notable applications of existing rules: no `AuthService` — 05_API's catalog deliberately starts after authentication and 03_ARCHITECTURE §6.1 has the UI calling Supabase Auth directly, so the wrapper is a plain feature function (the naming rule reserves `<Domain>Service` for 05_API names); success redirects to `/` — the authenticated shell lands there when SHELL-02/AUTH-05 arrive.
**Verification performed:** typecheck, lint, format all green; unit suite 48/48 (17 new tests: schema bounds, error mapping incl. drift guard, form validation/a11y/pending/redirect, page render); production build emits `/signup`; live smoke against `next start`: HTTP 200 with server-rendered form.
**Outstanding Work:** AUTH-03 (login) should add the "already have an account?" cross-link on the signup page (omitted now to avoid a dead link) and `/login`. AUTH-14 owns richer error states. Pre-existing `npm audit` moderate findings (Next.js bundled postcss) predate this task — resolving means a Next upgrade, separate chore.
**Known Bugs:** None.
**Risks:** None new.
**Suggested Next Task:** AUTH-03 (login page — natural continuation), or AUTH-04 (backend session/middleware, gates AUTH-05/07/08).
**Estimated Context Needed:** This entry, the AUTH-01 entry (auth config), `src/features/auth/`.

## 2026-07-18 — Claude (Implementer + Reviewer) — AUTH-01: Supabase Auth configuration (ADR-19)

**Session Date:** 2026-07-18
**Agent:** Claude, implementer + reviewer (independence suspended per user authorization; compensated with live verification)
**Objective:** AUTH-01 — configure Supabase Auth (email/password + templates) on the dev project and record the configuration durably.
**Files Modified:** `docs/DECISIONS.md` (ADR-19), `.ai/TASK_QUEUE.md` (AUTH-01), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** `supabase/auth-config.md` (canonical per-environment setting record — the dashboard must match this file), `supabase/templates/confirmation.html`, `supabase/templates/recovery.html`.
**Architecture Decisions:** ADR-19 — email confirmation **off** (forced by FR-AUTH-1's acceptance criterion: signup must return an authenticated session; Supabase returns none while confirmation is pending), minimum password length 8 (no composition rules), templates committed but not applied to dev (free-tier projects created after 2026-06-03 cannot customize templates on default SMTP — Supabase changelog 46599); CI-07 applies them on production with custom SMTP.
**Verification performed:** Live signup probes against the dev project (disposable plus-tagged users, admin-API cleanup). Pre-change: confirmation ON (no session at signup — FR-AUTH-1 violation), password minimum 6. Post-change (user applied the dashboard checklist): 7-char password rejected, signup returns a session with `email_confirmed_at` set, immediate password sign-in succeeds. One transient "email rate limit exceeded" during verification was the built-in SMTP quota consumed by the pre-change probe, not a config failure.
**Process notes:** Auth config is dashboard-state, not SQL — it cannot ride a migration. `supabase/auth-config.md` is the reviewable proxy; treat dashboard drift from that file as a defect.
**Outstanding Work:** Sprint 2 remainder: AUTH-02..09/14 (UI track now unblocked), SHELL-02 (L — split at claim)/03/10, CI-04/05, CI-07 (custom SMTP + template apply + confirmation-setting revisit are called out in ADR-19/auth-config.md).
**Known Bugs:** None.
**Risks:** Dev's built-in SMTP delivers only to project team addresses at tiny rate limits — AUTH-06 manual testing must use a team email and tolerate the quota.
**Suggested Next Task:** AUTH-02 (frontend, now unblocked) in parallel with SHELL-02; AUTH-04 (backend) for Claude.
**Estimated Context Needed:** This entry, ADR-19, `supabase/auth-config.md`.

## 2026-07-18 — Claude (Reviewer) — SHELL-07 review & merge; PR #14 closed

**Session Date:** 2026-07-18
**Agent:** Claude, reviewer role (TPM/governance)
**Objective:** Final review of PR #14 (SHELL-07) after its rebase onto current main.
**Files Modified:** `.ai/TASK_QUEUE.md` (SHELL-07 → Done), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Architecture Decisions:** None new. Provider nesting (ThemeProvider outer → QueryProvider inner) accepted — correctly reasoned and reported in the implementer's handoff.
**Verification performed:** Substance was approved in round one (2026-07-17: defaults, dependency split, devtools gating). Round two verified: rebase onto current main (merge state CLEAN, four required checks green), the invented PROJECT_STATE section removed, governance entries preserved, nesting decision reported. Squash-merged as `13b3ff6`.
**Process notes:** The oldest open PR (opened by Antigravity 2026-07-16, stalled through the agent transition) is cleared; every Antigravity-era loose end is now resolved.
**Outstanding Work:** Sprint 2 remainder: AUTH-01..09/14, SHELL-02 (L — split at claim)/03/10, CI-04/05/07.
**Known Bugs:** None.
**Risks:** None new.
**Suggested Next Task:** AUTH-01, or SHELL-02 with a recorded split.
**Estimated Context Needed:** This entry, the Sprint 2 queue table.

## 2026-07-18 — Antigravity (Frontend) — SHELL-07: implement TanStack Query provider and configure default options

**Session Date:** 2026-07-18
**Agent:** Antigravity, frontend implementation role
**Objective:** Implement SHELL-07 (TanStack Query provider + defaults); rebase onto current main after SHELL-01 merged.
**Files Modified:** `src/app/layout.tsx` (nest `QueryProvider` inside `ThemeProvider`), `package.json`, `package-lock.json`, `.ai/TASK_QUEUE.md`, `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** `src/shared/lib/query-provider.tsx`, `src/shared/lib/query-provider.test.tsx`.
**Architecture Decisions:** Added `@tanstack/react-query` and `@tanstack/react-query-devtools` as dependencies. Configured defaults (1-minute `staleTime`, disabled `refetchOnWindowFocus`, and `1` retry). Devtools gated via `isProductionEnvironment` (satisfies `no-raw-process-env` rule). Provider nesting: `ThemeProvider` (outer) → `QueryProvider` (inner) — theme must be outermost since it controls the `.dark` class on `<html>`.
**Outstanding Work:** Review and merge SHELL-07.
**Known Bugs:** None.
**Risks:** None.
**Suggested Next Task:** Implement SHELL-02 (Three-zone app shell).
**Estimated Context Needed:** `docs/10_DESIGN.md`, `src/app/layout.tsx`, `src/shared/lib/query-provider.tsx`.

---

## 2026-07-18 — Claude (Implementer, user-authorized) — OBS-02: request logging wired

**Session Date:** 2026-07-18
**Agent:** Claude, implementation role (continuing user-authorized coverage while agents are out of credits)
**Objective:** OBS-02 — wire the OBS-01 logger across request boundaries.
**Files Added:** `src/shared/lib/request-logging.ts` (+ colocated test).
**Files Modified:** `src/app/api/theme/route.ts` and `src/app/api/internal/retention-purge/route.ts` (both wrapped; purge route's own logger replaced by the wrapper-provided one), `.ai/TASK_QUEUE.md`, `docs/AI_HANDOFF.md` (this entry).
**Architecture Decisions:** None new. Two implementation choices reported: (1) route identity is encoded in the *event name* (`request.<route>.completed|failed`) because the OBS-01 logger structurally rejects string metadata — route names are validated against the same stable-identifier pattern; (2) the wrapper takes an optional `resolveUserId` whose failure degrades to `userId: null` rather than failing the request — AUTH-04 plugs session resolution into this slot; MCP-01/EMB-02 wire their boundaries with the same wrapper when those endpoints exist (all three documented boundaries covered by one mechanism, two of three not yet built).
**Verification performed:** typecheck / lint / format / 31 unit tests / production build green. Wrapper tests cover: stable-name rejection, completion log with status + numeric duration, exception → 500 + failure event, resolver-provided user id tagging both domain and request events, resolver failure → null. Purge-route tests unchanged and green.
**Outstanding Work:** Review + merge (self-implemented; live verification stands in for reviewer independence). AUTH-04 adds the session resolver; MCP-01/EMB-02 adopt the wrapper.
**Known Bugs:** None.
**Risks:** None new.
**Suggested Next Task:** AUTH-01, or PR #14 / SHELL work.
**Estimated Context Needed:** This entry, `src/shared/lib/request-logging.ts`.

## 2026-07-18 — Claude — DB-15 migration applied to Cloud via Supabase MCP; database phase complete

**Session Date:** 2026-07-18
**Agent:** Claude (user set up the project-scoped Supabase MCP server + OAuth, closing the credentials gap)
**Objective:** Apply the reviewed `20260718030000_schedule_retention_purge` migration to the shared Cloud project — the one step DB-15's PR could not perform.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-15 → Done), `docs/PROJECT_STATE.md` (pending-application note cleared), `docs/AI_HANDOFF.md` (this entry).
**Architecture Decisions:** None. Applied via `execute_sql` in one transaction with an explicit `supabase_migrations.schema_migrations` insert of version `20260718030000` so repo↔Cloud history stays byte-identical (MCP `apply_migration` would have minted a different version).
**Verification performed:** History 17/17 matches the repo exactly; `cron.job` shows `retention-purge-daily` active at `0 3 * * *`; `invoke_retention_purge_worker()` manually invoked — Vault-empty no-op path confirmed live; **security advisors: zero findings** (the SECURITY DEFINER invoker passes because EXECUTE is revoked from public/anon/authenticated — Cursor's original hardening).
**Milestone:** **Database phase complete — DB-01..DB-16 all Done.** 13 tables + RLS + tests + audit + purge, all live and verified.
**Outstanding Work:** Sprint 2 remainder: PR #14, AUTH-01..09/14, SHELL-02/03/10, CI-04/05/07, OBS-02. CI-07 wires the purge worker's Vault values.
**Known Bugs:** None.
**Risks:** None new.
**Suggested Next Task:** AUTH-01 (now feasible solo — the Supabase MCP may cover auth config) or CI-05/OBS-02.
**Estimated Context Needed:** This entry, DB-15 queue row.

## 2026-07-18 — Claude (Implementer, user-authorized) — DB-15 completed from Cursor's in-flight start

**Session Date:** 2026-07-18
**Agent:** Claude — implementation role for this task by explicit user authorization (all implementation agents out of credits). Reviewer independence is therefore suspended for DB-15; compensated with live verification beyond the usual bar.
**Objective:** Complete DB-15 (ADR-18 retention purge). On claiming, discovered **uncommitted in-flight work by Cursor** in the tree (claimed in queue as Cursor, never pushed): migration with Vault-guarded SECURITY DEFINER invoker + cron schedule, repository/service split, webhook-auth helper, route handler, env plumbing, service unit tests. Reviewed it as inherited code and completed it — preserved, not rewritten.
**Files Modified (on top of Cursor's):** `src/shared/lib/webhook-auth.ts` (constant-time comparison via hashed `timingSafeEqual` — was `===`), `src/app/api/internal/retention-purge/route.ts` (OBS-01 logging, try/catch → 500, `{ data }` envelope), `src/features/retention/retention-purge-repository.ts` (**bug fix, test-caught:** PostgREST returns the 1:1 `attachments` embed as an object, not an array — Cursor's `attachments?.[0]` always yielded null, so binaries were never deleted while envelopes were, the exact orphan scenario ADR-18 forbids; also removed dead logic), `src/features/retention/retention-purge-service.test.ts` (mock typing fix), `vitest.integration.config.ts` (`@/` alias so integration tests can import src), `tests/integration/supabase-test-harness.ts` (`createServiceRoleTestClient` — reuses hostname pin + fail-closed checks, ADR-12).
**Files Added:** `src/app/api/internal/retention-purge/route.test.ts` (401/200-envelope/500 coverage), `tests/integration/retention-purge.integration.test.ts` (live end-to-end purge).
**Architecture Decisions:** None beyond ADR-18. Internal job endpoints return the 05_API `{ data }` envelope (consistency choice, reported here).
**Verification performed:** typecheck/lint/format/26 unit tests/production build green. **Live Cloud purge test green (suite 12 files, 27/27):** expired note + attachment purged with binary confirmed deleted (service-role download fails), fresh soft-deleted note spared, expired folder purged with child falling to root (ADR-15), and **idempotent rerun returns all-zero counts**. The two orphaned binaries created by the pre-fix failed runs were swept from the dev bucket (verified empty).
**Outstanding Work:** **The migration `20260718030000_schedule_retention_purge.sql` is NOT applied to Cloud** — I have no Supabase credentials (Cursor/Codex used their own). Apply with `npx supabase link --project-ref zkzyfwclvquiargnwgtw && npx supabase db push`. Safe order-independent: the scheduled job no-ops until CI-07 stores `retention_purge_url`/`retention_purge_secret` in Vault. Until applied, repo↔Cloud history diverges by this one file (tracked in PROJECT_STATE).
**Known Bugs:** None known after fixes.
**Risks:** Self-review on this task (user-accepted). The embed-shape bug class may exist in future embedded queries — worth a note in the eventual repository-layer review checklist.
**Suggested Next Task:** Sprint remainder: PR #14 completion, AUTH-01, CI-04/05/07, OBS-02, SHELL-02/03/10.
**Estimated Context Needed:** ADR-18, this entry, `src/features/retention/`.

## 2026-07-18 — Claude (Architect) — ADR-18: retention purge design decided, DB-15 unblocked

**Session Date:** 2026-07-18
**Agent:** Claude, architect/TPM role
**Objective:** Arbitrate the DB-15 escalation: §6's purge was unimplementable as written (SQL cannot delete Storage binaries; folders purge unmentioned).
**Files Modified:** `docs/DECISIONS.md` (**ADR-18**), `docs/04_DATABASE.md` (§6 hard-delete row rewritten: worker, Storage-API-first, folders included), `docs/09_SECURITY.md` (§5 purge-context row updated), `docs/12_TASKS.md` (DB-15 scope row), `.ai/TASK_QUEUE.md` (DB-15 AC), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** **ADR-18** — purge = pg_cron schedule → pg_net shared-secret HTTP call → service-role Vercel worker: Storage binaries deleted via Storage API *before* envelope rows; expired folders purged in the same run (ADR-15 SET NULL protects survivors); idempotent and partial-failure-safe; Vault-configured URL/secret so the schedule no-ops harmlessly until CI-07 wires real values. Codex's recommendation accepted essentially as proposed — the design reuses two already-documented patterns (webhook shared-secret auth; the §5 service-role purge context) and adds no new infrastructure category (pg_net already underlies Supabase webhooks, ADR-2).
**Process notes:** Correct escalation: no branch, no migration, no Cloud change before the decision. §6's original "cascades: … storage objects" wording was a spec-phase hand-wave that FK mechanics can never satisfy — exactly the class of gap escalations exist to catch.
**Outstanding Work:** DB-15 claimable now (last database-phase task). PR #14 rebase. AUTH-01, CI-04 unclaimed.
**Known Bugs:** None.
**Risks:** Deployed end-to-end purge (real Vault values + Vercel env) completes at CI-07 — tracked on both task rows.
**Suggested Next Task:** Codex: DB-15 per ADR-18.
**Estimated Context Needed:** ADR-18, [04_DATABASE §6](04_DATABASE.md#6-soft-deletes), the embedding-webhook auth pattern ([09_SECURITY §3](09_SECURITY.md#3-authentication) T6).

## 2026-07-18 — Claude (Reviewer) — DB-14 review & merge

**Session Date:** 2026-07-18
**Agent:** Claude, reviewer role (TPM/governance)
**Objective:** Review PR #37 (DB-14: cross-user coverage verification), merge if sound.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-14 → Done, Completed entry), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** None. DB-14-as-coverage-audit accepted: GOV-6 made per-table denial tests ship with each migration, so the batch-suite task reduces to verification — the same logic GOV-6 itself applied to DB-13.
**Verification performed:** Independently re-mapped all 13 public tables to denial assertions across the 11 suite files — mapping confirmed (read + write denial per each table's privilege contract, including profiles' Auth-lifecycle-only writes and audit_log's append-only shape). Zero executable files changed in the PR; suite state identical to the 26/26 DB-13-review run, so no redundant Cloud run was performed (rate-limit prudence). Squash-merged as `2b88641`.
**Outstanding Work:** DB-15 (pg_cron purge job) closes the database phase. PR #14 rebase. AUTH-01, CI-04 unclaimed.
**Known Bugs:** None.
**Risks:** None new.
**Suggested Next Task:** Codex: DB-15 — note §6's cascade expectations are already proven live by the per-table tests; the new surface is the pg_cron schedule itself and the storage-object cleanup for purged attachments.
**Estimated Context Needed:** This entry, [04_DATABASE §6](04_DATABASE.md#6-soft-deletes), DB-15 queue row.

## 2026-07-18 — Codex (Database) — DB-14 cross-user suite verified

**Session Date:** 2026-07-18
**Agent:** Codex, database implementation role
**Objective:** Complete DB-14 by proving that every public table has an explicit cross-user RLS denial test.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-14 → In Review), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** None. GOV-6 already required each table's denial coverage in its own migration PR. DB-14 therefore verifies and consolidates that coverage instead of adding a second, duplicate Cloud suite.
**Coverage verified:** `profiles` → `profiles-rls`; `knowledge_objects` → `knowledge-objects-rls`; `notes` → `notes-rls`; `attachments` → `attachments-rls`; `folders` → `folders-rls`; `tags` and `knowledge_object_tags` → `tags-rls`; `links` → `links-rls`; `embeddings` → `embeddings-rls`; `chat_conversations` and `chat_messages` → `chat-rls`; `mcp_credentials` → `mcp-credentials-rls`; `audit_log` → `audit-log-rls`. Every mapping includes user-B read denial and write denial appropriate to the table's privilege contract; CRUD tables cover insert/update/delete, profiles covers cross-user update plus Auth-lifecycle-only insert/delete, and audit_log covers insert plus its append-only update/delete denial.
**Migrations created:** None.
**Policies created:** None.
**Indexes created:** None.
**Verification performed:** Read all 11 RLS integration files and mapped their assertions to all 13 public tables. The full Cloud integration suite passed 11 files / 26 tests under a Node runtime satisfying the repository's `>=22.12.0` engine requirement. Post-run Cloud SQL confirmed zero `integration-%@example.invalid` Auth users and zero rows in every public application table. Local format check, strict typecheck, lint, 18 unit tests, and production build all passed.
**Outstanding Work:** Independent reviewer must verify DB-14. DB-15 was not started.
**Known Bugs:** None.
**Risks:** The pre-existing residual first-request clock-skew flake remains tracked in PROJECT_STATE; it did not recur in this run.
**Suggested Next Task:** Review DB-14. After both implementation and reviewer-outcome PRs merge, DB-15 is the next database task.
**Estimated Context Needed:** This entry, the 11 `tests/integration/*-rls.integration.test.ts` files, GOV-6, and `docs/09_SECURITY.md §9` T1.

## 2026-07-18 — Claude (Reviewer + Architect) — DB-13 review & merge; ADR-17 dispositions

**Session Date:** 2026-07-18
**Agent:** Claude, reviewer role (review) + architect role (hardening dispositions)
**Objective:** Review PR #35 (DB-13: RLS audit + profiles privilege fix), merge if sound, and disposition the audit's two escalated hardening candidates.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-13 → Done, Completed entry), `docs/DECISIONS.md` (**ADR-17**), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** **ADR-17** — both audit-escalated hardening candidates declined for MVP with recorded revisit triggers: composite same-owner FKs (schema churn across ~10 FKs to close a UUID-guessing non-threat; revisit when sharing features make foreign IDs knowable) and blanket owner/FK indexes (all documented-query indexes exist; add on measured need per 01_PRODUCT §6.1, revisit on advisor WARN). Recording the *decline* is the point — the questions can no longer resurface as per-table escalations.
**Verification performed:** Audit methodology reviewed (live-catalog vs. §4/§7 comparison; 13 tables, 48 policies, indexes, FK actions, storage policies, advisors). The one finding is genuine: `profiles` kept DB-02-era broad grants (predating the DB-03 least-privilege pattern) — RLS already blocked writes, so defense-in-depth, honestly framed; the 2-line corrective migration restores SELECT/UPDATE-only, with a regression test (owner INSERT/DELETE → `42501`; Auth-lifecycle signup/erasure unaffected — table-owner operations). **Suite run live: 26/26 on rerun.** One residual transient noted: the DB-08 retry covers auth calls, but the first post-sign-in data request can still hit clock skew — logged in Known Technical Debt with a concrete extension path if it recurs. Squash-merged as `70e894a`.
**Process notes:** Exactly the right audit posture: found-and-fixed the contract violation in scope, escalated the two judgment calls instead of deciding them. The three accumulated review notes (DB-05, DB-08, §7 shape) are all now closed.
**Outstanding Work:** DB-14 (cross-user suite — largely satisfied by GOV-6's per-PR tests; scope check first) and DB-15 (pg_cron purge) close the database phase. PR #14 rebase. AUTH-01, CI-04 unclaimed.
**Known Bugs:** None.
**Risks:** None new.
**Suggested Next Task:** Codex: DB-14 — start by auditing existing GOV-6 coverage vs. the one-denial-test-per-table requirement; it may be a small gap-fill rather than a new suite.
**Estimated Context Needed:** This entry, ADR-17, DB-13 Completed entry, [09_SECURITY §9](09_SECURITY.md#9-threat-model) T1 for DB-14 scope.

## 2026-07-18 — Codex (Database) — DB-13 RLS audit complete

**Session Date:** 2026-07-18
**Agent:** Codex, database implementation role
**Objective:** Audit RLS, table privileges, documented indexes, and ownership integrity across all 13 public tables.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-13 → In Review), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry), `tests/integration/profiles-rls.integration.test.ts` (Auth-lifecycle privilege regression test).
**Files Added:** `supabase/migrations/20260717204329_restrict_profiles_privileges.sql`.
**Architecture Decisions:** None. The audit did not invent same-owner composite foreign keys or blanket owner/FK indexes because neither is part of the documented schema contract. They remain explicit reviewer/architect hardening decisions.
**Migration applied:** `20260717204329_restrict_profiles_privileges`. It removes legacy broad grants from `public.profiles` and restores the documented contract: no `anon` privileges and only `SELECT`/`UPDATE` for `authenticated` and `service_role`. Signup remains owned by the existing hardened Auth trigger; account deletion remains owned by the `auth.users` cascade.
**Policies created:** None. All 48 existing policies match §7: authenticated-only permissive policies, initplan-cached `auth.uid()` ownership predicates, and both `USING`/`WITH CHECK` on every update policy. `profiles` has SELECT/UPDATE only, `audit_log` has SELECT/INSERT only, and the other 11 tables have uniform CRUD policies.
**Indexes created:** None. Every index explicitly documented in §4 exists. Performance advisors report INFO-only unindexed foreign keys and expected unused pre-feature indexes; no undocumented index was added without a measured query requirement.
**Verification performed:** Compared the live Cloud catalog with `docs/04_DATABASE.md`: exactly 13 public tables, 48 policies, exact columns/defaults/nullability/checks, documented FK delete actions, constraints, indexes, storage bucket/policies, and hardened profile trigger. The correction migration passed a rollback-only Cloud assertion before application. The focused profile suite passed 2/2, including owner INSERT/DELETE rejection with `42501`; the full Cloud integration suite passed 11 files / 26 tests. Security advisors are clean. Cleanup confirmed zero test users and zero application rows. Local format check, strict typecheck, lint, 18 unit tests, and production build all passed.
**Outstanding Work:** Independent reviewer must verify DB-13 and decide whether same-owner composite FKs and broader FK/owner indexing should become separately documented follow-up tasks. DB-14 and DB-15 were not started.
**Known Bugs:** None.
**Risks:** The current schema prevents cross-user access through RLS but does not enforce same-owner equality between every pair of related rows at FK level. Several FK columns also have no dedicated leading index. Both are documented here for architecture review rather than silently changing the schema.
**Suggested Next Task:** Review DB-13. After the implementation and reviewer-outcome PRs merge, DB-14 is next in queue order.
**Estimated Context Needed:** This entry, DB-13 diff, `docs/04_DATABASE.md §4, §7–8, §11`, GOV-6, and the live advisor output summarized above.

## 2026-07-18 — Claude (Reviewer) — DB-12 review & merge; 13-table schema complete

**Session Date:** 2026-07-18
**Agent:** Claude, reviewer role (TPM/governance)
**Objective:** Review PR #33 (DB-12: `audit_log`), merge if sound.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-12 → Done, Completed entry), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** None. Both special properties implemented per prior decisions: ADR-16's SET NULL exception and §4.13's append-only intent (enforced via grants — only SELECT/INSERT; no update/delete policies; FK-cascade erasure unaffected since cascades run with table-owner privileges).
**Verification performed:** SQL line-checked against §4.13 — exact. Tests prove the two load-bearing properties live: owner update/delete → `42501` (append-only), and object purge → audit row retained with nulled `knowledge_object_id` (ADR-16). Cross-user denial + actor CHECK covered. **Full Cloud suite: 11 files, 25/25 green.** Squash-merged as `5d02462`.
**Milestone:** **All 13 schema tables are live on the shared Cloud project** — DB-02..DB-12 complete, every table with same-PR RLS + cross-user tests (GOV-6), all FK delete actions per ADR-14/15/16.
**Outstanding Work:** DB-13 audit (three accumulated notes: composite same-owner FKs, owner-leading indexes, policy-shape verification), then DB-14/15. PR #14 rebase. AUTH-01, CI-04 unclaimed.
**Known Bugs:** None.
**Risks:** None new.
**Suggested Next Task:** Codex: DB-13 — the audit closes the schema phase; its three notes are in the DB-05/DB-08 Completed entries and [04_DATABASE §7](04_DATABASE.md#7-row-level-security-rls-policies).
**Estimated Context Needed:** This entry, DB-13 queue row, the three audit notes, §7.

## 2026-07-18 — Codex (Database) — DB-12 implementation complete

**Session Date:** 2026-07-18
**Agent:** Codex, database implementation role
**Objective:** Implement DB-12 only: the append-only `audit_log` table.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-12 → In Review), `docs/PROJECT_STATE.md` (implementation state and stale DB-11 In Progress entry removed), `docs/AI_HANDOFF.md` (this entry).
**Files Added:** `supabase/migrations/20260717195523_create_audit_log.sql`, `tests/integration/audit-log-rls.integration.test.ts`.
**Architecture Decisions:** None. Implemented `docs/04_DATABASE.md §4.13, §7–8`, ADR-14, ADR-16, and GOV-6 exactly. The table is append-only through both privileges and RLS: authenticated and service-role callers receive only `SELECT`/`INSERT`; no `UPDATE`/`DELETE` policy exists. The owner FK cascades for account erasure, while `knowledge_object_id` uses ADR-16 `ON DELETE SET NULL` so object purge preserves history.
**Migration applied:** `20260717195523_create_audit_log`; the repository filename exactly matches Cloud migration history.
**Policies created:** `audit_log_select_own` and `audit_log_insert_own`. Both target `authenticated` and use initplan-cached `(select auth.uid()) = owner_id`; there are deliberately no update or delete policies.
**Indexes created:** `audit_log_pkey` and the documented `audit_log_owner_id_created_at_idx` on `(owner_id, created_at)`.
**Verification performed:** The exact migration first passed inside a rollback-only Cloud transaction with assertions for all seven columns, RLS, exactly two policies, absence of update/delete policies, both FK delete actions, and the documented retrieval index. Live catalog inspection confirmed exact types/nullability/defaults, the actor CHECK, ADR-14 owner cascade, ADR-16 object `SET NULL`, both indexes, SELECT/INSERT-only grants for `authenticated`/`service_role`, no `anon` grants, and the two intended policies. Focused Cloud tests passed 3/3: valid metadata round-trip, invalid actor rejection (`23514`), owner append-only enforcement, cross-user read/insert/update/delete denial, and live object-purge history retention. The full Cloud suite passed 11 files / 25 tests. Cleanup SQL confirmed zero ephemeral Auth users, profiles, audit rows, or orphaned audit rows. Security advisors returned no findings. Local format check, strict typecheck, lint, 18 unit tests, and production build all passed.
**Outstanding Work:** Independent reviewer must verify DB-12 before merge. DB-13 was not started.
**Known Bugs:** None.
**Risks:** Performance advisors report INFO-only notices for the new, unused documented retrieval index and the unindexed `knowledge_object_id` FK. DB-13 owns the accumulated cross-table FK/index audit, so no undocumented index was added here.
**Suggested Next Task:** Review DB-12. After merge, DB-13 becomes dependency-ready for the full RLS/index audit.
**Estimated Context Needed:** DB-12 diff; `docs/04_DATABASE.md §4.13, §7–8, §11`; ADR-14; ADR-16; GOV-6.

## 2026-07-17 — Claude (Reviewer) — DB-11 review & merge

**Session Date:** 2026-07-17
**Agent:** Claude, reviewer role (TPM/governance)
**Objective:** Review PR #31 (DB-11: `mcp_credentials`), merge if sound.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-11 → Done, Completed entry), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** None. Hash-only storage per §4.12/09_SECURITY; no undocumented lookup index (CRED tasks own that call).
**Verification performed:** SQL line-checked against §4.12 — exact. **Full Cloud suite run live: 10 files, 22/22 green.** Squash-merged as `d4c8d1b`.
**Outstanding Work:** DB-12 (`audit_log` — ADR-16 SET NULL exception on its queue row), then DB-13 (three accumulated audit notes). PR #14 rebase. AUTH-01, CI-04 unclaimed.
**Known Bugs:** None.
**Risks:** None new.
**Suggested Next Task:** Codex: DB-12 — read the ADR-16 exception before writing SQL.
**Estimated Context Needed:** This entry, [04_DATABASE §4.13](04_DATABASE.md#413-audit_log), ADR-16 in DECISIONS.md.

## 2026-07-17 — Codex (Database) — DB-11 implementation complete

**Session Date:** 2026-07-17
**Agent:** Codex, database implementation role
**Objective:** Implement DB-11 only: the `mcp_credentials` table.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-11 → In Review), `docs/PROJECT_STATE.md` (implementation state), `docs/AI_HANDOFF.md` (this entry).
**Files Added:** `supabase/migrations/20260717164814_create_mcp_credentials.sql`, `tests/integration/mcp-credentials-rls.integration.test.ts`.
**Architecture Decisions:** None. Implemented `docs/04_DATABASE.md §4.12`, ADR-14, and GOV-6 exactly. No raw credential is stored; `token_hash` is the only credential material in the schema. No undocumented token-hash uniqueness constraint or secondary index was invented.
**Migration applied:** `20260717164814_create_mcp_credentials`; the repository filename exactly matches Cloud migration history.
**Policies created:** `mcp_credentials_select_own`, `mcp_credentials_insert_own`, `mcp_credentials_update_own`, and `mcp_credentials_delete_own`. All target `authenticated`; update has both `USING` and `WITH CHECK`; every predicate compares initplan-cached `(select auth.uid())` with `owner_id`.
**Indexes created:** `mcp_credentials_pkey` only, backing the documented primary key. §4.12 specifies no secondary index.
**Verification performed:** The exact migration first passed inside a rollback-only Cloud transaction with assertions for the seven documented columns, RLS, four policies, and the ADR-14 owner cascade. Live catalog inspection confirmed exact types/nullability/defaults, the cascading profile FK, RLS, policy shapes, primary-key index, CRUD-only grants for `authenticated`/`service_role`, and no `anon` grants. Focused Cloud tests passed 2/2: owner creation, hash/metadata round-trip, `last_used_at` and immediate-revocation state updates, plus cross-user read/update/delete/insert denial. The full Cloud suite passed 10 files / 22 tests. Cleanup SQL confirmed zero ephemeral Auth users, profiles, credentials, or orphaned credential rows. Security advisors returned no findings. Local format check, strict typecheck, lint, 18 unit tests, and production build all passed.
**Outstanding Work:** Independent reviewer must verify DB-11 before merge. DB-12 was not started.
**Known Bugs:** None.
**Risks:** The performance advisor reports the expected INFO-only unindexed `mcp_credentials.owner_id` FK, alongside the existing cross-table owner-FK pattern. The documented §4.12 index set is empty; DB-13 owns the uniform owner-leading/FK-index review, so no undocumented index was added here. The absence of a documented `token_hash` lookup index should also be assessed consistently at DB-13 before MCP-02 depends on it.
**Suggested Next Task:** Review DB-11. After merge, the database role may claim DB-12, preserving its ADR-16 `audit_log.knowledge_object_id ON DELETE SET NULL` exception.
**Estimated Context Needed:** DB-11 diff; `docs/04_DATABASE.md §4.12, §7, §11`; `docs/06_MCP.md §4`; `docs/09_SECURITY.md §3–5`; ADR-14; GOV-6.

## 2026-07-17 — Claude (Reviewer) — DB-10 review & merge

**Session Date:** 2026-07-17
**Agent:** Claude, reviewer role (TPM/governance)
**Objective:** Review PR #29 (DB-10: chat tables), merge if sound.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-10 → Done, Completed entry), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** None. Scope↔note_id consistency stays service-layer per §4.10 — correctly not turned into a DB CHECK.
**Verification performed:** SQL line-checked against §4.10–4.11: scope/role CHECKs, nullable `note_id` with ADR-14 cascade, ADR-16 `conversation_id` cascade, `citations` jsonb, `(conversation_id, created_at)` index, uniform RLS + least-privilege on both tables. Tests: `23514` CHECK rejections, cross-user denial on both tables, and both cascade chains verified live — including the two-level note-object → conversation → messages chain. **Reviewer ran the full Cloud suite: 9 files, 20/20 green.** Squash-merged as `bbb5042`.
**Outstanding Work:** DB-11 (`mcp_credentials`) and DB-12 (`audit_log` — **remember the ADR-16 SET NULL exception**), then DB-13 with its three accumulated audit notes. PR #14 rebase. AUTH-01, CI-04 unclaimed.
**Known Bugs:** None.
**Risks:** None new.
**Suggested Next Task:** Codex: DB-11 or DB-12 (both dependency-ready; DB-12 carries the do-not-cascade warning on its queue row).
**Estimated Context Needed:** This entry, DB-10 Completed entry, [04_DATABASE §4.12–4.13](04_DATABASE.md#412-mcp_credentials), ADR-16.

## 2026-07-17 — Codex (Database) — DB-10 implementation complete

**Session Date:** 2026-07-17
**Agent:** Codex, database implementation role
**Objective:** Implement DB-10 only: the `chat_conversations` and `chat_messages` tables.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-10 → In Review), `docs/PROJECT_STATE.md` (implementation state and stale DB-09 In Progress entry removed), `docs/AI_HANDOFF.md` (this entry).
**Files Added:** `supabase/migrations/20260717160750_create_chat_tables.sql`, `tests/integration/chat-rls.integration.test.ts`.
**Architecture Decisions:** None. Implemented `docs/04_DATABASE.md §4.10–4.11`, ADR-14, ADR-16, and GOV-6 exactly. The note/vault `note_id` shape remains service-layer-enforced as specified; SQL adds only the documented `scope` and `role` checks.
**Migration applied:** `20260717160750_create_chat_tables`; the repository filename exactly matches Cloud migration history.
**Policies created:** `chat_conversations_select_own`, `chat_conversations_insert_own`, `chat_conversations_update_own`, `chat_conversations_delete_own`, `chat_messages_select_own`, `chat_messages_insert_own`, `chat_messages_update_own`, `chat_messages_delete_own`. All target `authenticated`; updates have both `USING` and `WITH CHECK`; predicates use initplan-cached `(select auth.uid()) = owner_id`.
**Indexes created:** `chat_conversations_pkey`, `chat_messages_pkey`, and documented ordered-retrieval index `chat_messages_conversation_id_created_at_idx` on `(conversation_id, created_at)`.
**Verification performed:** The exact migration first passed inside a rollback-only Cloud transaction with table, policy, and index assertions. Live catalog inspection then confirmed all 13 documented columns across both tables, `scope` and `role` checks, ADR-14 cascades for both owner FKs and `note_id`, ADR-16 cascade for `conversation_id`, RLS enabled, eight policies, the retrieval index, and CRUD-only grants for `authenticated`/`service_role` with none for `anon`. Focused Cloud tests passed 3/3: constraint rejection, citation JSON round-trip, cross-user read/update/delete/insert denial on both tables, conversation-delete cascade, and note-object-delete cascade through conversation to messages. The full Cloud suite passed 9 files / 20 tests; cleanup SQL confirmed zero ephemeral Auth users, conversations, or messages. Security advisors returned no findings. Local format, strict typecheck, lint, 18 unit tests, and production build all passed.
**Outstanding Work:** Independent reviewer must verify the PR and Cloud-attested state before merge. DB-10 remains In Review; DB-11 was not started.
**Known Bugs:** None.
**Risks:** Performance advisors report INFO-only notices for the new, unused ordered-message index and unindexed `chat_conversations.note_id`, `chat_conversations.owner_id`, and `chat_messages.owner_id` FKs. The documented index set includes only `(conversation_id, created_at)`; DB-13 owns the uniform owner-leading/FK-index review and same-owner composite-FK hardening, so no undocumented index or constraint was invented here.
**Suggested Next Task:** Review DB-10. After merge, the database role may claim DB-11.
**Estimated Context Needed:** DB-10 diff; `docs/04_DATABASE.md §4.10–4.11, §7, §11`; ADR-14; ADR-16; GOV-6.

## 2026-07-17 — Claude (Reviewer) — DB-09 review & merge

**Session Date:** 2026-07-17
**Agent:** Claude, reviewer role (TPM/governance)
**Objective:** Review PR #27 (DB-09: `attachments` + private storage), merge if sound.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-09 → Done, Completed entry; CI-04 row gains a storage-helpers image note), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** None new. Operation-scoping the storage SELECT policy to sign/delete-lookup is accepted as *implementation* of 09_SECURITY §4's "access granted exclusively through signed URLs" — the spec sentence, enforced at the DB rather than by service-layer convention. Correctly scoped: no undocumented MIME allowlist, size limit, or update capability was invented (size stays service-layer per §4.4).
**Verification performed:** All three migrations read in full. Table exact to §4.4; bucket private; storage policies require owner-first path segment AND operation membership (sign/delete/delete_many) for reads. Test coverage includes the decisive assertion — **owner direct-download denial** — plus real upload → signed URL → download round-trip, cross-user denial on download/sign/upload/delete, own-session-foreign-path upload denial, and post-delete physical removal. **Reviewer ran the full Cloud suite live: 8 files, 17/17 green.** Squash-merged as `6182d17`.
**Process notes:** The three-migration sequence is disclosure done right: the sign-only middle state broke delete lookups and left two orphaned Storage objects; the implementer's own cleanup audit caught it, removed them via the Storage API, added the corrective migration and a regression assertion. Forward-only discipline held throughout (ADR-10).
**Outstanding Work:** DB-10..12, then DB-13 (audit notes accumulated: composite same-owner FKs, owner-leading indexes). CI-04 image must include operation-scoped storage helpers (noted on its row). PR #14 rebase. AUTH-01 unclaimed.
**Known Bugs:** None.
**Risks:** None new.
**Suggested Next Task:** Codex: DB-10 (chat tables — conversation_id cascade per ADR-16) or DB-11/12 (both DB-02-dependent only).
**Estimated Context Needed:** This entry, DB-09 Completed entry, [04_DATABASE §4.10–4.13](04_DATABASE.md#410-chat_conversations) + ADR-16 for the remaining tables.

## 2026-07-17 — Codex (Database) — DB-09 implementation complete

**Session Date:** 2026-07-17
**Agent:** Codex, database implementation role
**Objective:** Implement DB-09 only: the `attachments` subtype plus its private, owner-scoped Supabase Storage bucket.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-09 → In Review), `docs/PROJECT_STATE.md` (implementation state), `docs/AI_HANDOFF.md` (this entry).
**Files Added:** `supabase/migrations/20260717144012_create_attachments.sql`, `supabase/migrations/20260717144624_restrict_attachment_reads_to_signed_urls.sql`, `supabase/migrations/20260717145024_permit_attachment_delete_lookup.sql`, `tests/integration/attachments-rls.integration.test.ts`.
**Architecture Decisions:** None. Implemented `docs/04_DATABASE.md §4.4`, `docs/09_SECURITY.md §4`, ADR-14, and GOV-6. The owner id is the first Storage path segment, following Supabase's documented `storage.foldername(name)` ownership pattern. Storage permissions are least-privilege for the documented `AttachmentService` operations: `INSERT` for upload, operation-scoped `SELECT` only for signed-URL creation and delete lookup, and `DELETE` for removal; no direct authenticated download/list, undocumented update/upsert capability, bucket size limit, or MIME allowlist was added.
**Migrations applied:** `20260717144012_create_attachments` creates the subtype table and private `attachments` bucket; `20260717144624_restrict_attachment_reads_to_signed_urls` operation-scopes Storage reads; `20260717145024_permit_attachment_delete_lookup` is the forward-only correction that admits Storage's delete/delete-many lookup operations without reopening direct reads. All repository filenames exactly match Cloud migration history.
**Policies created:** Table policies `attachments_select_own`, `attachments_insert_own`, `attachments_update_own`, `attachments_delete_own`; Storage policies `attachments_storage_select_own`, `attachments_storage_insert_own`, `attachments_storage_delete_own`. All target `authenticated`, use initplan-cached `(select auth.uid())`, and Storage policies additionally require `bucket_id = 'attachments'` plus the first path segment equal to the authenticated user id. The Storage `SELECT` policy also requires `storage.allow_any_operation(...)` for only `storage.object.sign`, `storage.object.delete`, or `storage.object.delete_many`.
**Indexes created:** `attachments_pkey` only, backing the documented primary key on `knowledge_object_id`; no undocumented index was added.
**Verification performed:** All three exact migrations first passed inside rollback-only Cloud transactions with catalog assertions. After application, live catalog inspection confirmed all six documented columns, both ADR-14 cascade FKs, RLS enabled, CRUD-only table grants for `authenticated`/`service_role` with none for `anon`, the private bucket, and all seven policies in the intended shapes. Focused Cloud tests passed 3/3: owner metadata access, cross-user metadata denial, object-delete cascade, real Storage upload, owner signed URL and signed download, owner direct-download denial, cross-user download/sign/upload/delete denial, owner-prefix enforcement, and verified physical removal. A cleanup audit exposed two objects left by the intermediate sign-only policy; they were removed through the Storage API, the delete-lookup migration and regression assertion were added, and the final full Cloud suite passed 8 files / 17 tests with zero ephemeral Auth users, attachment rows, or Storage objects afterward. Security advisors returned no findings. Local format, strict typecheck, lint, 18 unit tests, and production build all passed.
**Outstanding Work:** Independent reviewer must verify the PR and Cloud-attested state before merge. DB-09 remains In Review; DB-10 was not started.
**Known Bugs:** None.
**Risks:** Performance advisors report an INFO-only unindexed `attachments.owner_id` FK, matching the existing cross-table pattern already routed to DB-13 for a uniform owner-leading-index decision. No undocumented index was invented.
**Suggested Next Task:** Review DB-09. After merge, the database role may claim DB-10.
**Estimated Context Needed:** DB-09 diff; `docs/04_DATABASE.md §4.4, §7, §11`; `docs/09_SECURITY.md §4`; ADR-14; GOV-6.

## 2026-07-17 — Claude (Reviewer) — DB-08 review & merge; harness debt closed

**Session Date:** 2026-07-17
**Agent:** Claude, reviewer role (TPM/governance)
**Objective:** Review PR #25 (DB-08: pgvector + `embeddings`, with the harness-hardening ride-along), merge if sound.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-08 → Done, Completed entry), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** None. `vector(1536)` matches 07_AI's small-embedding-tier; cosine HNSW matches 08_SEARCH §3.
**Verification performed:** Migration line-checked against §4.9 (all seven columns, chunk uniqueness, ADR-14 cascades, uniform RLS, least-privilege in-migration). Harness refactor source-verified: dev-project hostname pin and fail-closed behavior preserved; retry is bounded (1s/2s/4s) and scoped to 429/clock-skew only; service-role confined to global setup — workers get ephemeral tokens only (tighter ADR-12 posture). **Live: 4 consecutive full-suite passes (7 files, 14/14) including back-to-back repetition — the exact pattern that tripped Supabase Auth's rate limiter during the DB-07 review.** Both Known Technical Debt harness items are closed. Squash-merged as `1257a09`.
**Process notes:** Model ride-along: the debt item was picked up unprompted-in-scope, implemented beyond the ask (token-only workers), and the one deviation candidate (`owner_id` unindexed FK advisor notice) was flagged rather than silently "fixed" with an undocumented index — routed to DB-13 to assess owner-leading indexes uniformly.
**Outstanding Work:** DB-09..12 → DB-13 audit (which now has two accumulated review notes: composite same-owner FKs, owner-leading indexes). PR #14 rebase. AUTH-01, CI-04 unclaimed.
**Known Bugs:** None.
**Risks:** None new; suite-vs-limiter risk retired.
**Suggested Next Task:** Codex: DB-09 (attachments + storage bucket — the storage policy is the novel part). Or the PR #14 rebase for variety.
**Estimated Context Needed:** This entry, DB-08 Completed entry, [04_DATABASE §4.4](04_DATABASE.md#44-attachments) + [09_SECURITY §4](09_SECURITY.md#4-attachment-security) for DB-09.

## 2026-07-17 — Codex (Database) — DB-08 implementation complete

**Session Date:** 2026-07-17
**Agent:** Codex, database implementation role
**Objective:** Implement DB-08 (pgvector + `embeddings`) and the DB-07 review's priority harness-hardening ride-along.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-08 → In Review), `docs/PROJECT_STATE.md` (implementation state; resolved harness debt removed), `docs/AI_HANDOFF.md` (this entry), `vitest.integration.config.ts`, `tests/integration/supabase-test-harness.ts`, and the six existing RLS integration files (consume the shared user pair).
**Files Added:** `supabase/migrations/20260717061719_create_embeddings.sql`, `tests/integration/embeddings-rls.integration.test.ts`, `tests/integration/supabase-test-global-setup.ts`.
**Architecture Decisions:** None. Implemented `docs/04_DATABASE.md §4.9`, `docs/08_SEARCH.md §3`, ADR-14, and GOV-6 exactly. Harness provisioning remains within ADR-12's test-only, dev-project-only service-role context.
**Migration applied:** `20260717061719_create_embeddings`; repository filename exactly matches Cloud migration history. It enables pgvector in `extensions` and creates the table in one forward-only migration.
**Policies created:** `embeddings_select_own`, `embeddings_insert_own`, `embeddings_update_own`, `embeddings_delete_own`. All target `authenticated`; update has both `USING` and `WITH CHECK`; every predicate compares initplan-cached `(select auth.uid())` with `owner_id`.
**Indexes created:** `embeddings_pkey`; unique constraint index `embeddings_knowledge_object_id_chunk_index_key`; `embeddings_embedding_hnsw_idx` using the `extensions.vector_cosine_ops` operator class.
**Harness hardening:** Vitest global setup now provisions one isolated user pair for the entire run, passes only their ephemeral access tokens/ids to workers, and deletes both users after all files finish. Auth creation/sign-in retries only rate-limit (`429`/message) and `JWT issued at future` failures with bounded 1s/2s/4s backoff; other failures remain fail-closed. This reduces Auth sign-ins from 12 per full run today (26 at 13 table files) to exactly 2.
**Verification performed:** The exact migration first succeeded inside a rolled-back Cloud transaction. After applying, live catalog inspection confirmed pgvector 0.8.2 in `extensions`; all seven documented columns including `vector(1536)`; both ADR-14 cascades; unique object/chunk pairs; HNSW access method with cosine operator class; RLS enabled; four policies; and CRUD-only grants for `authenticated`/`service_role` with no `anon` grants. Focused DB-08 Cloud tests passed (2 tests): 1536-value vector insertion, duplicate rejection, owner access, cross-user read/update/delete/insert denial, and live object-delete cascade. The full suite passed (7 files, 14 tests) using one shared pair. Post-run SQL confirmed zero ephemeral Auth users, profiles, or embeddings remained. Security advisors returned no findings. Local format, strict typecheck, and lint passed before final validation.
**Outstanding Work:** Independent reviewer must verify the PR and Cloud-attested state before merge. DB-08 remains In Review; no subsequent task was started.
**Known Bugs:** None.
**Risks:** Performance advisors report INFO-only notices for the new unused HNSW index (expected before SEM-02 issues search queries) and unindexed `embeddings.owner_id` FK (the documented index set does not include an owner-leading index). DB-13 should assess owner-leading indexes consistently across all tables; no undocumented index was invented here.
**Suggested Next Task:** Review DB-08. After merge, the database role may claim DB-09.
**Estimated Context Needed:** DB-08 diff; `docs/04_DATABASE.md §4.9, §7, §11`; `docs/08_SEARCH.md §3`; ADR-12; ADR-14; GOV-6.

## 2026-07-17 — Claude (Reviewer) — DB-07 review & merge; harness rate-limit failure mode identified

**Session Date:** 2026-07-17
**Agent:** Claude, reviewer role (TPM/governance)
**Objective:** Review PR #23 (DB-07: `links`), merge if sound.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-07 → Done, Completed entry), `docs/PROJECT_STATE.md` (Known Technical Debt expanded), `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** None. Straightforward §4.8 implementation.
**Verification performed:** SQL line-checked: unique `(source, target)` pair, both direction indexes (target = backlinks path, FR-LINK-5/6), ADR-14 cascades on all three FKs, uniform RLS, least-privilege grants. Tests verify duplicate-edge rejection, cross-user denial, and live endpoint-deletion cascade. **Three consecutive 12/12 full Cloud-suite passes** on the merged HEAD. Squash-merged as `341eeb8`.
**Process notes — new failure mode found during review:** running the suite 7× in ~25 minutes tripped **Supabase Auth's rate limiter** — `createAuthenticatedUser` fails (`Unable to authenticate an isolated Cloud integration-test user`), suites fail closed, tests report as skipped, with progressive degradation (12 pass → 5 skip → all skip). Environmental, not a schema defect — but it will bite CI/local runs as the suite grows (2 users × 6 files/run today, 13 files eventually). Known Technical Debt updated: harness needs backoff/retry AND user-reuse across files (one shared pair via global setup), folding in the earlier clock-skew item. This is now a **priority ride-along** for the next DB PR.
**Outstanding Work:** DB-08..12 → DB-13. PR #14 rebase (Codex). AUTH-01, CI-04 unclaimed.
**Known Bugs:** None in merged code.
**Risks:** Until the harness hardening lands, avoid >2–3 full suite runs per hour against the shared dev project; the limiter recovers on its own.
**Suggested Next Task:** Codex: DB-08 (pgvector + embeddings) **with the harness hardening ride-along**.
**Estimated Context Needed:** This entry, DB-07 Completed entry, [04_DATABASE §4.9](04_DATABASE.md#49-embeddings) + [08_SEARCH §3](08_SEARCH.md#3-semantic-search-pgvector) for DB-08.

## 2026-07-17 — Codex (Database) — DB-07 implementation complete

**Session Date:** 2026-07-17
**Agent:** Codex, database implementation role
**Objective:** Implement DB-07 (`links`) only, after DB-06 was reviewed and merged.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-07 → In Review), `docs/PROJECT_STATE.md` (implementation state), `docs/AI_HANDOFF.md` (this entry).
**Files Added:** `supabase/migrations/20260717051646_create_links.sql`, `tests/integration/links-rls.integration.test.ts`.
**Architecture Decisions:** None. Implemented `docs/04_DATABASE.md §4.8`, ADR-14, and GOV-6 exactly; no same-owner FK hardening was invented because DB-13 owns that audit.
**Migration applied:** `20260717051646_create_links`; repository filename exactly matches Cloud migration history.
**Policies created:** `links_select_own`, `links_insert_own`, `links_update_own`, `links_delete_own`. All target `authenticated`; update has both `USING` and `WITH CHECK`; every predicate compares initplan-cached `(select auth.uid())` with `owner_id`.
**Indexes created:** `links_pkey`; unique constraint index `links_source_object_id_target_object_id_key`; explicit `links_source_object_id_idx`; explicit critical-backlink `links_target_object_id_idx`.
**Verification performed:** The exact migration SQL first succeeded inside a rolled-back Cloud transaction. After applying, live catalog inspection confirmed the documented five columns and defaults, all three ADR-14 `ON DELETE CASCADE` FKs, unique source-target pair, both direction indexes, RLS enabled, four policies, and CRUD-only grants for `authenticated`/`service_role` with no `anon` grants. Focused DB-07 Cloud tests passed (2 tests): duplicate-edge rejection, owner access, cross-user read/update/delete denial, cross-owner insert denial, and live cascades from both source and target endpoints. The full Cloud integration suite passed (6 files, 12 tests). Security advisors returned no findings. Local format, strict typecheck, lint, unit tests, and production build were run before publication.
**Outstanding Work:** Independent reviewer must verify the PR and Cloud-attested state before merge. DB-07 remains In Review; no subsequent DB task was started. The harness clock-skew retry remains separate technical debt.
**Known Bugs:** None.
**Risks:** The performance advisor reports an INFO-only unindexed-FK notice for `links.owner_id`; §4.8 explicitly requires the source and target direction indexes but does not specify an owner index, so no undocumented index was added. The prior unrelated INFO findings remain. DB-13 should evaluate owner-index and same-owner-FK hardening consistently across all tables.
**Suggested Next Task:** Review DB-07. After merge, the database role may claim DB-08.
**Estimated Context Needed:** DB-07 diff; `docs/04_DATABASE.md §4.8, §7, §11`; ADR-14; GOV-6.

## 2026-07-17 — Claude (Reviewer) — DB-06 review & merge; workflow simplified

**Session Date:** 2026-07-17
**Agent:** Claude, reviewer role (TPM/governance)
**Objective:** Review PR #21 (DB-06: `tags` + `knowledge_object_tags`), merge if sound; record the workflow change.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-06 → Done, Completed entry), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** None new — first migration to implement ADR-16 (`tag_id` cascade), verified live.
**Verification performed:** SQL line-checked against 04 §4.6–4.7: per-owner case-insensitive uniqueness as an expression index, composite PK + `(tag_id, owner_id)` secondary, ADR-14 cascades on `owner_id`/`knowledge_object_id`, ADR-16 cascade on `tag_id`, uniform RLS + least-privilege grants on both tables. Tests: duplicate name → `23505`, cross-user denial on both tables, cross-owner association → `42501`, and tag deletion observed removing join rows against Cloud. **Reviewer ran the full Cloud suite: 10/10 green, no clock-skew flake this run.** Squash-merged as `08d4095`.
**Process notes:** **Workflow simplified by user decision:** Antigravity and the separate review clone are scratched; implementation is Codex alone, alternating with Claude per task in the single shared checkout. Contract: every session ends parked on clean, pulled `main`. GOV-5 is trivially satisfied. The frontend track (SHELL-07 rebase of PR #14, then SHELL-02 split-at-claim) transfers to Codex. The harness clock-skew retry (Known Technical Debt) was not ridden along in this PR — still open.
**Outstanding Work:** DB-07..12 → DB-13 audit; PR #14 rebase (Codex); AUTH-01, CI-04 unclaimed.
**Known Bugs:** None.
**Risks:** None new.
**Suggested Next Task:** Codex: DB-07 (`links`) or the PR #14 rebase — either; the harness retry fits both as a ride-along.
**Estimated Context Needed:** This entry, DB-06 Completed entry, [04_DATABASE §4.8](04_DATABASE.md#48-links) for DB-07.

## 2026-07-17 — Codex (Database) — DB-06 implementation complete

**Session Date:** 2026-07-17
**Agent:** Codex, database implementation role
**Objective:** Implement DB-06 (`tags` + `knowledge_object_tags`) after ADR-16 resolved the final FK delete-action ambiguity.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-06 → In Review), `docs/PROJECT_STATE.md` (implementation state), `docs/AI_HANDOFF.md` (this entry).
**Files Added:** `supabase/migrations/20260716215254_create_tags.sql`, `tests/integration/tags-rls.integration.test.ts`.
**Architecture Decisions:** None. Implemented `docs/04_DATABASE.md §4.6–4.7`, ADR-14, ADR-16, and GOV-6 exactly.
**Migration applied:** `20260716215254_create_tags`; repository filename exactly matches Cloud migration history.
**Policies created:** `tags_select_own`, `tags_insert_own`, `tags_update_own`, `tags_delete_own`; `knowledge_object_tags_select_own`, `knowledge_object_tags_insert_own`, `knowledge_object_tags_update_own`, `knowledge_object_tags_delete_own`. All target `authenticated`; updates have both `USING` and `WITH CHECK`; every predicate compares initplan-cached `(select auth.uid())` with `owner_id`.
**Indexes created:** `tags_pkey`; unique expression index `tags_owner_id_lower_name_idx`; composite `knowledge_object_tags_pkey`; `knowledge_object_tags_tag_id_owner_id_idx`.
**Verification performed:** Migration SQL first executed inside a rolled-back Cloud transaction. After applying, live catalog inspection confirmed both documented four-column tables and defaults, case-insensitive per-owner tag uniqueness, the composite association PK, `owner_id → profiles.id ON DELETE CASCADE`, `knowledge_object_id → knowledge_objects.id ON DELETE CASCADE`, `tag_id → tags.id ON DELETE CASCADE` (ADR-16), RLS enabled on both tables, eight policies, the documented index set, and CRUD-only grants for `authenticated`/`service_role` with no `anon` grants. Focused DB-06 Cloud tests passed (2 tests); the full integration suite passed (5 files, 10 tests). Local format, typecheck, and lint passed before Cloud application; final build/static checks run before commit. Security advisors returned no findings.
**Outstanding Work:** Independent reviewer must verify the PR and Cloud-attested state before merge. DB-06 remains In Review; no subsequent DB task was started.
**Known Bugs:** None.
**Risks:** Performance advisor reports an INFO-only unindexed-FK notice for `knowledge_object_tags.owner_id`, because the exact documented secondary index is `(tag_id, owner_id)` rather than owner-leading. No undocumented index was invented; DB-13 owns the cross-table audit. The previously recorded INFO findings remain unrelated. As with earlier denormalized join/reference tables, DB-13 should assess same-owner composite-FK hardening; DB-06 implements the uniform documented RLS shape without expanding scope.
**Suggested Next Task:** Review DB-06. After merge, the database role may claim the next dependency-ready DB task.
**Estimated Context Needed:** DB-06 diff; `docs/04_DATABASE.md §4.6–4.7, §7, §11`; ADR-14; ADR-16; GOV-6.

---

## 2026-07-17 — Claude (Architect) — ADR-16: final FK delete-action matrix; DB-06 unblocked

**Session Date:** 2026-07-17
**Agent:** Claude, architect/TPM role
**Objective:** Arbitrate the DB-06 escalation (`knowledge_object_tags.tag_id` delete action unspecified) — and close the whole class of escalation by sweeping every remaining FK in §4.6–4.13.
**Files Modified:** `docs/04_DATABASE.md` (§4.7 `tag_id`, §4.11 `conversation_id`, §4.13 `knowledge_object_id` rows now explicit), `docs/DECISIONS.md` (ADR-16), `.ai/TASK_QUEUE.md` (DB-06 note + advance notes on DB-10/DB-12), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry). Note: Codex's blocker records were not yet pushed; this arbitration lands on main and Codex reconciles on resume.
**Files Added:** None.
**Architecture Decisions:** **ADR-16** — `tag_id → tags.id` CASCADE (Codex's recommendation accepted; SET NULL impossible anyway — composite PK); `chat_messages.conversation_id` CASCADE (pre-empting DB-10's escalation); `audit_log.knowledge_object_id` **SET NULL as an explicit exception to ADR-14** — the sweep's key find: mechanically applying ADR-14's envelope-cascade would erase an object's audit history at purge time, defeating §8's append-only intent. Delete-action matrix is now complete for all 13 tables; standing rule remains that new FK columns state their action at spec time.
**Outstanding Work:** None from this session. DB-06 claimable immediately; DB-07..12 all have fully specified FK actions now.
**Known Bugs:** None.
**Risks:** None new — see ADR-16 tradeoffs.
**Suggested Next Task:** Codex: resume DB-06 (+ the harness clock-skew retry ride-along from Known Technical Debt). Antigravity: rebase PR #14.
**Estimated Context Needed:** ADR-16 in DECISIONS.md, [04_DATABASE §4.7/§4.11/§4.13](04_DATABASE.md#47-knowledge_object_tags).

---

## 2026-07-17 — Claude (Reviewer) — DB-04 review & merge

**Session Date:** 2026-07-17
**Agent:** Claude, reviewer role (TPM/governance)
**Objective:** Review PR #17 (DB-04: `notes` subtype), merge if sound. Entire review conducted remotely + in disposable worktrees — the shared checkout's branch state was never touched (standing rule after two agent collisions).
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-04 → Done, Completed entry), `docs/PROJECT_STATE.md` (incl. new Known Technical Debt item), `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** None. Confirmed the unweighted `to_tsvector('english', title || ' ' || body)` generated column is exactly what [08_SEARCH §2](08_SEARCH.md#2-full-text-search) specifies — weighting deliberately absent; `ts_rank_cd` ranks at query time.
**Verification performed:** SQL line-checked against 04 §4.3: subtype PK FK cascade (ADR-14), `owner_id` cascade, `folder_id ON DELETE SET NULL` (ADR-15), `body` default `''`, generated stored tsvector + GIN, partial unique `(owner_id, daily_note_date)` index, uniform RLS, least-privilege grants in the same migration. Tests reviewed: cross-user denial, FTS match through the generated vector, daily-note duplicate → `23505`, folder-purge → `folder_id` null (ADR-15 live). **Cloud suite run live by the reviewer from an isolated worktree: 8/8 green on rerun.** Squash-merged as `c3594bf`.
**Process notes:** One first-run test failure was the known Cloud `JWT issued at future` clock-skew flake — **second occurrence** (first disclosed in DB-03's session). Promoted from "watch" to action: logged in Known Technical Debt — the harness should gain a small issued-at tolerance or a single retry (database role, small PR, can ride along with any DB-06..10 task).
**Outstanding Work:** Schema chain remaining: DB-06..10 (claimable now), then DB-11/12 → DB-13 audit. SHELL-07 (PR #14) awaits rebase. AUTH-01, CI-04 unclaimed.
**Known Bugs:** None in merged code; harness flake tracked as debt.
**Risks:** None new.
**Suggested Next Task:** Codex: DB-06 or DB-07 (+ the harness retry ride-along). Antigravity: rebase PR #14, then SHELL-02 (L — split at claim).
**Estimated Context Needed:** This entry, DB-04 Completed entry, [04_DATABASE §4.6–4.8](04_DATABASE.md#46-tags) for the next migrations.

---

## 2026-07-17 — Codex (Database) — DB-04 implementation complete

**Session Date:** 2026-07-17
**Agent:** Codex, database implementation role
**Objective:** Implement DB-04 (`notes`) after DB-05 was independently reviewed and merged.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-04 → In Review), `docs/PROJECT_STATE.md` (implementation state), `docs/AI_HANDOFF.md` (this entry).
**Files Added:** `supabase/migrations/20260716210425_create_notes.sql`, `tests/integration/notes-rls.integration.test.ts`.
**Architecture Decisions:** None. Implemented `docs/04_DATABASE.md §4.3`, `docs/08_SEARCH.md`, ADR-14, ADR-15, and GOV-6 exactly.
**Migration applied:** `20260716210425_create_notes`; repository filename exactly matches Cloud migration history.
**Policies created:** `notes_select_own`, `notes_insert_own`, `notes_update_own` (with `USING` and `WITH CHECK`), `notes_delete_own`; all target `authenticated` and compare initplan-cached `(select auth.uid())` with `owner_id`.
**Indexes created:** `notes_pkey`; `notes_owner_id_folder_id_idx`; `notes_search_vector_idx` (GIN); partial unique `notes_owner_id_daily_note_date_idx`.
**Verification performed:** Migration SQL first executed inside a rolled-back Cloud transaction. After applying, live catalog inspection confirmed all nine documented columns and defaults, the stored English `search_vector`, `knowledge_object_id → knowledge_objects.id ON DELETE CASCADE`, `owner_id → profiles.id ON DELETE CASCADE`, `folder_id → folders.id ON DELETE SET NULL`, RLS enabled, four policies, all documented indexes, and CRUD-only grants for `authenticated`/`service_role` with no `anon` grants. DB-04 Cloud tests passed independently (3 tests); the full integration suite passed (4 files, 8 tests). Local format, typecheck, and lint passed before Cloud application; final build/static checks run before commit. Security advisors returned no findings.
**Outstanding Work:** Independent reviewer must verify the PR and Cloud-attested state before merge. DB-04 remains In Review; no subsequent DB task was started.
**Known Bugs:** None.
**Risks:** Performance advisor reports INFO-only notices for the documented `(owner_id, folder_id)` index not covering `folder_id` alone and for the new GIN index not yet accumulating usage statistics. No undocumented index was invented; DB-13 owns the cross-table audit. Pre-existing folder-FK and knowledge-object unused-index notices remain unrelated.
**Suggested Next Task:** Review DB-04. After merge, the database role may claim the next dependency-ready DB task.
**Estimated Context Needed:** DB-04 diff; `docs/04_DATABASE.md §4.3, §7, §11`; `docs/08_SEARCH.md`; ADR-14; ADR-15; GOV-6.

---

## 2026-07-17 — Claude (Reviewer) — SHELL-01 review & merge (reviewer fixup applied)

**Session Date:** 2026-07-17
**Agent:** Claude, reviewer role (TPM/governance)
**Objective:** Re-review PR #13 after Antigravity addressed the first-round findings; merge if sound.
**Files Modified:** `.ai/TASK_QUEUE.md` (SHELL-01 → Done, Completed entry), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry). On the PR branch before merge: reviewer fixup `39639a0` to `docs/AI_HANDOFF.md`.
**Files Added:** None.
**Architecture Decisions:** None new. Toaster-inside-provider with `theme={theme}` accepted as the cleaner resolution of the first-round theming note.
**Verification performed:** Delta re-reviewed in full: both merges with `main` reconciled without dropping other agents' governance entries; all four required checks green (an interim Format failure was self-caught and fixed); `resolveTheme` extracted to `theme.ts` and used in both client paths; fonts land on exactly the `--font-inter`/`--font-jetbrains-mono` variables the token scaffold consumes. **Reviewer fixup before merge (from an isolated worktree):** removed two orphaned `>>>>>>>` conflict markers from AI_HANDOFF.md and corrected the entry's Files-Added line, which referenced `src/shared/ui/toast.tsx` files not present in the PR. Squash-merged as `f016273`.
**Process notes:** First Antigravity task through the full pipeline. Review feedback was absorbed well (both non-blocking items fixed properly). Two hygiene gaps for its next PRs: verify conflict-marker-free files after manual resolutions, and keep handoff file lists factual. **CI blind spot noted:** prettier's Format check does not flag conflict markers in markdown — a cheap standalone guard is worth adding to a future CI task.
**Outstanding Work:** PR #14 (SHELL-07) — substance already approved; needs rebase onto main now that #13 landed, plus the same PROJECT_STATE section fix. Database: DB-04 open. Backend: AUTH-01, CI-04 unclaimed.
**Known Bugs:** None.
**Risks:** None new.
**Suggested Next Task:** Antigravity: rebase PR #14. Codex: DB-04.
**Estimated Context Needed:** This entry, PR #14 review comments, SHELL-01 Completed entry.

---

## 2026-07-17 — Antigravity (Frontend) — SHELL-01: configure root layout with fonts, ThemeProvider, and sonner Toaster (Updated)

**Session Date:** 2026-07-17
**Agent:** Antigravity, frontend implementation role
**Objective:** Address changes requested on SHELL-01 (Toaster theme support, deduplicated theme resolver, and merge conflict resolution).
**Files Modified:** `src/app/layout.tsx`, `src/shared/lib/theme-provider.tsx`, `src/shared/lib/theme.ts`, `.ai/TASK_QUEUE.md`, `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** `src/shared/lib/theme-provider.test.tsx`.
**Architecture Decisions:** Extracted `resolveTheme` to `src/shared/lib/theme.ts` to de-duplicate the theme resolution code. Rendered `sonner`'s `<Toaster>` inside the client-side `ThemeProvider` component and passed it the dynamic client-side `theme` state, making notifications follow light/dark/system transitions.
**Outstanding Work:** Review and merge SHELL-01. Update SHELL-07.
**Known Bugs:** None.
**Risks:** None.
**Suggested Next Task:** Rebase and update SHELL-07 on top of SHELL-01.
**Estimated Context Needed:** `docs/10_DESIGN.md`, `src/app/layout.tsx`.

---

## 2026-07-17 — Claude (Reviewer) — DB-05 merged; SHELL-01/07 changes requested

**Session Date:** 2026-07-17
**Agent:** Claude, reviewer role (TPM/governance)
**Objective:** Review PR #15 (DB-05: `folders`) and PRs #13/#14 (SHELL-01/SHELL-07, Antigravity's first submissions).
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-05 → Done, Completed entry), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** None new. DB-05 is the first migration to exercise ADR-15 (`parent_folder_id ON DELETE SET NULL`).
**Verification performed — DB-05 (merged `0b30c56`):** SQL line-checked against 04 §4.5 (all seven columns, ADR-14 cascade, ADR-15 SET NULL, composite index, uniform RLS); the DB-03 review lesson was pre-applied (legacy default privileges revoked in the same migration — no follow-up migration needed this time). **Cloud suite run live by the reviewer from an isolated worktree (never touching the shared checkout): green, 3 files / 5 tests,** including the ADR-15 behavior (physically deleted parent → child falls to root). Non-blocking note routed to DB-13's audit: FK constraints bypass RLS — composite same-owner FKs are a hardening option for reference columns.
**Verification performed — SHELL-01/07 (changes requested on both, comments on the PRs):** substance approved on both (fonts wire correctly into the token vars; ThemeProvider uses the existing `/api/theme` route per ADR-9; TanStack defaults sane; dependency decisions honestly reported). Blocked because both branches are stale-based and DIRTY — GitHub cannot build the merge ref, so **the four required checks never ran**. Both must reconcile with `main`; #14 additionally waits on #13 (both edit `layout.tsx`). Both also invented an `## In Review` PROJECT_STATE section — flagged; status belongs in the queue.
**Outstanding Work:** Antigravity: fix #13, then #14. Database: DB-04 is fully unblocked (critical path). Backend: AUTH-01, CI-04 remain unclaimed.
**Known Bugs:** None.
**Risks:** Sonner toaster doesn't follow `.dark` yet (non-blocking fix requested on #13).
**Suggested Next Task:** Database: DB-04. Frontend: rework #13 per review comments.
**Estimated Context Needed:** This entry, review comments on PRs #13/#14, DB-05 Completed entry.

---

## 2026-07-17 — Codex (Database) — DB-05 implementation complete

**Session Date:** 2026-07-17
**Agent:** Codex, database implementation role
**Objective:** Implement DB-05 (`folders`) after ADR-15 placed it before DB-04 and decided folder-reference delete actions.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-05 → In Review), `docs/PROJECT_STATE.md` (implementation state), `docs/AI_HANDOFF.md` (this entry).
**Files Added:** `supabase/migrations/20260716204620_create_folders.sql`, `tests/integration/folders-rls.integration.test.ts`.
**Architecture Decisions:** None. Implemented `docs/04_DATABASE.md §4.5`, ADR-14, ADR-15, and GOV-6 exactly.
**Migration applied:** `20260716204620_create_folders`; repository filename exactly matches Cloud migration history.
**Policies created:** `folders_select_own`, `folders_insert_own`, `folders_update_own` (with `USING` and `WITH CHECK`), `folders_delete_own`; all target `authenticated` and compare initplan-cached `(select auth.uid())` with `owner_id`.
**Indexes created:** `folders_pkey`; `folders_owner_id_parent_folder_id_idx`.
**Verification performed:** Migration SQL first executed inside a rolled-back Cloud transaction. After applying, live catalog inspection confirmed all seven documented columns, UUID/timestamp defaults, `owner_id → profiles.id ON DELETE CASCADE`, self-referencing `parent_folder_id → folders.id ON DELETE SET NULL`, RLS enabled, four policies, the documented composite index, and CRUD-only grants for `authenticated`/`service_role` with no `anon` grants. DB-05 Cloud test passed independently (2 tests); full integration suite passed (3 files, 5 tests). Local format, typecheck, lint, and unit tests passed; final build/static checks run before commit. Security advisors returned no findings.
**Outstanding Work:** Independent reviewer must verify the PR and Cloud-attested state before merge. DB-05 remains In Review; DB-04 must not begin until DB-05 is Done.
**Known Bugs:** None.
**Risks:** Performance advisor reports an INFO-only `unindexed_foreign_keys` notice because the documented `(owner_id, parent_folder_id)` index does not lead with `parent_folder_id`. No extra index was invented because §4.5 specifies the exact index set; reviewer/architect may decide whether a future spec change is warranted. The pre-existing unused-index INFO for `knowledge_objects` remains unrelated.
**Suggested Next Task:** Review DB-05. After merge, DB-04 becomes dependency-ready.
**Estimated Context Needed:** DB-05 diff; `docs/04_DATABASE.md §4.5, §7, §11`; ADR-14; ADR-15; GOV-6.

---

## 2026-07-17 — Claude (Architect) — ADR-15: DB-04 dependency corrected, folder-FK delete actions decided

**Session Date:** 2026-07-17
**Agent:** Claude, architect/TPM role
**Objective:** Arbitrate the DB-04 escalation (entry below): the canonical dependency graph omitted DB-05 even though `notes.folder_id` references `folders.id`.
**Files Modified:** `docs/12_TASKS.md` (DB-04 deps → DB-03, DB-05), `docs/04_DATABASE.md` (§4.3 `folder_id` and §4.5 `parent_folder_id` gain explicit `ON DELETE SET NULL`), `docs/DECISIONS.md` (ADR-15), `.ai/TASK_QUEUE.md` (DB-04 Blocked → Queued with corrected deps; DB-05 flagged as next), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** **ADR-15** — (1) DB-04 canonically depends on DB-03 + DB-05 (backlog defect confirmed against both the spec and live Cloud state); (2) `notes.folder_id → folders.id` and `folders.parent_folder_id → folders.id` are `ON DELETE SET NULL` — the gap ADR-14 deliberately left, decided now so DB-05/DB-04 don't re-escalate. Rationale: matches "null = root" semantics, keeps the §6 physical purge unconditionally safe, loses no data; `CASCADE` would delete unexpired content, `NO ACTION` recreates the ADR-14 failure shape. Service-layer `FolderService.delete` strategies (05_API §5) still govern soft-delete-time tree shaping.
**Process notes:** Codex's escalation was again correct-by-the-book: verified spec + live Cloud state, rejected the two shortcut resolutions (omitting the FK; folding DB-05 into DB-04) for the right reasons, changed nothing itself.
**Outstanding Work:** None from this session. Database role: implement DB-05, then DB-04.
**Known Bugs:** None.
**Risks:** None new — see ADR-15 tradeoffs.
**Suggested Next Task:** Database: DB-05 (`folders`) — now on the critical path ahead of DB-04.
**Estimated Context Needed:** ADR-15 in DECISIONS.md, [04_DATABASE §4.3/§4.5](04_DATABASE.md#43-notes), the escalation entry below.

---

## 2026-07-17 — Codex (Database) — DB-04 blocked on missing DB-05 dependency

**Session Date:** 2026-07-17
**Agent:** Codex, database implementation role
**Objective:** Begin DB-04 (`notes` subtype table) after DB-03 review and merge.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-04 marked blocked), `docs/PROJECT_STATE.md` (dependency conflict recorded), `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** None. Implementation stopped for architect/human resolution.
**Verification performed:** Read DB-04 and DB-05 canonical rows plus `04_DATABASE §4.3`; confirmed `notes.folder_id` is a required FK to `folders.id`. Inspected the shared Cloud project: only `profiles` and `knowledge_objects` exist, with exactly the four reviewed migrations; `public.folders` is absent.
**Outstanding Work:** Correct the canonical dependency graph so DB-04 depends on DB-05, then implement DB-05 before DB-04. Alternative approaches were rejected: omitting the FK contradicts §4.3; creating `folders` inside DB-04 violates one-task scope and duplicates DB-05.
**Known Bugs:** None in deployed code; this is a backlog dependency defect.
**Risks:** Applying DB-04 as currently ordered would fail at `references public.folders (id)` or silently weaken the schema if the FK were omitted.
**Suggested Next Task:** Architect updates `docs/12_TASKS.md` and the queue so DB-04 depends on DB-03 + DB-05; database role then implements DB-05.
**Estimated Context Needed:** `docs/12_TASKS.md` DB-04/05 rows, `docs/04_DATABASE.md §4.3/4.5`, this handoff entry.

## 2026-07-17 — Claude (Reviewer) — DB-03 review & merge

**Session Date:** 2026-07-17
**Agent:** Claude, reviewer role (TPM/governance)
**Objective:** Review PR #10 (DB-03: `knowledge_objects` envelope), merge if sound.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-03 → Done, Completed entry), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** None. The second forward-only migration (revoke-all + re-grant CRUD, stripping legacy `REFERENCES`/`TRIGGER`/`TRUNCATE` default privileges) is a least-privilege correction within spec, correctly reported.
**Verification performed:** (1) Migration SQL reviewed line-by-line against 04 §4.2: seven columns with documented defaults, `note|attachment` CHECK, `owner_id → profiles.id ON DELETE CASCADE` (ADR-14 — first table to exercise it), both composite indexes, RLS in the uniform §7 shape with initplan-cached `(select auth.uid())`, policies scoped `to authenticated`. (2) Second migration fetched in full to confirm the re-grant line accompanies the `revoke all`. (3) **Reviewer ran the Cloud integration suite live on the PR branch: green (2 files, 3 tests)** — cross-user read/update/delete denial via empty-result semantics, cross-owner insert `42501`, CHECK rejection `23514`, owner self-access; also reconfirmed the harness fails closed when env is absent. (4) All four required CI contexts green. Squash-merged as `318f958`.
**Process notes:** Exemplary session — rolled-back-transaction dry run before applying, live catalog inspection after, advisors checked, the transient Cloud `JWT issued at future` flake disclosed rather than hidden, and no follow-on DB task started while awaiting review. Repo↔Cloud migration-history match remains implementer-attested until CI-04 lands.
**Outstanding Work:** DB-04 and DB-06..10 are now dependency-ready (database role, serialized per GOV-5). DB-05/11/12 were already ready.
**Known Bugs:** None.
**Risks:** Watch for recurrence of the Cloud JWT clock-skew flake in integration runs; if it repeats, the harness may need a small issued-at tolerance or retry.
**Suggested Next Task:** Database: DB-04 (`notes` subtype — critical path). Frontend (Antigravity): SHELL-01/07 remain open. Backend: AUTH-01, CI-04.
**Estimated Context Needed:** This entry, the DB-03 Completed entry in the queue, [04_DATABASE §4.3](04_DATABASE.md#43-notes) for DB-04.

---

## 2026-07-17 — Codex (Database) — DB-03 implementation complete

**Session Date:** 2026-07-17
**Agent:** Codex, database implementation role
**Objective:** Implement DB-03 (`knowledge_objects` envelope table) after ADR-14 resolved the owner-FK delete action.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-03 → In Review), `docs/PROJECT_STATE.md` (implementation state), `docs/AI_HANDOFF.md` (this entry).
**Files Added:** `supabase/migrations/20260716200215_create_knowledge_objects.sql`, `supabase/migrations/20260716200451_restrict_knowledge_objects_privileges.sql`, `tests/integration/knowledge-objects-rls.integration.test.ts`.
**Architecture Decisions:** None. Implemented `docs/04_DATABASE.md §4.2`, ADR-14, and GOV-6 exactly. The second migration is a forward-only least-privilege correction after live inspection showed legacy Supabase default privileges had also granted `REFERENCES`, `TRIGGER`, and `TRUNCATE`.
**Migrations applied:** `20260716200215_create_knowledge_objects`; `20260716200451_restrict_knowledge_objects_privileges`. Repository filenames exactly match Cloud migration history.
**Policies created:** `knowledge_objects_select_own`, `knowledge_objects_insert_own`, `knowledge_objects_update_own` (with `USING` and `WITH CHECK`), `knowledge_objects_delete_own`; all target `authenticated` and compare initplan-cached `(select auth.uid())` with `owner_id`.
**Indexes created:** `knowledge_objects_pkey`; `knowledge_objects_owner_id_deleted_at_idx`; `knowledge_objects_owner_id_type_idx`.
**Verification performed:** Migration SQL first executed inside a rolled-back Cloud transaction. After applying, live catalog inspection confirmed all seven documented columns, UUID/timestamp defaults, the `note|attachment` CHECK, `owner_id → profiles.id ON DELETE CASCADE`, RLS enabled, four policies, the two composite indexes, and CRUD-only grants for `authenticated`/`service_role` with no `anon` grants. DB-03 Cloud test passed independently (2 tests); full integration suite passed (2 files, 3 tests). Local format, typecheck, lint, and unit tests passed; final build/static checks run before commit. Security advisors returned no findings. Performance advisor reported one expected INFO-only unused-index notice on the new `(owner_id, deleted_at)` index; the index is explicitly required by §4.2 and has no production traffic yet.
**Outstanding Work:** Independent reviewer must verify the PR and Cloud-attested state before merge. DB-03 remains In Review; no subsequent DB task was started.
**Known Bugs:** None.
**Risks:** The default shell still resolves Node 20; Cloud tests were intentionally run with installed Node 23.6.0 to satisfy the repository's Node ≥22.12 requirement. One initial full-suite run hit a transient Cloud `JWT issued at future` response in the pre-existing profiles test; an immediate complete rerun passed.
**Suggested Next Task:** Review DB-03. After merge, DB-04 becomes claimable; DB-05 is already dependency-ready but should not be claimed concurrently with this database review.
**Estimated Context Needed:** DB-03 diff; `docs/04_DATABASE.md §4 intro, §4.2, §7, §11`; ADR-14; GOV-6.

---

## 2026-07-17 — Claude (Architect) — ADR-14: owner-FK delete action decided, DB-03 unblocked

**Session Date:** 2026-07-17
**Agent:** Claude, architect/TPM role
**Objective:** Arbitrate the DB-03 escalation (entry below): `knowledge_objects.owner_id → profiles.id` had no documented FK delete action.
**Files Modified:** `docs/04_DATABASE.md` (§4 intro gains the delete-action rule; §4.2 `owner_id` row explicit), `docs/DECISIONS.md` (ADR-14), `.ai/TASK_QUEUE.md` (DB-03 Blocked → Queued), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** **ADR-14** — every `owner_id` FK and every FK referencing `knowledge_objects.id` is `ON DELETE CASCADE`. Codex's recommendation (cascade) accepted; decided as a *uniform* rule rather than a DB-03-local answer so DB-04..12 never re-raise it. Basis: `NO ACTION` breaks the FR-AUTH-6 final Auth deletion for any user owning one physical row (soft-deleted rows included), and 04 §6's purge already assumed envelope-child cascades. Safety: cascade fires only on physical deletion, which only the post-grace-period service-role flow performs (ADR-11 leaves `profiles` with no user-facing DELETE).
**Process notes:** Model escalation from Codex — stopped before writing SQL, verified live Cloud state, gave a reasoned recommendation, explicitly flagged the DB-02 drift lesson (spec must be updated *with* the decision, which this entry does).
**Outstanding Work:** None from this session. DB-03 claimable immediately.
**Known Bugs:** None.
**Risks:** None new — see ADR-14 tradeoffs.
**Suggested Next Task:** Database agent: re-claim DB-03 and implement per §4.2 + ADR-14 + GOV-6.
**Estimated Context Needed:** ADR-14 in DECISIONS.md, [04_DATABASE §4 intro + §4.2](04_DATABASE.md#4-schema-reference), the escalation entry below.

---

## 2026-07-17 — Codex (Database) — DB-03 blocked on owner FK delete action

**Session Date:** 2026-07-17
**Agent:** Codex, database implementation role
**Objective:** Claim and implement DB-03 (`knowledge_objects` envelope table) after refreshing the Sprint 2 queue and live Supabase Cloud state.
**Files Modified:** `.ai/TASK_QUEUE.md` (DB-03 marked blocked), `docs/PROJECT_STATE.md` (blocker and branch recorded), `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None. The empty migration scaffold was removed before any SQL was written.
**Architecture Decisions:** None. Implementation stopped because the decision belongs to the architect/human.
**Verification performed:** Confirmed the Cloud project is healthy on Postgres 17.6, its migration history contains exactly the two committed DB-02 migrations, `public.profiles` has RLS enabled, and `public.knowledge_objects` does not exist. Reviewed current Supabase RLS/Data API grant guidance and the July 2026 breaking-change notice.
**Outstanding Work:** Resolve whether `knowledge_objects.owner_id → profiles.id` uses `ON DELETE CASCADE`. Recommendation: cascade, because default `NO ACTION` would prevent the documented final Auth-user deletion while owned Knowledge Objects exist. Record the chosen action in `docs/04_DATABASE.md §4.2`, then return DB-03 to `Claimed (Codex)` and implement the migration, policies, indexes, and Cloud denial test.
**Known Bugs:** None.
**Risks:** Choosing cascade without updating the structural schema would repeat the DB-02 spec/schema drift that required reviewer repair; choosing `NO ACTION` leaves the account-deletion flow internally inconsistent.
**Suggested Next Task:** Resume DB-03 after architect/human resolution; do not start DB-04 or another DB task while DB-03 is blocked.
**Estimated Context Needed:** `docs/04_DATABASE.md §4.2, §6–7, §11`; `docs/05_API.md §11`; DB-03 queue row.

---

## 2026-07-17 — Claude (TPM) — ADR-13: CI-04 mechanism decided, task unblocked

**Session Date:** 2026-07-17
**Agent:** Claude, TPM/governance role
**Objective:** Record the user's decision on the CI-04 migration-check mechanism (open since the DB-01 review) and unblock the task.
**Files Modified:** `docs/DECISIONS.md` (ADR-13), `docs/12_TASKS.md` (CI-04 row references ADR-13), `.ai/TASK_QUEUE.md` (CI-04 Blocked → Queued with mechanism-specific AC), `docs/PROJECT_STATE.md` (pending-decision row removed; Blocked cleared), `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** **ADR-13** — CI-04 replays the full migration history against an ephemeral version-pinned `supabase/postgres` service container in GitHub Actions (credential-free; runs on fork PRs), plus a token-gated `supabase migration list` drift check skipped on fork PRs (GOV-7). Includes the ADR-10 scope clarification: a CI-only container does not contradict the local-stack ban. Options A (preview branching — paid, credential-bound) and C (history check only — never executes SQL) declined; A flagged for revisit if per-PR isolated integration testing becomes valuable.
**Outstanding Work:** None from this session. Every Sprint 2 task is now claimable.
**Known Bugs:** None.
**Risks:** Pinned-image drift from the managed platform (rare; bump the pin alongside Cloud Postgres upgrades — the CI-04 implementer should record the pinned version where the bump will be found).
**Suggested Next Task:** Unchanged: DB-03 (database), AUTH-01 (backend), SHELL-01 (frontend); CI-04 itself is now claimable (backend).
**Estimated Context Needed:** ADR-13 in DECISIONS.md, the CI-04 queue row, `.github/workflows/ci.yml`.

---

## 2026-07-17 — Claude (TPM) — CI-07 scope gap closed: production Supabase provisioning

**Session Date:** 2026-07-17
**Agent:** Claude, TPM/governance role
**Objective:** Record a user-approved backlog fix: no task provisioned the production Supabase project (DB-01 created development only; CI-07 assumed prod secrets exist without a task creating the project).
**Files Modified:** `docs/12_TASKS.md` (CI-07 scope now includes provisioning the production project + applying the reviewed migration history; complexity S → M), `.ai/TASK_QUEUE.md` (row mirrored), `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** None — the two-project topology was already fixed in [03_ARCHITECTURE.md §8](03_ARCHITECTURE.md#8-deployment-architecture); this only assigns the provisioning work a home. Deliberate timing choice (user-confirmed): the production project is *not* created now — CI-07 is the first task that cannot complete without it.
**Outstanding Work:** Unchanged — Sprint 2 open, CI-04 mechanism decision pending.
**Known Bugs:** None.
**Risks:** None new. ADR-12's constraint (prod service-role key never in test environments) is restated on the queue row so CI-07's implementer sees it.
**Suggested Next Task:** Unchanged (DB-03 / AUTH-01 / SHELL-01).
**Estimated Context Needed:** CI-07 rows in 12_TASKS and the queue.

---

## 2026-07-17 — Claude (Reviewer + Architect) — OBS-01 review & merge; Sprint 1 closed; Sprint 2 promoted

**Session Date:** 2026-07-17
**Agent:** Claude, reviewer role (review) + architect role (sprint promotion, per the queue's promotion rule)
**Objective:** Review PR #5 (OBS-01: structured logger), merge if sound, close Sprint 1, promote the Sprint 2 wave.
**Files Modified:** `.ai/TASK_QUEUE.md` (OBS-01 → Done; Sprint 1 table retired; **Sprint 2 promoted** — 30 tasks with priorities/owners, CI-04 `Blocked`), `docs/PROJECT_STATE.md` (milestone header unfrozen: M0 in progress, Sprint 2 current), `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** None new. OBS-01's console-JSON mechanism is within 03 §9's explicitly open implementation choice; correctly reported by the implementer.
**Verification performed:** Full diff review of `logger.ts`/`logger.test.ts`. Design verified: content-free is *structural* — `LogMetadata` admits only `boolean | number | null` so strings are unrepresentable at type and runtime level; events validated against a stable-identifier pattern; request/user ids validated against injection (newline forgery rejected); `toJSON` smuggling defeated by plain-copy serialization; context snapshotted against caller mutation; unauthenticated = `userId: null`, no invented identity. Reviewer re-ran the suite locally (11 tests green) in addition to the four green required CI contexts. Zero dependencies added.
**Sprint 2 promotion rationale:** critical path is the DB-03..13 schema chain (P0, database) since every M1 feature needs tables; AUTH-01..05 and SHELL-01..02 are P0 parallel tracks; AUTH-06..09, SHELL-03/07, CI-05/07, OBS-02, DB-14/15 are P1; tasks whose dependencies aren't Done (AUTH-10..13, SHELL-04..06/08..09, CI-06/08) stay deferred. CI-04 enters the sprint as `Blocked` pending the mechanism decision.
**Outstanding Work:** CI-04 mechanism decision (user/architect). Sprint 2 implementation may begin immediately on any `Queued` task whose dependencies are Done.
**Known Bugs:** None.
**Risks:** Logger enforcement is module-boundary only — direct `console` calls bypass it (SEC-06 audits later; OBS-02 wires boundaries). SHELL-02/04 are `L` tasks: split required at claim time.
**Suggested Next Task:** Database agent: DB-03 (envelope table — unblocks six other migrations). Backend: AUTH-01. Frontend: SHELL-01.
**Estimated Context Needed:** This entry, the Sprint 2 table in `.ai/TASK_QUEUE.md`, [04_DATABASE §4](04_DATABASE.md#4-table-definitions), GOV-6/GOV-7 in DECISIONS.md.

---

## 2026-07-17 — Codex (Backend Engineer) — OBS-01 completion

**Session Date:** 2026-07-17
**Agent:** Codex, backend implementation role
**Objective:** Implement OBS-01 only: a structured logging foundation tagged with request id and user id whose metadata schema excludes note content, tokens, signed URLs, and other free text.
**Files Modified:** `.ai/TASK_QUEUE.md`, `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md`.
**Files Added:** `src/shared/lib/logger.ts`, `src/shared/lib/logger.test.ts`.
**Architecture Decisions:** None. Used native JSON-line console output for Vercel logs, an implementation mechanism explicitly left open by `03_ARCHITECTURE §9`; no dependency or infrastructure was added. Authenticated logs require an opaque user id, while unauthenticated request boundaries represent its absence as `null` rather than inventing an identity.
**Verification performed:** Format check, strict typecheck, lint, 16 unit tests, and production build pass locally. Logger tests cover UUID request-id generation; info/warn/error JSON structure; required request/user context; unauthenticated and immutable context; rejection of free-text events, string metadata, unsafe identifiers/keys, non-finite measurements, oversized events/keys, and excessive metadata fields; and resistance to custom metadata serialization hooks. The output schema admits only stable event identifiers plus bounded numeric/boolean/null metadata. Draft PR #5 passed all four protected CI contexts and both Vercel contexts; GitHub reports it `CLEAN` and `MERGEABLE`.
**Outstanding Work:** Claude review of OBS-01. No implementation work remains. OBS-02 will wire the module across request boundaries in its own task.
**Known Bugs:** None.
**Risks:** Content-free logging is enforced at this module boundary, but future code could still bypass the module with direct console calls; SEC-06 owns the later full log-path audit. OBS-01 intentionally does not wire request handlers because that is OBS-02.
**Suggested Next Task:** Review OBS-01. After it is Done, Sprint 1 is complete and the architect can promote the next dependency-ready wave once the CI-04 mechanism is decided.
**Estimated Context Needed:** This entry, `.ai/TASK_QUEUE.md` OBS-01 row, `docs/03_ARCHITECTURE.md §9`, `docs/09_SECURITY.md §6/§11`, and `src/shared/lib/logger.ts`.

---

## 2026-07-17 — Claude (Reviewer) — CI-03 review & merge; GOV-7 recorded

**Session Date:** 2026-07-17
**Agent:** Claude, reviewer role (TPM/governance)
**Objective:** Review PR #3 (CI-03: `main` branch protection), merge if sound, record the repository-visibility decision.
**Files Modified:** `.ai/TASK_QUEUE.md` (CI-03 → Done, Completed entry), `docs/PROJECT_STATE.md`, `docs/DECISIONS.md` (GOV-7 added), `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** **GOV-7 — repository is public.** The implementer reported "None" and attributed the visibility flip to explicit user choice, which is accurate — but a visibility change with standing security consequences belongs in the registry regardless of who made it. Recorded with the fork-PR constraint: any future credentialed CI job (e.g., Cloud integration tests in CI) must not be triggerable from fork PRs.
**Verification performed:** (1) Live protection read back from the GitHub API — `strict: true`, exactly `Typecheck`/`Lint`/`Format`/`Unit tests` pinned to the GitHub Actions app, `enforce_admins: true`, force pushes and deletions disabled — matching the AC including the up-to-date-branches requirement from the CI-01 review. (2) Repo visibility confirmed public via API. (3) **Full-history secret scan run at flip time: clean** (no service-role keys, JWT prefixes, or API-key patterns in any commit). (4) PR #3 diff reviewed — governance-only, honest reporting. (5) Squash-merged as `64e0c2c`; the direct-push block then proven empirically — this review record's own push to `main` was rejected and had to merge through the gated PR path.
**Outstanding Work:** OBS-01 (P1) closes Sprint 1. CI-04 mechanism decision required before the Sprint 2 wave is promoted.
**Known Bugs:** None.
**Risks:** Public repo consequences per GOV-7 (managed). SEC-07 hardening (SHA-pinned actions) gains weight now that workflows are public. Governance commits now also require PRs — slight overhead, correct tradeoff.
**Suggested Next Task:** OBS-01 (backend). In parallel: user/architect decision on the CI-04 mechanism.
**Estimated Context Needed:** This entry, GOV-7 in DECISIONS.md, `.ai/TASK_QUEUE.md` Sprint 1 table.

---

## 2026-07-17 — Codex (Backend Engineer) — CI-03 completion

**Session Date:** 2026-07-17
**Agent:** Codex, backend implementation role
**Objective:** Implement CI-03 only: protect `main`, require the four CI-01 checks, and require branches to be up to date before merge.
**Files Modified:** `.ai/TASK_QUEUE.md`, `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md`; GitHub repository setting for `main` branch protection.
**Files Added:** None.
**Architecture Decisions:** None. The user changed the repository from private to public to enable GitHub's protection controls on the current plan. The implementation applies only the documented restrictions and does not add an undocumented review-count requirement.
**Verification performed:** Confirmed `techminion/second-brain` is public. Applied and independently read back `main` protection through the GitHub API: `strict: true`; exact required contexts `Typecheck`, `Lint`, `Format`, and `Unit tests`; administrator enforcement enabled; force pushes and deletion disabled. GitHub reports `main` as protected. Draft PR #3 exercised the protected path: all four required checks and both Vercel contexts passed, and GitHub reported the current branch `CLEAN` and `MERGEABLE`. This configuration requires a current branch with all four PR-only checks, thereby blocking direct pushes including administrator pushes.
**Outstanding Work:** Claude review of CI-03 and verification of the live repository setting. No implementation work remains.
**Known Bugs:** None.
**Risks:** The repository is now publicly visible by explicit user choice. CI-03 does not require approving reviews because that was not part of its acceptance criteria; the four checks and up-to-date enforcement are mandatory.
**Suggested Next Task:** Review CI-03. OBS-01 is the remaining Sprint 1 task.
**Estimated Context Needed:** This entry, `.ai/TASK_QUEUE.md` CI-03 row, `.github/workflows/ci.yml`, and the live `main` protection response.

---

## 2026-07-17 — Claude (Reviewer) — CI-02 review & merge

**Session Date:** 2026-07-17
**Agent:** Claude, reviewer role (TPM/governance)
**Objective:** Review PR #2 (CI-02: Vercel Git integration), merge if sound, close out the governance record.
**Files Modified:** `.ai/TASK_QUEUE.md` (CI-02 → Done, Completed entry), `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md` (this entry).
**Files Added:** None.
**Architecture Decisions:** None. `vercel.json` (`framework: nextjs` only) is corrective configuration, not new infrastructure — consistent with [03_ARCHITECTURE §8](03_ARCHITECTURE.md).
**Verification performed:** Diff reviewed in full (5 files, +44/−5, no secrets, no app-code changes). All six PR checks green including the Vercel deployment context. Reviewer probed the preview URL live — HTTP 200. Squash-merged as `2a634a0` with branch deletion, then **watched the merge commit's Vercel status until the first production deployment reported `success`** — the one path the PR itself could not exercise. Spec conformance checked against 03_ARCHITECTURE's environment table (preview per PR / prod on `main` / secrets in Vercel env vars deferred to CI-07).
**Process notes:** Clean session — proper branch + PR, task left In Review rather than self-marked Done, the base was reconciled with `main` after CI-01 merged, and the Vercel framework-misclassification incident was reported honestly. The decision-reporting gap from earlier sessions did not recur.
**Outstanding Work:** CI-03 (last Sprint 1 P0 — branch protection with the four required contexts + up-to-date-branches) and OBS-01. CI-04 mechanism decision still open before Sprint 2.
**Known Bugs:** None.
**Risks:** Preview deployments are publicly reachable (no Vercel Deployment Protection). Harmless while previews carry no env vars; revisit when CI-07 attaches the shared dev Supabase env. Direct pushes to `main` remain possible until CI-03.
**Suggested Next Task:** CI-03 — it converts the now fully-exercised pipeline (CI checks + Vercel deploys) from voluntary to enforced.
**Estimated Context Needed:** This entry, `.ai/TASK_QUEUE.md` CI-03 row, CI-01 review entry (required-context names).

---

## 2026-07-17 — Codex (Backend Engineer) — CI-02 conflict resolution

**Session Date:** 2026-07-17
**Agent:** Codex, backend implementation role
**Objective:** Resolve PR #2's conflicts after CI-01 was reviewed and merged to `main`.
**Files Modified:** `.ai/TASK_QUEUE.md`, `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md`.
**Files Added:** None directly; `.github/workflows/ci.yml` enters the branch from the reviewed CI-01 merge.
**Architecture Decisions:** None. Preserved CI-01 as Done, CI-02 as In Review, and the reviewer's expanded CI-03 acceptance criteria.
**Verification performed:** Merged current `origin/main` into `chore/ci-02-vercel`, reconciled all three shared-document conflicts without dropping either task's history, and validated the resolved branch before push.
**Outstanding Work:** Claude review of PR #2. CI-03 is now dependency-unblocked and may be claimed in a separate task branch.
**Known Bugs:** None.
**Risks:** Vercel environment variables remain intentionally deferred to CI-07. Production deployment behavior is configured but has not been exercised by merging CI-02 to `main`.
**Suggested Next Task:** Review and merge CI-02; CI-03 may proceed separately now that CI-01 is Done.
**Estimated Context Needed:** PR #2, `.ai/TASK_QUEUE.md` CI-02/CI-03 rows, `vercel.json`, and the CI-01 review entry below.

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

## 2026-07-17 — Codex (Backend Engineer) — CI-02 completion

**Session Date:** 2026-07-17
**Agent:** Codex, backend implementation role
**Objective:** Implement CI-02 only: connect `techminion/second-brain` to Vercel with preview deployments for pull requests and production deployments from `main`, then validate the integration on a test PR.
**Files Modified:** `.gitignore`, `.ai/TASK_QUEUE.md`, `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md`.
**Files Added:** `vercel.json`.
**Architecture Decisions:** None. The repository-level Vercel configuration selects the documented Next.js framework; deployment environment behavior is provided by the Vercel Git integration.
**Verification performed:** Vercel project `techminions-projects/second-brain` is linked to `https://github.com/techminion/second-brain.git`. Draft PR #2 triggered Preview deployments that reached `Ready`; the stable branch preview is https://second-brain-git-chore-ci-02-vercel-techminions-projects.vercel.app. The first deployment exposed an incorrect Vercel framework classification (`Other`) that looked for a `public` output directory after the Next.js build succeeded; `vercel.json` now explicitly selects `nextjs`, and the subsequent hosted deployments passed.
**Outstanding Work:** Claude review of PR #2. CI-03 remains dependency-blocked until CI-01 is reviewed, merged, and marked Done.
**Known Bugs:** None.
**Risks:** Vercel environment variables are intentionally deferred to CI-07. Production deployment behavior is configured but was not exercised by merging this feature branch to `main`.
**Suggested Next Task:** Review CI-02. Review and merge CI-01 before CI-03 is claimed.
**Estimated Context Needed:** PR #2, `.ai/TASK_QUEUE.md` CI-02 row, `vercel.json`, and `docs/11_CONTRIBUTING.md §6`.

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
