# Changelog

All notable changes to Second Brain are documented here, following [Keep a Changelog](https://keepachangelog.com/) conventions and semantic versioning.

**Versioning policy:** pre-1.0 while pre-launch. `0.1.0` is tagged at M0 exit (deployable skeleton); minor versions track milestone exits; `1.0.0` is the public beta (M5 exit). Until the first tag, everything accumulates under Unreleased.

## [Unreleased]

### Security
- **2026-07-22** — Pinned `sharp` to `^0.35.3` via an npm `overrides` entry, clearing the high-severity libvips advisories (CVE-2026-33327/33328/35590/35591) that Next.js 15 pulled in transitively through `sharp@0.34.x`. Unblocks the `Dependency audit` gate without changing the documented Next.js 15 pin (SEC-07).

### Added
- **2026-07-24** — Added reusable skeleton-loading primitives (`Skeleton`, `SkeletonText`) that pulse to signal loading, match the final layout to avoid shift, and go still under reduced-motion — the foundation for the app's spinner-free loading states (SHELL-08).
- **2026-07-24** — A brand-new account now lands on an onboarding empty state that teaches the three core moves — create a note (`⌘N`), link ideas with `[[`, and open the command palette (`⌘K`) — instead of a placeholder (SHELL-09, FR-AUTH-5).
- **2026-07-24** — Every pull request now runs axe WCAG 2.1 AA checks against its preview deployment (login, signup, forgot-password, the authenticated shell, and settings); the first run caught and fixed color-only auth links, which are now underlined (CI-08).
- **2026-07-24** — Every same-repository pull request now runs the Playwright E2E suite against its own Vercel preview deployment, crossing Standard Preview Protection with an automation-bypass token; the job is fork-safe and skips cleanly until its secrets are provisioned (CI-06).
- **2026-07-24** — Keyboard shortcuts are now managed globally with input-focus guards: `⌘\` toggles the sidebar and `⌘E` the right panel (also live in the command palette, no longer placeholders); `⌘K` works with Caps Lock on and from ordinary form fields while still yielding to the rich-text editor; the palette scrolls its active item into view and animates open/close respecting reduced-motion (SHELL-05).
- **2026-07-24** — The markdown editor now round-trips notes without content loss (FR-NOTE-2): image URLs are preserved (previously destroyed on save), `[[wiki links]]` survive unescaped, underline is removed from the schema (no standard markdown form), and a lossy-construct detector flags tables, task lists, and raw HTML so future autosave can fall back to plain-text editing instead of degrading them (EDIT-02).
- **2026-07-24** — `NoteService.list`: cursor-paginated note listings (newest-edited first, stable keyset cursors, 1–100 page size) with folder filtering including a root-only filter; soft-deleted notes never appear (NOTE-06, FR-KO-3, FR-NOTE-6).
- **2026-07-24** — `NoteService.delete` and `restore` (FR-NOTE-4, FR-KO-3): soft delete refuses already-trashed notes so a repeat delete can never restart the 30-day purge clock; restore succeeds only for trash inside the retention window and returns the full note (NOTE-05, ADR-26).
- **2026-07-24** — `NoteService.update` per the 05_API §4 contract: partial updates of title/body/folder with the title dual-write invariant enforced atomically in the `update_note` RPC, which now also refuses to mutate soft-deleted notes (NOTE-04, ADR-26). Link reconciliation and rename propagation follow in LINK-04.
- **2026-07-23** — `⌘K` / `Ctrl+K` opens a command palette with all documented keyboard shortcuts inline — the palette teaches shortcuts even for features not yet built; arrow keys navigate, Enter executes, and Esc closes (SHELL-04; 10_DESIGN §8). A contenteditable focus guard prevents the shortcut from conflicting with rich-text editor bindings.
- **2026-07-23** — Account deletion is now available from `/settings → Danger zone`: a confirmation dialog explains the 30-day grace period and irreversibility; the action soft-deletes all knowledge objects, revokes MCP credentials, marks the profile for purge, signs out, and redirects to login (AUTH-12, FR-AUTH-6).
- **2026-07-23** — Account settings page at `/settings` with editable display name (trim, clear on whitespace, 80-char max) and read-only email; accessible from the sidebar nav (AUTH-10, ADR-23).
- **2026-07-22** — Google OAuth is available from both login and signup through a server-side PKCE flow; the verifier and resulting session remain in hardened HttpOnly cookies, with generic failure handling and a fixed callback route (AUTH-07, FR-AUTH-2, ADR-20).
- **2026-07-22** — Added the ADR-23 `UserService` profile contract: RLS-scoped profile reads/updates, verified-session email, and trimmed/null-clear/80-character display-name validation, establishing the feature-first user service and repository for AUTH-10/11 and credential work (AUTH-09; PR #76).
- **2026-07-22** — Motion foundations now expose only the documented 150ms micro-interaction and 250ms structural durations, collapse both to 0ms for reduced-motion preferences, and apply direction-aware easing to shared buttons and shell-panel width changes (SHELL-10; PR #73).
- **2026-07-22** — Users who forget their password can request an emailed reset link at `/forgot-password`, follow it through a server-side recovery callback, and set a new password at `/reset-password`; the recovery session lives only in HttpOnly cookies (AUTH-06, FR-AUTH-3, ADR-20). Login links to the flow.
- **2026-07-21** — The application sidebar now provides semantic Daily note, Folders, and Tags section frames for later feature population plus a working server-side Log out control (SHELL-03, AUTH-08).
- **2026-07-19** — Authenticated routes now render inside a server-composed three-zone shell with independently collapsible, accessible left and right rails (SHELL-02; PR #64).
- **2026-07-19** — Pull requests now replay the complete Supabase migration history against a pinned Postgres 17 service and verify repository↔Cloud migration-history parity; the fork-safe `Migration check` is required by `main` branch protection (CI-04, ADR-13/21).
- **2026-07-19** — Pull requests now run a high-severity dependency audit, enforced as a required `main` branch-protection check (CI-05).
- **2026-07-19** — Sessions persist across browser restarts and refresh transparently; session cookies are `HttpOnly`/`SameSite=Lax` and auth tokens are never exposed to browser JavaScript (AUTH-04, ADR-20). _Backfilled by the reviewer alongside AUTH-02/03 — these shipped without changelog entries._
- **2026-07-18** — Login page at `/login` with a neutral incorrect-credentials message; signup and login pages cross-link (AUTH-03).
- **2026-07-18** — Email/password signup at `/signup`: creates an account and lands signed in (AUTH-02; server policy per ADR-19).

### Changed
- **2026-07-22** — Preview and Production now use isolated Supabase projects and webhook credentials; Production runs at `brain.khaire.dev` with Google OAuth, custom SMTP/templates, and the retention worker wired end-to-end. By explicit user decision, distinct OpenAI credentials move from CI-07 to EMB-01 immediately before first live AI use (ADR-24).
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
