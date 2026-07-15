# Coding Standards — Agent Digest

> Digest of [docs/11_CONTRIBUTING.md](../docs/11_CONTRIBUTING.md) (authoritative for code standards), [docs/10_DESIGN.md](../docs/10_DESIGN.md) (authoritative for UI), and [docs/09_SECURITY.md](../docs/09_SECURITY.md) (authoritative for security). On conflict, those win (GOV-4).

## Folder Conventions

- Feature-first: `src/features/<feature>/{components,hooks,<feature>-service.ts,<feature>-repository.ts,types.ts}`; `src/app/` holds routes and thin handlers only; `src/shared/` requires two or more real consumers.
- Features import from `shared/` and other features' **services** only — never their components, hooks, or repositories (ESLint-enforced).
- Migrations: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`, one logical change each.

## Naming

- Files `kebab-case.ts(x)`; components `PascalCase`; hooks `use<Domain>`; services/repositories `<Domain>Service` / `<Domain>Repository` exactly as named in [docs/05_API.md §1](../docs/05_API.md#1-purpose--scope).
- Database per [docs/04_DATABASE.md §2](../docs/04_DATABASE.md#2-naming-conventions): plural `snake_case` tables, `id` uuid PKs, `<ref>_id` FKs, `_at` timestamps.
- MCP tools `<verb>_<noun>` snake_case; branches `feat|fix|docs|chore/<kebab-desc>`.

## React

- Server Components by default; `"use client"` only where interactivity demands it.
- Components render props/hooks data — no business logic, no data access; renderable in isolation with mocks.
- TanStack Query for server state; React Hook Form + zod for forms; optimistic updates for mutations users watch.
- Skeletons matching final layout, never spinners; destructive confirmations name the object.

## TypeScript

- Strict mode; no `any` at service boundaries; no positive `tabindex`-style escape hatches anywhere typing is concerned.
- Service methods: `async`, `userId` first, throw only taxonomy errors ([docs/05_API.md §3](../docs/05_API.md#3-error-taxonomy)), return full resources (deletes return `void`).
- Comments state constraints code can't express — never narration.

## Testing

- Colocated (`x.test.ts` beside `x.ts`); Vitest + Testing Library; Playwright for the six PRD flows; axe in CI.
- Mandatory: cross-user RLS denial test per table; exhaustive units for pure logic (link parsing, chunking, RRF); AI calls always mocked.
- A bug fix includes its reproducing test; no PR lowers service-layer coverage.

## Error Handling

- Throw only from the closed taxonomy; boundaries translate (Web API → HTTP codes, MCP → tool errors). New error types require updating 05_API first.
- Fail closed: unverifiable token or ambiguous ownership → error, never a permissive default.

## Logging

- Structured, request id + user id — **never** tokens, note content, titles, search queries, or signed URLs.
- Mutations write `audit_log` rows (`actor` = `user`/`ai`/`system`).

## Accessibility

- WCAG 2.1 AA by construction ([docs/10_DESIGN.md §6](../docs/10_DESIGN.md#6-accessibility-wcag-21-aa)): Radix semantics, ≥4.5:1 token contrast in both themes, keyboard path for every flow, `aria-live` for streamed chat, focusable list alternative for the graph, `prefers-reduced-motion` respected.

## Performance

- Budgets are requirements ([docs/02_PRD.md §6](../docs/02_PRD.md#6-non-functional-requirements)): note open <200ms, FTS <300ms, hybrid <800ms, first token <1.5s (all p95), graph interactive at 2k nodes. Index-backed queries only at 10k-note scale; FTS and semantic branches run concurrently; heavy surfaces (editor, graph) lazy-load.

## Security

- Tokens only via Tailwind theme (no arbitrary values); secrets only via env (never `NEXT_PUBLIC_`); RLS on every table; sanitize rendered markdown; enforce upload size before Storage; 5-minute signed URLs generated per request. Full model: [docs/09_SECURITY.md](../docs/09_SECURITY.md).
