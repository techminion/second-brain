# 11. Contributing

> Part of the [Documentation Index](DOCUMENT_INDEX.md). The engineering rulebook for anyone — human or AI agent — writing code for Second Brain. Enforces the architecture rules from [03_ARCHITECTURE.md §5](03_ARCHITECTURE.md#5-layering--code-organization-principles), the schema discipline from [04_DATABASE.md §11](04_DATABASE.md#11-migration-strategy), and the token/accessibility rules from [10_DESIGN.md](10_DESIGN.md). [12_TASKS.md](12_TASKS.md) assumes every task is implemented under these rules.

## 1. Purpose & Scope

This document exists so that code written by many contributors — most of them AI coding agents working from [12_TASKS.md](12_TASKS.md) — reads as if one careful engineer wrote it. Every rule here is enforceable: either mechanically (lint, CI) or by PR review against an explicit statement in this document set. A rule that can't be checked isn't a rule, it's a wish — so each section notes *how* it's enforced.

## 2. Folder Structure

Feature-first, per [03_ARCHITECTURE.md §5.1](03_ARCHITECTURE.md#5-layering--code-organization-principles):

```
src/
  app/                     # Next.js App Router: routes, layouts, route handlers only
    api/                   #   Web API route handlers (thin — parse, call service, respond)
    (app)/                 #   Authenticated app shell routes
  features/
    notes/                 # One folder per feature, self-contained
      components/          #   UI for this feature only
      hooks/               #   TanStack Query hooks for this feature
      note-service.ts      #   The service (05_API.md contract)
      note-repository.ts   #   The repository (only file issuing queries for these tables)
      types.ts
    folders/
    search/
    graph/
    ai/
    attachments/
    auth/
    mcp/                   # MCP server: tool definitions, auth resolution (06_MCP.md)
  shared/
    ui/                    # shadcn/ui primitives + genuinely cross-feature components only
    lib/                   # Supabase clients, error taxonomy, utilities
    types/                 # Knowledge Object envelope types, Paginated<T>, etc.
supabase/
  migrations/              # Versioned SQL migrations (04_DATABASE.md §11)
```

**Rules:**
- A file used by exactly one feature lives in that feature's folder. `shared/` requires two or more real consumers — moving something there speculatively is a review rejection.
- Features may import from `shared/` and from another feature's **service** (per the composition rules in [05_API.md §12](05_API.md#12-cross-service-interaction-rules)) — never from another feature's components, hooks, or repository. Enforced by ESLint import-boundary rules.
- Nothing under `app/` contains logic beyond parse → call service → shape response. Route handler files exceeding ~50 lines are a review flag.

## 3. Coding Standards

| Rule | Enforcement |
|---|---|
| TypeScript strict mode; no `any` at service boundaries ([03_ARCHITECTURE.md §2](03_ARCHITECTURE.md#2-architectural-style--constraints)); `unknown` + narrowing where typing is genuinely dynamic | `tsc --noEmit` in CI; ESLint `no-explicit-any` |
| All service methods `async`, throwing only taxonomy errors ([05_API.md §3](05_API.md#3-error-taxonomy)) | Review against the taxonomy; new error types require updating 05_API.md first |
| No hardcoded design values — Tailwind tokens only, no arbitrary values (`p-[13px]`) | ESLint/Tailwind plugin ([10_DESIGN.md §3.2](10_DESIGN.md#32-spacing--layout)) |
| No secret ever prefixed `NEXT_PUBLIC_`; service-role key imported only in the server contexts enumerated in [09_SECURITY.md §5](09_SECURITY.md#5-service-role-key-usage) | Lint rule + review |
| Comments state constraints the code can't (`// RLS returns zero rows here, not an error`), never narrate what the next line does | Review |
| Formatting is Prettier's; imports sorted mechanically | CI — formatting is never a review topic |

## 4. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | `kebab-case.ts` / `.tsx` | `note-service.ts`, `backlinks-panel.tsx` |
| React components | `PascalCase` | `BacklinksPanel` |
| Hooks | `use` + domain | `useNoteQuery`, `useDailyNote` |
| Services / repositories | `<Domain>Service` / `<Domain>Repository`, matching [05_API.md §1](05_API.md#1-purpose--scope) exactly | `NoteService` |
| Database | Per [04_DATABASE.md §2](04_DATABASE.md#2-naming-conventions) — plural snake_case tables, `_at` timestamps, `<ref>_id` FKs | `knowledge_objects.owner_id` |
| MCP tools | `<verb>_<noun>` snake_case, per [06_MCP.md §5](06_MCP.md#5-tool-naming-convention) | `search_knowledge` |
| Branches | `feat/`, `fix/`, `docs/`, `chore/` + short kebab description | `feat/backlinks-panel` |

## 5. Testing Strategy

| Layer | What's tested | Tooling |
|---|---|---|
| Service layer (the bulk of tests) | Every public method's contract from [05_API.md](05_API.md): happy path, each declared error, edge cases (empty body, cyclic folder move, duplicate daily note). Repositories mocked at their seam ([03_ARCHITECTURE.md §5.3](03_ARCHITECTURE.md#5-layering--code-organization-principles)). | Vitest |
| Repository / RLS integration | Queries run against the shared Supabase Cloud development project. **Mandatory for every table: a test that user B cannot read or write user A's rows** — the T1 coverage promised in [09_SECURITY.md §9](09_SECURITY.md#9-threat-model). | Vitest + Supabase Cloud development project |
| Pure logic | Wiki-link parsing/reconciliation, chunking ([07_AI.md §4](07_AI.md#4-chunking)), RRF ranking math ([08_SEARCH.md §4](08_SEARCH.md#4-hybrid-ranking)) — exhaustive unit tests; these are the highest bug-density spots. | Vitest |
| Components | Render + interaction for components with behavior (editor link autocomplete, folder-delete dialog). Presentational components are not snapshot-tested — snapshots rot. | Testing Library |
| End-to-end | The six PRD flows from [02_PRD.md §5](02_PRD.md#5-acceptance-criteria--key-flows), verbatim, against a preview deployment. | Playwright |
| Accessibility | axe checks on every route; keyboard-only walkthrough of core flows per release ([10_DESIGN.md §6](10_DESIGN.md#6-accessibility-wcag-21-aa)). | axe + Playwright |

**Norms:** tests colocate with the code (`note-service.test.ts` beside `note-service.ts`). A bug fix lands with a test reproducing the bug. No PR reduces coverage of the service layer. AI calls are always mocked in tests — no test spends OpenAI tokens or depends on model output stability.

## 6. Commit & PR Conventions

**Commits:** Conventional Commits — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, optional scope (`feat(notes): reconcile links on save`). Imperative mood, no trailing period. Squash-merge is the default, so PR titles follow the same convention — they become the history.

**Every PR must:**
1. Reference the task ID(s) from [12_TASKS.md](12_TASKS.md) it implements, or state why it's out-of-backlog work.
2. Pass CI: typecheck, lint, format check, unit/integration tests, build.
3. Include tests per §5 for any behavior change.
4. Ship any migration in the same PR as the code depending on it, respecting the additive-first deploy ordering ([04_DATABASE.md §11](04_DATABASE.md#11-migration-strategy)).
5. Stay small — one task, or a few tightly related tasks. A PR touching more than one feature folder plus `shared/` is probably two PRs.
6. Describe *what* and *why* in the body; reviewers shouldn't reverse-engineer intent from the diff.

**Dependencies:** adding a runtime dependency requires justification in the PR body (what it does, why building it is worse, its footprint). `npm audit` runs in CI; high-severity findings block merge ([09_SECURITY.md §10](09_SECURITY.md#10-owasp-top-10-mapping), A06).

## 7. Architecture Rules (Load-Bearing)

The non-negotiables from earlier documents, restated as review-time checks. Violating any of these is a rejected PR regardless of whether the feature works:

1. **No business logic outside the service layer** — not in components, not in route handlers, not in MCP tool definitions ([03_ARCHITECTURE.md §5.2](03_ARCHITECTURE.md#5-layering--code-organization-principles)).
2. **Only repositories issue queries**, and only for tables their feature owns per the ownership table in [05_API.md §1](05_API.md#1-purpose--scope).
3. **`userId` comes from the verified session/token, never from request input** ([05_API.md §2](05_API.md#2-conventions)).
4. **Every new table ships with RLS enabled + policy + the cross-user test** in the same PR ([04_DATABASE.md §7](04_DATABASE.md#7-row-level-security-rls-policies)).
5. **No new infrastructure.** Anything on the excluded list ([03_ARCHITECTURE.md §12](03_ARCHITECTURE.md#12-explicitly-excluded-infrastructure)) requires a documented ADR *and* human sign-off — an agent may never introduce it unilaterally.
6. **The MCP server calls services, never repositories or the DB** ([06_MCP.md §1](06_MCP.md#1-purpose--scope)).
7. **`AIService` writes nothing but chat history** (FR-AI-5) — any feature that wants AI to mutate the graph is post-MVP and requires the confirm-gated pattern from [01_PRODUCT.md §8](01_PRODUCT.md#8-self-organizing-knowledge).
8. **New env vars/secrets follow [09_SECURITY.md §6](09_SECURITY.md#6-secrets-management)** and are added to the environment documentation in the same PR.

## 8. Rules for AI Coding Agents

Agents implementing [12_TASKS.md](12_TASKS.md) tasks operate under everything above, plus:

1. **The docs are the spec.** When code and this document set disagree, the docs win. When a task seems to require violating a doc, stop and flag it — do not "fix" the docs unilaterally and do not silently deviate.
2. **Stay inside the task.** Implement the task's scope; no drive-by refactors, no speculative features, no "while I was here" changes. Adjacent improvements become proposed new tasks, not PR padding.
3. **Never invent product decisions.** If a task is ambiguous (field name, error message copy, edge-case behavior) and the docs don't answer it, ask — an invented decision that ships is far more expensive than a question.
4. **Declare uncertainty honestly.** A PR description must state what was *not* tested or verified. "Tests pass" when tests were skipped is the single fastest way to destroy trust in agent-written code.
5. **Respect dependency order.** Do not start a task whose dependencies ([12_TASKS.md](12_TASKS.md)) aren't merged. If a dependency turns out to be missing from the graph, flag it rather than implementing it inline.
6. **No new dependencies without justification** per §6 — agents especially: do not add a library to avoid writing twenty lines.

## 9. What Contributors Must Never Do

The hard floor. Each item links to why:

| Never | Why |
|---|---|
| Disable, weaken, or "temporarily" bypass an RLS policy | The enforcement floor ([09_SECURITY.md §2](09_SECURITY.md#2-security-principles)); there is no temporary. |
| Use the service-role key outside the enumerated contexts | [09_SECURITY.md §5](09_SECURITY.md#5-service-role-key-usage) is exhaustive by design. |
| Commit a secret, or log tokens/note content/signed URLs | [09_SECURITY.md §6](09_SECURITY.md#6-secrets-management); note content in logs also violates the privacy commitments in §11 there. |
| Introduce Docker, Redis, Kafka, Kubernetes, RabbitMQ, a microservice, or a second component library | [03_ARCHITECTURE.md §12](03_ARCHITECTURE.md#12-explicitly-excluded-infrastructure), [10_DESIGN.md §2.4](10_DESIGN.md#2-design-principles). |
| Write to a table owned by another feature's service | [05_API.md §12](05_API.md#12-cross-service-interaction-rules), rule 4. |
| Make `NoteService` (or anything) call the embedding pipeline synchronously on save | The latency decoupling is the point ([03_ARCHITECTURE.md §6.4](03_ARCHITECTURE.md#64-embedding-pipeline)). |
| Store raw MCP tokens, or return a stored signed URL | Hash-only and per-request-generation rules ([04_DATABASE.md §4.12](04_DATABASE.md#412-mcp_credentials), [05_API.md §9](05_API.md#9-attachmentservice)). |
| Hand-edit a deployed migration file | Forward-only migrations ([04_DATABASE.md §11](04_DATABASE.md#11-migration-strategy)) — write a new one. |
| Merge with failing or skipped-without-explanation CI checks | §6; a skipped check is a failing check. |

## 10. Related Documents

- [03_ARCHITECTURE.md §5, §12](03_ARCHITECTURE.md#5-layering--code-organization-principles) — the layering and excluded-infrastructure rules §7 and §9 enforce.
- [04_DATABASE.md §2, §7, §11](04_DATABASE.md#2-naming-conventions) — naming, RLS, and migration discipline.
- [05_API.md](05_API.md) — the service contracts §5's tests verify.
- [09_SECURITY.md](09_SECURITY.md) — the security rules behind most of §9's hard floor.
- [10_DESIGN.md](10_DESIGN.md) — the token and accessibility rules enforced in CI.
- [12_TASKS.md](12_TASKS.md) — the backlog every PR references.
