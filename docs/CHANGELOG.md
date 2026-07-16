# Changelog

All notable changes to Second Brain are documented here, following [Keep a Changelog](https://keepachangelog.com/) conventions and semantic versioning.

**Versioning policy:** pre-1.0 while pre-launch. `0.1.0` is tagged at M0 exit (deployable skeleton); minor versions track milestone exits; `1.0.0` is the public beta (M5 exit). Until the first tag, everything accumulates under Unreleased.

## [Unreleased]

### Changed
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
