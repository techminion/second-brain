# 12. Tasks — Master Implementation Backlog

> Part of the [Documentation Index](DOCUMENT_INDEX.md). Decomposes the milestones from [02_PRD.md §7](02_PRD.md#7-milestones) into independently implementable tasks, to be executed under the rules in [11_CONTRIBUTING.md](11_CONTRIBUTING.md) — especially §8 (Rules for AI Coding Agents). Every task traces to a requirement in [02_PRD.md §4](02_PRD.md#4-functional-requirements) or a design decision in documents 03–10; a task is never its own justification.

## 1. How to Use This Backlog

- **Task IDs** are `<AREA>-<number>` and stable — never renumber; append instead.
- **Complexity:** `S` (≤ half a day for an agent, single file or two) · `M` (a day, one feature slice) · `L` (multi-day, cross-cutting — candidates for splitting during execution).
- **Depends on** lists task IDs that must be *merged* first. No dependency = parallelizable within its phase.
- **Phases are the PRD milestones.** A phase's tasks may start when the prior phase's *blocking* tasks (not necessarily all tasks) are done — dependencies encode the real ordering; phases are for planning rhythm.
- Every task implicitly includes: tests per [11_CONTRIBUTING.md §5](11_CONTRIBUTING.md#5-testing-strategy), types per §3, and RLS + cross-user tests for any new table (§7.4).
- **Definition of done** for every task: merged to `main` with green CI, deployed to preview, acceptance criteria of the referenced FR satisfied.

### Task count by phase

| Phase | Area codes | Tasks |
|---|---|---|
| 0 — Foundations | SETUP, DB, AUTH, SHELL, CI, OBS-01 | 63 |
| 1 — Collect | NOTE, EDIT, FOLD, TAG, ATT, DAILY | 78 |
| 2 — Connect | LINK, BACK, GRAPH, SRCH-05/06/08 | 39 |
| 3 — Discover | FTS, EMB, SEM, SRCH (remainder) | 38 |
| 4 — Collaborate | AICH, VCH, MCP, CRED | 52 |
| 5 — Launch readiness | PERF, SEC, A11Y, EXP, OBS | 39 |
| **Total** | | **309** |

Two areas span phases deliberately: OBS-01 (structured logging) lives in Phase 0 because instrumentation tasks in every later phase depend on it, and SRCH-05/06/08 (title autocomplete) live in Phase 2 because the `[[` autocomplete (LINK-06) depends on them.

---

## Phase 0 — Foundations ([02_PRD.md §7](02_PRD.md#7-milestones), M0)

### Repo & project setup (SETUP)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| SETUP-01 | Initialize Next.js 15 + React 19 + TypeScript strict project | S | — |
| SETUP-02 | Configure Tailwind CSS with the semantic token scaffold from [10_DESIGN.md §3](10_DESIGN.md#3-design-tokens) | M | SETUP-01 |
| SETUP-03 | Install shadcn/ui; vendor the base primitives (Button, Input, Dialog, Popover, DropdownMenu, Tooltip) | S | SETUP-02 |
| SETUP-04 | Configure ESLint: strict TS rules, no-explicit-any, import-boundary rules per [11_CONTRIBUTING.md §2](11_CONTRIBUTING.md#2-folder-structure) | M | SETUP-01 |
| SETUP-05 | Configure Prettier + import sorting; wire format check script | S | SETUP-01 |
| SETUP-06 | Create the feature-first folder skeleton (`features/`, `shared/ui`, `shared/lib`, `shared/types`) | S | SETUP-01 |
| SETUP-07 | Add lint rule forbidding Tailwind arbitrary values ([10_DESIGN.md §3.2](10_DESIGN.md#32-spacing--layout)) | S | SETUP-04 |
| SETUP-08 | Add lint rule forbidding `NEXT_PUBLIC_` on secret-named env vars ([09_SECURITY.md §6](09_SECURITY.md#6-secrets-management)) | S | SETUP-04 |
| SETUP-09 | Set up Vitest + Testing Library with colocated test convention | S | SETUP-01 |
| SETUP-10 | Set up Playwright with a smoke test against the dev server | M | SETUP-01 |
| SETUP-11 | Define shared error taxonomy classes in `shared/lib/errors.ts` per [05_API.md §3](05_API.md#3-error-taxonomy) | S | SETUP-06 |
| SETUP-12 | Define shared types: `KnowledgeObjectSummary`, `Paginated<T>`, pagination options per [05_API.md §2](05_API.md#2-conventions) | S | SETUP-06 |
| SETUP-13 | Dark mode plumbing: `.dark` class strategy, `prefers-color-scheme` default, persisted override ([10_DESIGN.md §7](10_DESIGN.md#7-dark-mode)) | M | SETUP-02 |
| SETUP-14 | Environment variable documentation + typed env accessor module | S | SETUP-06 |

### Database foundation (DB)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| DB-01 | Provision Supabase Cloud development project; configure versioned migration workflow without a local Docker stack; document Cloud workflow | M | — |
| DB-02 | Migration: `profiles` table + signup trigger creating a profile row, incl. its `id = auth.uid()` RLS policy and cross-user test ([04_DATABASE.md §4.1, §7](04_DATABASE.md#41-profiles), ADR-11) | S | DB-01 |
| DB-03 | Migration: `knowledge_objects` envelope table with type CHECK, indexes ([04_DATABASE.md §4.2](04_DATABASE.md#42-knowledge_objects)) | M | DB-02 |
| DB-04 | Migration: `notes` subtype table with generated `search_vector`, GIN index, daily-note unique constraint ([04_DATABASE.md §4.3](04_DATABASE.md#43-notes)) | M | DB-03, DB-05 |
| DB-05 | Migration: `folders` table ([04_DATABASE.md §4.5](04_DATABASE.md#45-folders)) | S | DB-02 |
| DB-06 | Migration: `tags` + `knowledge_object_tags` tables ([04_DATABASE.md §4.6–4.7](04_DATABASE.md#46-tags)) | S | DB-03 |
| DB-07 | Migration: `links` table with unique pair constraint + both direction indexes ([04_DATABASE.md §4.8](04_DATABASE.md#48-links)) | S | DB-03 |
| DB-08 | Migration: enable pgvector; `embeddings` table with HNSW index ([04_DATABASE.md §4.9](04_DATABASE.md#49-embeddings), [08_SEARCH.md §3](08_SEARCH.md#3-semantic-search-pgvector)) | M | DB-03 |
| DB-09 | Migration: `attachments` subtype table + private storage bucket with owner-scoped path policy ([04_DATABASE.md §4.4](04_DATABASE.md#44-attachments)) | M | DB-03 |
| DB-10 | Migration: `chat_conversations` + `chat_messages` ([04_DATABASE.md §4.10–4.11](04_DATABASE.md#410-chat_conversations)) | S | DB-03 |
| DB-11 | Migration: `mcp_credentials` ([04_DATABASE.md §4.12](04_DATABASE.md#412-mcp_credentials)) | S | DB-02 |
| DB-12 | Migration: `audit_log`, append-only policy shape ([04_DATABASE.md §4.13](04_DATABASE.md#413-audit_log)) | S | DB-02 |
| DB-13 | RLS audit: verify every table above has its policy, in the correct shape ([04_DATABASE.md §7](04_DATABASE.md#7-row-level-security-rls-policies)); policies themselves ship inside each table's own migration (GOV-6 — DB-02..DB-12 each include RLS + its cross-user test) | M | DB-02..DB-12 |
| DB-14 | Cross-user RLS integration test suite — one denial test per table ([09_SECURITY.md §9](09_SECURITY.md#9-threat-model), T1) | M | DB-13 |
| DB-15 | Retention purge: `pg_cron` schedule + service-role purge worker endpoint, Storage-API-first, incl. folders (ADR-18; [04_DATABASE.md §6](04_DATABASE.md#6-soft-deletes)) | M | DB-13 |
| DB-16 | Typed Supabase client factories (browser anon, server session-scoped, service-role) in `shared/lib` | M | DB-01, SETUP-06 |

### Authentication (AUTH)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| AUTH-01 | Supabase Auth config: email/password provider, email templates | S | DB-01 |
| AUTH-02 | Signup page + form (React Hook Form + zod) — FR-AUTH-1 | M | SETUP-03, AUTH-01 |
| AUTH-03 | Login page + form — FR-AUTH-1 | M | AUTH-02 |
| AUTH-04 | Session cookie handling: `HttpOnly`/`Secure`/`SameSite=Lax`, middleware refresh ([09_SECURITY.md §3](09_SECURITY.md#3-authentication)) — FR-AUTH-4 | M | AUTH-01, DB-16 |
| AUTH-05 | Auth middleware: protect `(app)` routes, redirect unauthenticated | S | AUTH-04 |
| AUTH-06 | Password reset request + completion flow — FR-AUTH-3 | M | AUTH-01 |
| AUTH-07 | Google OAuth provider — FR-AUTH-2 | M | AUTH-04 |
| AUTH-08 | Logout (revokes refresh token server-side) | S | AUTH-04 |
| AUTH-09 | `UserService.getProfile` / `updateProfile` ([05_API.md §11](05_API.md#11-userservice)) | S | DB-02, SETUP-11 |
| AUTH-10 | Account settings page (display name) | S | AUTH-09, SHELL-03 |
| AUTH-11 | `UserService.deleteAccount` orchestration (soft-delete all, revoke credentials, Auth deletion) — FR-AUTH-6 | M | AUTH-09, DB-13 |
| AUTH-12 | Account deletion UI with grace-period confirmation | M | AUTH-11 |
| AUTH-13 | New-user provisioning verification: signup → empty authenticated shell (FR-AUTH-5) E2E test | S | AUTH-02, SHELL-02 |
| AUTH-14 | Auth error states: wrong password, existing email, expired reset link | S | AUTH-03, AUTH-06 |

### App shell (SHELL)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| SHELL-01 | Root layout: fonts (Inter, JetBrains Mono), theme provider, toaster | S | SETUP-02, SETUP-13 |
| SHELL-02 | Three-zone app shell: collapsible sidebar, main area, collapsible right panel ([10_DESIGN.md §3.2](10_DESIGN.md#32-spacing--layout)) | L | SHELL-01 |
| SHELL-03 | Sidebar navigation frame (sections for folders, tags, daily note — populated by later phases) | M | SHELL-02 |
| SHELL-04 | Command palette component (`⌘K`) with static command registry ([10_DESIGN.md §8](10_DESIGN.md#8-keyboard-shortcuts)) | L | SHELL-02 |
| SHELL-05 | Global keyboard shortcut manager (registration, `⌘`/`Ctrl` mapping, input-focus guards) | M | SHELL-02 |
| SHELL-06 | Responsive breakpoint behavior for the shell ([10_DESIGN.md §11](10_DESIGN.md#11-responsive-behavior)) | M | SHELL-02 |
| SHELL-07 | TanStack Query provider + defaults (retries, staleness) | S | SETUP-01 |
| SHELL-08 | Skeleton-loading primitives matching final layouts ([10_DESIGN.md §4](10_DESIGN.md#4-component-philosophy)) | S | SHELL-02 |
| SHELL-09 | Empty-state component with teach-the-basics content ([10_DESIGN.md §4](10_DESIGN.md#4-component-philosophy)) | S | SHELL-02 |
| SHELL-10 | Motion tokens (150/250ms) + `prefers-reduced-motion` handling ([10_DESIGN.md §9](10_DESIGN.md#9-motion--animation)) | S | SETUP-02 |

### CI/CD (CI)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| CI-01 | GitHub Actions: typecheck, lint, format, unit tests on every PR | M | SETUP-04, SETUP-09 |
| CI-02 | Connect repo to Vercel: preview deploys per PR, production on `main` | S | SETUP-01 |
| CI-03 | Required status checks + branch protection on `main` | S | CI-01 |
| CI-04 | Supabase migration check in CI — full-history replay against an ephemeral version-pinned `supabase/postgres` container, plus a token-gated history consistency check skipped on fork PRs (ADR-13, [DECISIONS.md](DECISIONS.md)) | M | DB-01, CI-01 |
| CI-05 | `npm audit` gate for high-severity findings ([11_CONTRIBUTING.md §6](11_CONTRIBUTING.md#6-commit--pr-conventions)) | S | CI-01 |
| CI-06 | Playwright E2E job against preview deployments | M | SETUP-10, CI-02 |
| CI-07 | Per-environment env var setup: preview vs. production Supabase/OpenAI secrets ([09_SECURITY.md §6](09_SECURITY.md#6-secrets-management)). Includes provisioning the production Supabase project ([03_ARCHITECTURE.md §8](03_ARCHITECTURE.md#8-deployment-architecture)) and applying the reviewed migration history to it — no earlier task creates it (DB-01 provisioned development only) | M | CI-02 |
| CI-08 | axe accessibility check job on core routes | M | CI-06 |

### Observability foundation (OBS)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| OBS-01 | Structured logging module: request id + user id, content-free ([03_ARCHITECTURE.md §9](03_ARCHITECTURE.md#9-cross-cutting-concerns)) — in Phase 0 because latency-instrumentation tasks across all later phases depend on it | M | SETUP-06 |

---

## Phase 1 — Collect ([02_PRD.md §7](02_PRD.md#7-milestones), M1)

### Note service & data layer (NOTE)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| NOTE-01 | `NoteRepository`: typed CRUD queries incl. envelope+subtype transactional writes | M | DB-04, DB-16 |
| NOTE-02 | `NoteService.create` ([05_API.md §4](05_API.md#4-noteservice)) — FR-NOTE-1 | M | NOTE-01, SETUP-11 |
| NOTE-03 | `NoteService.get` with soft-delete visibility rules | S | NOTE-01 |
| NOTE-04 | `NoteService.update` — title dual-write invariant ([04_DATABASE.md §4.3](04_DATABASE.md#43-notes)); link reconciliation added in LINK-04 | M | NOTE-02 |
| NOTE-05 | `NoteService.delete` (soft) + `restore` — FR-NOTE-4, FR-KO-3 | S | NOTE-02 |
| NOTE-06 | `NoteService.list` with cursor pagination + folder filter | M | NOTE-01 |
| NOTE-07 | Web API route handlers for note CRUD (thin, per [11_CONTRIBUTING.md §2](11_CONTRIBUTING.md#2-folder-structure)) | S | NOTE-02..NOTE-06 |
| NOTE-08 | TanStack Query hooks: `useNoteQuery`, `useNotesList`, mutations with optimistic updates | M | NOTE-07, SHELL-07 |
| NOTE-09 | Note list view in sidebar (titles, last-edited, FR-NOTE-6) | M | NOTE-08, SHELL-03 |
| NOTE-10 | Note route + page: load note into editor view | M | NOTE-08, EDIT-01 |
| NOTE-11 | Delete-note confirmation dialog naming the note ([10_DESIGN.md §4](10_DESIGN.md#4-component-philosophy)) | S | NOTE-08 |
| NOTE-12 | Trash view: list soft-deleted notes, restore action | M | NOTE-05, SHELL-03 |
| NOTE-13 | Audit log writes on note create/update/delete (`actor='user'`, [04_DATABASE.md §8](04_DATABASE.md#8-audit-strategy)) | S | NOTE-02, DB-12 |
| NOTE-14 | Service tests: full [05_API.md §4](05_API.md#4-noteservice) contract incl. every declared error | M | NOTE-02..NOTE-06 |
| NOTE-15 | E2E: create → edit → delete → restore note flow | M | NOTE-10, NOTE-12, CI-06 |
| NOTE-16 | Note-open p95 < 200ms instrumentation hook ([02_PRD.md §6](02_PRD.md#6-non-functional-requirements)) | S | NOTE-10, OBS-01 |

### Editor (EDIT)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| EDIT-01 | Tiptap editor component: markdown-backed document model, live formatting base ([10_DESIGN.md §5](10_DESIGN.md#5-editor-ux-tiptap)) | L | SETUP-03 |
| EDIT-02 | Markdown serialization round-trip: editor state ↔ markdown, loss-free (FR-NOTE-2) | L | EDIT-01 |
| EDIT-03 | Round-trip property test suite: representative markdown corpus survives edit-save-reload | M | EDIT-02 |
| EDIT-04 | Heading/bold/italic/code live-format behavior with marker hiding | M | EDIT-01 |
| EDIT-05 | Lists (bullet, ordered, task-list rendering as markdown checkboxes) | M | EDIT-02 |
| EDIT-06 | Code blocks with syntax highlighting (theme-aware, [10_DESIGN.md §7](10_DESIGN.md#7-dark-mode)) | M | EDIT-02 |
| EDIT-07 | Blockquotes, horizontal rules, tables | M | EDIT-02 |
| EDIT-08 | Slash menu (`/` at line start) for block insertion ([10_DESIGN.md §5](10_DESIGN.md#5-editor-ux-tiptap)) | M | EDIT-04 |
| EDIT-09 | Floating selection toolbar (bold, italic, code, link) | S | EDIT-04 |
| EDIT-10 | Debounced autosave (~800ms) + save-on-blur, quiet saved indicator — FR-NOTE-5 | M | EDIT-02, NOTE-04 |
| EDIT-11 | Paste handling: markdown as markdown, rich text converted ([10_DESIGN.md §5](10_DESIGN.md#5-editor-ux-tiptap)) | M | EDIT-02 |
| EDIT-12 | Title field: editing, dual-write via `NoteService.update`, rename flow — FR-NOTE-3 | S | NOTE-04, EDIT-01 |
| EDIT-13 | Editor keyboard shortcuts (`⌘B`/`⌘I`, undo/redo) per platform conventions | S | EDIT-04, SHELL-05 |
| EDIT-14 | Reading-column layout (~68ch measure, 1.7 line-height) ([10_DESIGN.md §3.1](10_DESIGN.md#31-typography)) | S | EDIT-01 |
| EDIT-15 | Editor a11y pass: focus behavior, `aria` on menus/toolbars | M | EDIT-08, EDIT-09 |
| EDIT-16 | XSS hardening test: hostile markdown corpus renders sanitized ([09_SECURITY.md §9](09_SECURITY.md#9-threat-model), T4) | M | EDIT-02 |
| EDIT-17 | Editor component tests: formatting, slash menu, autosave triggers | M | EDIT-08, EDIT-10 |
| EDIT-18 | `⌘F` search within current note | M | EDIT-01, SHELL-05 |

### Folders (FOLD)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| FOLD-01 | `FolderRepository` + `FolderService.create`/`rename` ([05_API.md §5](05_API.md#5-folderservice)) | M | DB-05, DB-16 |
| FOLD-02 | `FolderService.move` with cycle detection (`CyclicMoveError`) — FR-FOLDER-1 | M | FOLD-01 |
| FOLD-03 | `FolderService.delete` with mandatory strategy param — FR-FOLDER-3 | M | FOLD-01, NOTE-05 |
| FOLD-04 | `FolderService.list` / `getTree` | S | FOLD-01 |
| FOLD-05 | Web API routes + query hooks for folders | S | FOLD-01..FOLD-04 |
| FOLD-06 | Folder tree UI in sidebar: expand/collapse, nesting | L | FOLD-05, SHELL-03 |
| FOLD-07 | Create/rename folder inline UI | M | FOLD-06 |
| FOLD-08 | Drag-and-drop: note into folder, folder into folder (`NoteService.update`/`FolderService.move`) — FR-FOLDER-2 | L | FOLD-06, NOTE-04 |
| FOLD-09 | Folder delete dialog with contents-strategy choice | M | FOLD-03, FOLD-06 |
| FOLD-10 | Keyboard navigation for folder tree | M | FOLD-06 |
| FOLD-11 | Service tests: cycle detection, delete strategies, move-preserves-identity | M | FOLD-02, FOLD-03 |
| FOLD-12 | E2E: create nested folders, move note, delete with relocation | M | FOLD-08, FOLD-09, CI-06 |
| FOLD-13 | Folder filter applied to note list view | S | FOLD-06, NOTE-09 |
| FOLD-14 | Empty-folder state | S | FOLD-06, SHELL-09 |

### Tags (TAG)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| TAG-01 | Tag repository + `NoteService.addTag`/`removeTag` with case-insensitive upsert — FR-TAG-2 | M | DB-06, NOTE-02 |
| TAG-02 | `SearchService.listTags` / `listByTag` ([05_API.md §6](05_API.md#6-searchservice)) — FR-TAG-3 | S | TAG-01 |
| TAG-03 | Web API routes + hooks for tag operations | S | TAG-01, TAG-02 |
| TAG-04 | Tag input component: suggest-as-you-type, create inline ([08_SEARCH.md §8](08_SEARCH.md#8-suggestions)) | M | TAG-03 |
| TAG-05 | Tag chips on note view; remove interaction | S | TAG-04, NOTE-10 |
| TAG-06 | Tag browsing view: all objects with a tag, across folders | M | TAG-02, SHELL-03 |
| TAG-07 | Tags section in sidebar | S | TAG-06 |
| TAG-08 | Service tests: dedupe, case-insensitivity, cross-type tagging (note + attachment) | S | TAG-01, ATT-03 |
| TAG-09 | E2E: tag a note inline, browse by tag | S | TAG-05, TAG-06, CI-06 |
| TAG-10 | Tag filter chips in note list | S | TAG-06, NOTE-09 |

### Attachments (ATT)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| ATT-01 | `AttachmentRepository` + storage client wrapper (owner-scoped paths) | M | DB-09, DB-16 |
| ATT-02 | `AttachmentService.upload` with pre-storage size enforcement — FR-ATTACH-3 | M | ATT-01, SETUP-11 |
| ATT-03 | `AttachmentService.get` (fresh 5-min signed URL per call, [09_SECURITY.md §4](09_SECURITY.md#4-authorization)) / `list` / `delete` / `restore` | M | ATT-01 |
| ATT-04 | Upload route handler (multipart/stream) + hooks | M | ATT-02 |
| ATT-05 | Editor: paste/drop image → upload → inline embed — FR-ATTACH-1, FR-ATTACH-4 | L | ATT-04, EDIT-11 |
| ATT-06 | Attachment upload button + file picker in editor | S | ATT-04, EDIT-08 |
| ATT-07 | Inline image rendering via short-lived signed URLs (refresh on expiry) | M | ATT-03, EDIT-01 |
| ATT-08 | Non-image attachment chip rendering (name, size, download) | S | ATT-07 |
| ATT-09 | Attachments list view | S | ATT-03, SHELL-03 |
| ATT-10 | Oversized-upload client-side rejection with clear error — FR-ATTACH-3 | S | ATT-04 |
| ATT-11 | Cross-user storage denial test (direct URL attempt, FR-ATTACH-2) | M | ATT-03, DB-14 |
| ATT-12 | E2E: upload image via paste, verify render + persistence | M | ATT-05, CI-06 |

### Daily notes (DAILY)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| DAILY-01 | `NoteService.getOrCreateDailyNote` upsert against unique constraint — FR-DAILY-1, FR-DAILY-3 | M | NOTE-02 |
| DAILY-02 | Daily note template applied on creation | S | DAILY-01 |
| DAILY-03 | `⌘D` + sidebar "Today" entry | S | DAILY-01, SHELL-05 |
| DAILY-04 | Date picker navigation to arbitrary date's daily note — FR-DAILY-2 | M | DAILY-01 |
| DAILY-05 | Prev/next day navigation on daily notes | S | DAILY-04 |
| DAILY-06 | Service tests: idempotent get-or-create, template application, uniqueness race | S | DAILY-01 |
| DAILY-07 | E2E: open today via shortcut, navigate to past date | S | DAILY-03, DAILY-04, CI-06 |
| DAILY-08 | Command palette entries for daily-note actions | S | DAILY-03, SHELL-04 |

---

## Phase 2 — Connect ([02_PRD.md §7](02_PRD.md#7-milestones), M2)

### Title autocomplete (SRCH — moved ahead of the rest of its area; LINK-06 depends on it)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| SRCH-05 | `pg_trgm` migration + index on `notes.title` ([08_SEARCH.md §6](08_SEARCH.md#6-wiki-links--autocomplete)) | S | DB-04 |
| SRCH-06 | `SearchService.suggestNoteTitles`: trigram match, sub-100ms — backs LINK-06 and `⌘P` | M | SRCH-05 |
| SRCH-08 | Autocomplete latency test (per-keystroke budget) | S | SRCH-06 |

### Wiki links (LINK)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| LINK-01 | Wiki-link markdown parser: extract `[[...]]` targets from note body (pure, exhaustively tested) | M | SETUP-06 |
| LINK-02 | Link resolution: title → stable object ID at save time — FR-LINK-2 | M | LINK-01, NOTE-01 |
| LINK-03 | `LinkRepository`: reconcile derived rows (diff-based insert/delete) | M | DB-07, LINK-02 |
| LINK-04 | Wire reconciliation into `NoteService.update` same-transaction ([05_API.md §4](05_API.md#4-noteservice)) — FR-LINK-6 | M | LINK-03, NOTE-04 |
| LINK-05 | Tiptap wiki-link mark: render `[[link]]` as navigable, ID-resolved element | L | EDIT-02, LINK-02 |
| LINK-06 | `[[` autocomplete popup backed by `suggestNoteTitles` — FR-LINK-3 | L | LINK-05, SRCH-06 |
| LINK-07 | Unresolved-link rendering (dashed) + create-on-click — FR-LINK-4 | M | LINK-05, NOTE-02 |
| LINK-08 | Rename propagation: rewrite `[[old title]]` → `[[new title]]` in linking notes via the links table, same transaction ([05_API.md §4](05_API.md#4-noteservice)) — FR-NOTE-3 | M | LINK-02, EDIT-12 |
| LINK-09 | Link navigation: click → open target note | S | LINK-05, NOTE-10 |
| LINK-10 | Reconciliation tests: add/remove/duplicate links, dedupe to single edge ([04_DATABASE.md §4.8](04_DATABASE.md#48-links)) | M | LINK-04 |
| LINK-11 | E2E: PRD flow "create a note and link it" ([02_PRD.md §5](02_PRD.md#5-acceptance-criteria--key-flows)) | M | LINK-06, BACK-03, CI-06 |
| LINK-12 | E2E: PRD flow "rename a linked note" | M | LINK-08, CI-06 |

### Backlinks (BACK)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| BACK-01 | `NoteService.getBacklinks` (indexed `target_object_id` query, [08_SEARCH.md §5](08_SEARCH.md#5-backlinks)) — FR-LINK-5 | S | LINK-04 |
| BACK-02 | Backlinks API route + hook with invalidation on note save | S | BACK-01 |
| BACK-03 | Backlinks panel in right sidebar (`⌘E`) with source-note context snippets | M | BACK-02, SHELL-02 |
| BACK-04 | Backlink click → navigate to linking note | S | BACK-03 |
| BACK-05 | Empty backlinks state | S | BACK-03, SHELL-09 |
| BACK-06 | Freshness test: backlink appears without manual refresh after linking note saves — FR-LINK-6 | M | BACK-02, LINK-04 |

### Graph view (GRAPH)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| GRAPH-01 | `GraphService.getGraph` (nodes + edges, optional tag/folder filter) ([05_API.md §7](05_API.md#7-graphservice)) | M | DB-07, LINK-04 |
| GRAPH-02 | `GraphService.getLocalGraph` (note + neighbors, depth param) — FR-GRAPH-4 | M | GRAPH-01 |
| GRAPH-03 | Graph API routes + hooks | S | GRAPH-01, GRAPH-02 |
| GRAPH-04 | React Flow canvas with force-directed layout ([10_DESIGN.md §10](10_DESIGN.md#10-graph-view-ux-react-flow)) — FR-GRAPH-1 | L | GRAPH-03 |
| GRAPH-05 | Node click → open note — FR-GRAPH-2 | S | GRAPH-04 |
| GRAPH-06 | Hover: highlight connections, fade rest | M | GRAPH-04 |
| GRAPH-07 | Zoom/pan controls + touch support | S | GRAPH-04 |
| GRAPH-08 | Visual encoding: node size by degree, current-note highlight, orphan muting | M | GRAPH-04 |
| GRAPH-09 | Tag/folder filter chips over canvas — FR-GRAPH-3 | M | GRAPH-04, TAG-02 |
| GRAPH-10 | Local-graph mode from note view + global toggle | M | GRAPH-02, GRAPH-04 |
| GRAPH-11 | Synchronized focusable node list for accessibility ([10_DESIGN.md §10](10_DESIGN.md#10-graph-view-ux-react-flow)) | M | GRAPH-04 |
| GRAPH-12 | `⇧⌘G` shortcut + graph route | S | GRAPH-04, SHELL-05 |
| GRAPH-13 | Performance test: 2,000-node interactivity NFR ([02_PRD.md §6](02_PRD.md#6-non-functional-requirements)) | M | GRAPH-08 |
| GRAPH-14 | Theme-aware graph tokens (both modes, [10_DESIGN.md §7](10_DESIGN.md#7-dark-mode)) | S | GRAPH-04 |
| GRAPH-15 | Graph empty/sparse state | S | GRAPH-04, SHELL-09 |
| GRAPH-16 | E2E: open graph, click node, apply filter | M | GRAPH-09, CI-06 |
| GRAPH-17 | Layout caching so re-opening the graph doesn't re-simulate from scratch | M | GRAPH-04 |
| GRAPH-18 | Graph service tests: filters, local depth, deleted-note exclusion | S | GRAPH-01, GRAPH-02 |

---

## Phase 3 — Discover ([02_PRD.md §7](02_PRD.md#7-milestones), M3)

### Full-text search (FTS)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| FTS-01 | Full-text query builder: `websearch_to_tsquery` semantics + `ts_rank_cd` ([08_SEARCH.md §2](08_SEARCH.md#2-full-text-search)) | M | DB-04 |
| FTS-02 | `ts_headline` snippet generation with term highlighting — FR-SEARCH-2 | M | FTS-01 |
| FTS-03 | `SearchService.search` v1: full-text only, paginated ([05_API.md §6](05_API.md#6-searchservice)) — FR-SEARCH-1 | M | FTS-01, FTS-02 |
| FTS-04 | Search API route + hook | S | FTS-03 |
| FTS-05 | Search results UI: list with highlighted snippets, keyboard navigation | M | FTS-04, SHELL-02 |
| FTS-06 | `⇧⌘F` global search + command palette integration ([10_DESIGN.md §8](10_DESIGN.md#8-keyboard-shortcuts)) | M | FTS-05, SHELL-04 |
| FTS-07 | Soft-deleted exclusion + owner-scoping tests — FR-SEARCH-3 | S | FTS-03, DB-14 |
| FTS-08 | Latency instrumentation: p95 < 300ms budget ([02_PRD.md §6](02_PRD.md#6-non-functional-requirements)) — FR-SEARCH-4 | S | FTS-03, OBS-01 |
| FTS-09 | Search empty/no-results states | S | FTS-05, SHELL-09 |
| FTS-10 | Service tests: phrase queries, exclusions, pagination stability | M | FTS-03 |

### Embedding pipeline (EMB)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| EMB-01 | OpenAI client wrapper in `shared/lib` (typed, mockable, no direct SDK use in features) | S | SETUP-14 |
| EMB-02 | Chunking module per [07_AI.md §4](07_AI.md#4-chunking): markdown-aware splits, overlap, floor merging (pure, exhaustively tested) | L | SETUP-06 |
| EMB-03 | `EmbeddingService.embedObject`: chunk → embed → upsert rows ([05_API.md §8](05_API.md#8-embeddingservice)) | M | EMB-01, EMB-02, DB-08 |
| EMB-04 | `EmbeddingService.deleteEmbeddings` / `reembed` / `getStatus` | S | EMB-03 |
| EMB-05 | Webhook endpoint route handler with shared-secret auth ([09_SECURITY.md §3](09_SECURITY.md#3-authentication), T6) | M | EMB-03 |
| EMB-06 | Supabase Database Webhook config on note insert/update ([03_ARCHITECTURE.md §6.4](03_ARCHITECTURE.md#64-embedding-pipeline)) — FR-SEM-3 | M | EMB-05 |
| EMB-07 | Concurrency cap (5 simultaneous OpenAI calls) on the endpoint ([09_SECURITY.md §7](09_SECURITY.md#7-rate-limiting)) | M | EMB-05 |
| EMB-08 | Embedding deletion on note soft-delete/purge path | S | EMB-04, DB-15 |
| EMB-09 | Failure handling: retry-once, mark `failed` status, structured log | M | EMB-05 |
| EMB-10 | Embedding lag metric (save → embedded) ([02_PRD.md §8](02_PRD.md#8-success-metrics)) | S | EMB-06, OBS-01 |
| EMB-11 | "Indexing…" UI state from `getStatus` ([05_API.md §8](05_API.md#8-embeddingservice)) | S | EMB-04, FTS-05 |
| EMB-12 | Pipeline integration test: save → webhook → rows exist (mocked OpenAI) | M | EMB-06 |
| EMB-13 | Forged-payload rejection test (T6: nonexistent/other-user note does nothing) | S | EMB-05 |
| EMB-14 | Chunking unit test corpus: short notes single-chunk, long notes boundary/overlap correctness | M | EMB-02 |

### Semantic + hybrid search (SEM)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| SEM-01 | Query embedding on-the-fly (same model as content, [08_SEARCH.md §3](08_SEARCH.md#3-semantic-search-pgvector)) | S | EMB-01 |
| SEM-02 | `SearchService.semanticSearch`: cosine top-K over HNSW — FR-SEM-1 | M | SEM-01, EMB-03 |
| SEM-03 | RRF hybrid ranking module (k=60, pure, tested against [08_SEARCH.md §4](08_SEARCH.md#4-hybrid-ranking)'s worked example) | M | SETUP-06 |
| SEM-04 | Upgrade `SearchService.search` to hybrid: concurrent branches + RRF merge — FR-SEM-2 | M | FTS-03, SEM-02, SEM-03 |
| SEM-05 | Match-type-aware snippets: `chunk_text` for semantic-only matches ([08_SEARCH.md §7](08_SEARCH.md#7-snippets)) | M | SEM-04 |
| SEM-06 | Graceful degradation: semantic branch failure → full-text-only results ([08_SEARCH.md §9](08_SEARCH.md#9-performance-considerations)) | M | SEM-04 |
| SEM-07 | Hybrid latency instrumentation: p95 < 800ms budget | S | SEM-04, OBS-01 |
| SEM-08 | E2E: PRD flow "hybrid search" — no-keyword-overlap match surfaces ([02_PRD.md §5](02_PRD.md#5-acceptance-criteria--key-flows)) | M | SEM-04, CI-06 |
| SEM-09 | Ranking regression suite: seeded corpus, stable expected orderings | M | SEM-04 |

### Search UX (SRCH)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| SRCH-01 | Unified search UI: single hybrid-ranked list with `matchType` rendering | M | SEM-05, FTS-05 |
| SRCH-02 | Command palette search mode: results inline in `⌘K` | M | SRCH-01, SHELL-04 |
| SRCH-03 | Result → note navigation with match highlighted in editor | M | SRCH-01, EDIT-18 |
| SRCH-04 | Recent searches (local, client-side only) | S | SRCH-01 |
| SRCH-07 | `⌘P` quick-open | S | SRCH-06 (Phase 2), SHELL-05 |

---

## Phase 4 — Collaborate ([02_PRD.md §7](02_PRD.md#7-milestones), M4)

### AI chat foundation (AICH)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| AICH-01 | Conversation repository: `chat_conversations`/`chat_messages` CRUD | M | DB-10, DB-16 |
| AICH-02 | Prompt template module: 4-part assembly with citation instruction ([07_AI.md §6](07_AI.md#6-prompt-templates)) | M | SETUP-06 |
| AICH-03 | Token budgeting module: per-part budgets, trim orders ([07_AI.md §7](07_AI.md#7-token-budgeting)) (pure, tested) | M | AICH-02 |
| AICH-04 | `AIService.streamChat` core: OpenAI streaming call → `ChatStreamEvent` iterator ([05_API.md §10](05_API.md#10-aiservice)) | L | EMB-01, AICH-01..03 |
| AICH-05 | Citation extraction from model output → `citation` events (FR-AI-3) | M | AICH-04 |
| AICH-06 | SSE route handler bridging the event iterator ([03_ARCHITECTURE.md §11](03_ARCHITECTURE.md#11-architecture-decision-records), ADR-6) — FR-AI-4 | M | AICH-04 |
| AICH-07 | Mid-stream failure handling: terminal error event + partial message persistence ([07_AI.md §8](07_AI.md#8-streaming)) | M | AICH-06 |
| AICH-08 | Per-user rate limit: 20/hr token bucket in Postgres ([09_SECURITY.md §7](09_SECURITY.md#7-rate-limiting)) | M | AICH-04 |
| AICH-09 | `getConversation` / `listConversations` + routes | S | AICH-01 |
| AICH-10 | Note-scope chat: note body as context, scope validation ([05_API.md §10](05_API.md#10-aiservice)) — FR-AI-1 | M | AICH-04 |
| AICH-11 | Chat UI panel: streaming render, `aria-live` region ([10_DESIGN.md §6](10_DESIGN.md#6-accessibility-wcag-21-aa)) | L | AICH-06, SHELL-02 |
| AICH-12 | Citation chips → navigate to source note | M | AICH-11, AICH-05 |
| AICH-13 | Conversation history UI (list, resume, new) | M | AICH-09, AICH-11 |
| AICH-14 | Service tests: scope validation, budget trimming, rate limit, mocked streaming | L | AICH-08, AICH-10 |
| AICH-15 | Structural FR-AI-5 test: `AIService` writes only chat tables (mutation audit) | M | AICH-04 |
| AICH-16 | First-token latency instrumentation (< 1.5s p95 budget) | S | AICH-06, OBS-01 |

### Vault chat (VCH)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| VCH-01 | RAG retrieval step: `semanticSearch` over-fetch → per-note dedupe ([07_AI.md §5](07_AI.md#5-context-assembly-rag)) | M | SEM-02, AICH-04 |
| VCH-02 | Vault-scope context assembly within token budget — FR-AI-2 | M | VCH-01, AICH-03 |
| VCH-03 | Vault chat entry point (global, not note-scoped) in UI | M | VCH-02, AICH-11 |
| VCH-04 | Multi-note citation correctness: answers combining two notes cite both | M | VCH-02, AICH-05 |
| VCH-05 | E2E: PRD flow "vault chat with citations" ([02_PRD.md §5](02_PRD.md#5-acceptance-criteria--key-flows)) | M | VCH-04, CI-06 |
| VCH-06 | Retrieval quality harness: seeded vault, assertion on retrieved context (mocked LLM) | M | VCH-02 |
| VCH-07 | No-relevant-context behavior: honest "nothing found" instead of hallucinated answer | M | VCH-02 |
| VCH-08 | Vault chat in command palette (`⌘K` → ask) | S | VCH-03, SHELL-04 |

### MCP server (MCP)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| MCP-01 | MCP server scaffold: streamable HTTP route handler, initialize handshake ([06_MCP.md §3](06_MCP.md#3-transport--connection)) | L | SETUP-06 |
| MCP-02 | Bearer auth: hash lookup → `owner_id`, revocation check per request ([06_MCP.md §4](06_MCP.md#4-authentication)) — FR-MCP-1 | M | MCP-01, DB-11 |
| MCP-03 | RLS-scoped Supabase context for the resolved user (no service-role, [09_SECURITY.md §5](09_SECURITY.md#5-service-role-key-usage)) — FR-MCP-4 | M | MCP-02, DB-16 |
| MCP-04 | Error translation: taxonomy → MCP tool errors ([05_API.md §3](05_API.md#3-error-taxonomy)) | S | MCP-01, SETUP-11 |
| MCP-05 | Tool: `search_knowledge` ([06_MCP.md §6](06_MCP.md#6-tools)) | S | MCP-03, SEM-04 |
| MCP-06 | Tools: `get_note`, `list_notes` | S | MCP-03, NOTE-03, NOTE-06 |
| MCP-07 | Tools: `create_note`, `update_note`, `delete_note` — FR-MCP-2 | M | MCP-03, NOTE-02, NOTE-04, NOTE-05 |
| MCP-08 | Tools: `get_backlinks`, `get_daily_note` | S | MCP-03, BACK-01, DAILY-01 |
| MCP-09 | Tools: `create_folder`, `list_folders` | S | MCP-03, FOLD-01, FOLD-04 |
| MCP-10 | Tools: `list_tags`, `tag_note` | S | MCP-03, TAG-01, TAG-02 |
| MCP-11 | Tools: `list_attachments`, `get_attachment` (metadata + signed URL) | S | MCP-03, ATT-03 |
| MCP-12 | Resources: `secondbrain://notes/{id}`, `secondbrain://graph` ([06_MCP.md §7](06_MCP.md#7-resources)) | M | MCP-06, GRAPH-01 |
| MCP-13 | Per-credential rate limit: 120/hr ([09_SECURITY.md §7](09_SECURITY.md#7-rate-limiting)) | M | MCP-02, AICH-08 |
| MCP-14 | Audit log writes with `actor='ai'` on every mutating tool call ([06_MCP.md §9](06_MCP.md#9-security-considerations)) | S | MCP-07, DB-12 |
| MCP-15 | `last_used_at` update on authenticated requests | S | MCP-02 |
| MCP-16 | Tool schema definitions + descriptions per [06_MCP.md §8](06_MCP.md#8-schemas--sample-requestsresponses) patterns | M | MCP-05..MCP-11 |
| MCP-17 | Cross-user denial integration tests over MCP (FR-MCP-4 explicit) | M | MCP-07, DB-14 |
| MCP-18 | Parity test: MCP `create_note` ≡ web-created note state (FR-MCP-2, [02_PRD.md §5](02_PRD.md#5-acceptance-criteria--key-flows)) | M | MCP-07 |
| MCP-19 | Manual verification doc + config samples: Claude Desktop, Cursor, one more client — FR-MCP-3 | M | MCP-16 |
| MCP-20 | Protocol conformance test with a reference MCP client library | M | MCP-16 |

### MCP credentials UI (CRED)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| CRED-01 | `UserService.createMcpCredential` (hash-only persist, one-time raw return) ([05_API.md §11](05_API.md#11-userservice)) | M | DB-11, AUTH-09 |
| CRED-02 | `listMcpCredentials` / `revokeMcpCredential` | S | CRED-01 |
| CRED-03 | Credentials settings page: create with name, one-time token display + copy | M | CRED-01, AUTH-10 |
| CRED-04 | Credential list with `last_used_at` + revoke action ([09_SECURITY.md §9](09_SECURITY.md#9-threat-model), T2) | M | CRED-02, CRED-03 |
| CRED-05 | Revocation immediacy test: revoked token fails next MCP request | S | CRED-02, MCP-02 |
| CRED-06 | Setup instructions in-app (client config snippets) | S | CRED-03, MCP-19 |
| CRED-07 | E2E: PRD flow "external MCP client read/write" via scripted MCP client | L | MCP-18, CRED-01, CI-06 |
| CRED-08 | Never-log-raw-token verification (log audit test) | S | CRED-01 |

---

## Phase 5 — Launch Readiness ([02_PRD.md §7](02_PRD.md#7-milestones), M5)

### Performance (PERF)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| PERF-01 | Seed script: realistic 10,000-note test graph ([02_PRD.md §6](02_PRD.md#6-non-functional-requirements)) | M | NOTE-02, LINK-04 |
| PERF-02 | Load-test note-open budget (p95 < 200ms) at 10k scale; fix regressions | M | PERF-01, NOTE-16 |
| PERF-03 | Load-test full-text budget (p95 < 300ms) at 10k scale | M | PERF-01, FTS-08 |
| PERF-04 | Load-test hybrid budget (p95 < 800ms) at 10k scale; HNSW recall check | M | PERF-01, SEM-07 |
| PERF-05 | Graph interactivity at 2k nodes verification ([10_DESIGN.md §10](10_DESIGN.md#10-graph-view-ux-react-flow)) | M | PERF-01, GRAPH-13 |
| PERF-06 | Bundle audit: route-level code splitting, editor/graph lazy loading | M | GRAPH-04, EDIT-01 |
| PERF-07 | Supabase connection pooling verification under concurrent search load ([08_SEARCH.md §9](08_SEARCH.md#9-performance-considerations)) | S | PERF-03 |
| PERF-08 | TanStack Query cache tuning: staleness/invalidation review across features | M | SHELL-07 |
| PERF-09 | Embedding pipeline throughput test: bulk import doesn't breach lag budget | M | EMB-07, PERF-01 |
| PERF-10 | Core Web Vitals pass on key routes (LCP, INP, CLS) | M | PERF-06 |

### Security hardening (SEC)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| SEC-01 | Security headers middleware: full [09_SECURITY.md §8](09_SECURITY.md#8-security-headers) set incl. CSP | M | SETUP-01 |
| SEC-02 | CSP verification: app functions fully under the restrictive policy | M | SEC-01, AICH-11, GRAPH-04 |
| SEC-03 | Full threat-model review: T1–T9 mitigations verified against implementation ([09_SECURITY.md §9](09_SECURITY.md#9-threat-model)) | L | all Phase 4 |
| SEC-04 | Service-role usage audit against the contexts enumerated in [09_SECURITY.md §5](09_SECURITY.md#5-service-role-key-usage), mechanically greppable (incl. verifying test-harness code is not importable from `src/`) | S | EMB-05, DB-15 |
| SEC-05 | Rate-limit verification: all four §7 policies trip correctly and return 429/MCP errors | M | AICH-08, MCP-13, EMB-07 |
| SEC-06 | Log audit: no tokens, content, or signed URLs in any log path ([09_SECURITY.md §6](09_SECURITY.md#6-secrets-management)) | M | OBS-02 |
| SEC-07 | Dependency audit + pinning review | S | CI-05 |
| SEC-08 | Secrets rotation drill: rotate all three secrets in preview, verify recovery | S | CI-07 |
| SEC-09 | OpenAI spend alerting configured ([09_SECURITY.md §9](09_SECURITY.md#9-threat-model), T7) | S | EMB-01 |
| SEC-10 | Penetration-test checklist run: auth flows, IDOR attempts, storage URL probing | L | SEC-03 |

### Accessibility (A11Y)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| A11Y-01 | Keyboard-only walkthrough: all six PRD flows completable ([10_DESIGN.md §6](10_DESIGN.md#6-accessibility-wcag-21-aa)) | M | all Phase 4 |
| A11Y-02 | Screen-reader pass: editor, chat streaming, search, graph list alternative | L | A11Y-01 |
| A11Y-03 | Contrast verification of all token pairs in both themes | S | SETUP-13 |
| A11Y-04 | Fix queue from axe CI findings across routes | M | CI-08 |
| A11Y-05 | Focus management audit: dialogs, palette, panel toggles, route changes | M | A11Y-01 |
| A11Y-06 | Reduced-motion verification across all animated surfaces | S | SHELL-10 |

### Export & data ownership (EXP)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| EXP-01 | Vault export service: full graph → markdown files + attachments as zip — FR-KO-6 ([09_SECURITY.md §11](09_SECURITY.md#11-privacy--data-ownership)) | L | NOTE-06, ATT-03, FOLD-04 |
| EXP-02 | Export preserves folder structure and wiki links as `[[title]]` syntax | M | EXP-01 |
| EXP-03 | Export UI in settings + async generation with download link | M | EXP-01 |
| EXP-04 | Export round-trip verification test (content fidelity) | M | EXP-02 |

### Observability & launch (OBS)

| ID | Task | Cx | Depends on |
|---|---|---|---|
| OBS-02 | Request logging across Web API, MCP, webhook endpoints | M | OBS-01 (Phase 0) |
| OBS-03 | SLI dashboards: the [02_PRD.md §8](02_PRD.md#8-success-metrics) engineering metrics | M | OBS-02 |
| OBS-04 | Uptime monitoring + alerting (99.5% target) | S | CI-02 |
| OBS-05 | Error tracking wiring (unhandled errors surfaced with request context) | M | OBS-01 |
| OBS-06 | Product metric events: activation, retention, AI engagement, MCP adoption (content-free) | M | OBS-01 |
| OBS-07 | Runbook: incident response, secret rotation, purge-job failure, embedding backlog | M | SEC-08, EMB-09 |
| OBS-08 | Full six-flow E2E suite green against production config ([02_PRD.md §5](02_PRD.md#5-acceptance-criteria--key-flows)) | M | all E2E tasks |
| OBS-09 | Beta launch checklist: NFR budgets verified in production monitoring, sign-offs per [02_PRD.md §7](02_PRD.md#7-milestones) M5 exit | M | OBS-03, SEC-03, A11Y-02 |
| OBS-10 | Public README + project landing documentation | S | OBS-09 |

---

## Post-MVP Backlog Seeds

Deliberately *not* decomposed into tasks — each requires its own design pass before implementation, grounded in [02_PRD.md §9](02_PRD.md#9-future-roadmap) or the post-MVP notes in [09_SECURITY.md §12](09_SECURITY.md#12-post-mvp-security-roadmap) and [10_DESIGN.md §11](10_DESIGN.md#11-responsive-behavior). Listed to make the boundary explicit: an agent finding these "missing" from the backlog above should treat that as intentional.

Version history · OCR/PDF object type · GitHub/Jira/Confluence/Slack/Drive/email/calendar connectors · voice notes · tasks · canvas · whiteboard · self-organizing knowledge (propose/confirm tooling) · shared graphs · MFA · scoped MCP credentials · mobile PWA.

## Related Documents

- [02_PRD.md §4–7](02_PRD.md#4-functional-requirements) — the requirements and milestones every task traces to.
- [11_CONTRIBUTING.md](11_CONTRIBUTING.md) — the rules every task is implemented under, including the agent-specific rules in §8.
- Documents 03–10 — the design decisions individual tasks reference inline.
