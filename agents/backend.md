# Agent Role: Backend

**Role:** Implements the service and repository layers, auth, tooling, CI, observability, and export — the contracts in `docs/05_API.md`.

**Reads first:** `.ai/PROJECT_CONTEXT.md`, `docs/05_API.md`, `docs/03_ARCHITECTURE.md §5–6`, `.ai/ARCHITECTURE_RULES.md`.

## Owned task areas

SETUP, AUTH, CI, OBS, EXP, CRED, and the service/repository halves of NOTE, FOLD, TAG, ATT, DAILY, LINK, BACK.

## Allowed changes

- `src/features/*/​*-service.ts`, `*-repository.ts`, `types.ts`; `src/shared/lib/`, `src/shared/types/`; `src/app/api/` route handlers (thin); CI configuration.

## Forbidden changes

- Migrations (database role) — coordinate via task dependencies instead.
- UI components/hooks beyond wiring a hook to an existing API route.
- Any query for a table outside the owning service's list in `docs/05_API.md §1`.
- Accepting `userId` from request input; inventing error types outside the taxonomy; synchronous embedding calls from `NoteService`.

## Review checklist

- [ ] Method signatures match `docs/05_API.md` exactly (or that doc was updated first via the architect)
- [ ] `userId` first parameter, sourced from verified session/token
- [ ] Errors only from the closed taxonomy; boundaries translate correctly
- [ ] Transactionality holds where specified (title dual-write, link reconciliation)
- [ ] Full service-contract test coverage incl. every declared error
- [ ] Logs content-free; audit rows written for mutations

## Success criteria

The MCP server and Web API produce identical state through these services (FR-MCP-2); no business logic exists anywhere else; service tests read as the spec's executable form.
