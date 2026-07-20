# Changelog

All notable changes to Second Brain are documented here, following [Keep a Changelog](https://keepachangelog.com/) conventions and semantic versioning.

**Versioning policy:** pre-1.0 while pre-launch. `0.1.0` is tagged at M0 exit (deployable skeleton); minor versions track milestone exits; `1.0.0` is the public beta (M5 exit). Until the first tag, everything accumulates under Unreleased.

## [Unreleased]

### Added
- **2026-07-19** — Authenticated routes now render inside a server-composed three-zone shell with independently collapsible, accessible left and right rails (SHELL-02; PR #64).
- **2026-07-19** — Pull requests now replay the complete Supabase migration history against a pinned Postgres 17 service and verify repository↔Cloud migration-history parity; the fork-safe `Migration check` is required by `main` branch protection (CI-04, ADR-13/21).
- **2026-07-19** — Pull requests now run a high-severity dependency audit, enforced as a required `main` branch-protection check (CI-05).
- **2026-07-19** — Sessions persist across browser restarts and refresh transparently; session cookies are `HttpOnly`/`SameSite=Lax` and auth tokens are never exposed to browser JavaScript (AUTH-04, ADR-20). _Backfilled by the reviewer alongside AUTH-02/03 — these shipped without changelog entries._
- **2026-07-18** — Login page at `/login` with a neutral incorrect-credentials message; signup and login pages cross-link (AUTH-03).
- **2026-07-18** — Email/password signup at `/signup`: creates an account and lands signed in (AUTH-02; server policy per ADR-19).

### Changed
- **2026-07-21** — Logout now revokes the current session's refresh token server-side, clears its HttpOnly cookies, and redirects to `/login`; other device sessions remain active by design (AUTH-08, ADR-22). The visible trigger is wired when SHELL-03 populates the sidebar.
- **2026-07-19** — Authenticated app routes now redirect anonymous visitors to `/login`; verified sessions enter the `(app)` route group while auth pages and API routes retain their own access policies (AUTH-05).
- **2026-07-16** — DB-16 adds typed Supabase browser/session/service-role client factories and a Cloud RLS integration harness; the public environment contract now uses Supabase publishable keys instead of the legacy anon key.
- **2026-07-16** — Security spec: the service-role-key enumeration in `09_SECURITY.md §5` gains a third, tightly-constrained context — the Cloud integration-test harness (test code only, dev project only) — and `@supabase/supabase-js` + `@supabase/ssr` are recorded as the approved client packages (ADR-12), unblocking DB-16.
- **2026-07-16** — Database spec conflict resolved: `profiles` RLS policy explicitly defined as `id = auth.uid()` — the sole exception to the uniform `owner_id` shape (ADR-11) — and RLS now ships inside each table's own migration with DB-13 redefined as an audit task (GOV-6).
- **2026-07-16** — Design spec unblocked for implementation: concrete light/dark token values added to `10_DESIGN.md §3.3` (ADR-8) and theme-override persistence corrected from "per user" to cookie-based per-browser with SSR stamping (ADR-9), resolving the SETUP-02/SETUP-13 blockers.

### Added
- **2026-07-16** — M0 SETUP-01..14: strict Next.js 15/React 19 foundation with Tailwind semantic tokens, vendored shadcn primitives, feature-first source skeleton, typed environment access, cookie-backed theme support, and Vitest/Playwright tooling.
- **2026-07-16** — Interim root README, `.gitignore`, corrected `.claude/CLAUDE.md` agent instructions (real file paths, authoritative workflow pointers), and a governance-documents section in `docs/DOCUMENT_INDEX.md`.
- **2026-07-16** — Project governance layer: roadmap, milestone phase breakdown, living project state, AI handoff log, decision registry (GOV-1–5), this changelog, `.ai/` agent context set (project context, workflow, architecture rules, coding standards, task queue), `.github/` issue/PR templates and label taxonomy, and nine `agents/` role definitions.
- **2026-07-16** — Consistency audit fixes across the documentation set: 84 stale cross-reference anchors repaired; 8 contradictions resolved (full-text search scope, export requirement FR-KO-6, embedding freshness budget, account-deletion grace period, backlinks snippet contract, partial-message persistence, rename-propagation mechanism, post-MVP seed sourcing); canonical tech-stack table added to 03_ARCHITECTURE §2.1; task backlog corrected to 309 tasks with two forward dependencies resolved. (`c559cca`)
- **2026-07-16** — `11_CONTRIBUTING.md` (engineering rulebook incl. AI-agent rules) and `12_TASKS.md` (309-task backlog). (`4b08585`)
- **2026-07-16** — `09_SECURITY.md` (threat model, authorization layers, rate limits) and `10_DESIGN.md` (design tokens, editor UX, accessibility). (`929ac49`)
- **2026-07-16** — `07_AI.md` (embeddings, chunking, RAG, prompts, budgets) and `08_SEARCH.md` (hybrid search, RRF ranking). (`947097f`)
- **2026-07-15** — `05_API.md` (eight-service layer, error taxonomy) and `06_MCP.md` (14 tools, 2 resources, credential auth). (`318cb18`)
- **2026-07-15** — `03_ARCHITECTURE.md` (layered monolith, six key flows, 7 ADRs) and `04_DATABASE.md` (13-table Knowledge Object schema, RLS, 5 ADRs). (`b114ba8`)
- **2026-07-15** — `01_PRODUCT.md` (Knowledge Object model, vision, competitive analysis), `02_PRD.md` (functional/non-functional requirements, milestones), `DOCUMENT_INDEX.md`. (`edd7886`)
