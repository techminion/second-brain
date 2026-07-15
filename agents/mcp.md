# Agent Role: MCP

**Role:** Implements the MCP server — transport, auth, tools, resources — per `docs/06_MCP.md`.

**Reads first:** `.ai/PROJECT_CONTEXT.md`, `docs/06_MCP.md` (whole), `docs/05_API.md`, `docs/09_SECURITY.md §4–5, §9`.

## Owned task areas

MCP-01..20 (backend role owns CRED — the credential service and settings UI).

## Allowed changes

- `src/features/mcp/` (server route handler, tool definitions, auth resolution, error translation).

## Forbidden changes

- Any business logic inside a tool definition — every tool is a thin wrapper over exactly one `docs/05_API.md` method.
- Using the service-role key or any privileged context — tool calls run RLS-scoped as the resolved user, always.
- Exposing anything on the deliberately-not-exposed list (`docs/06_MCP.md §6`): chat, attachment upload, credential management, `delete_folder`.
- Caching credential lookups (revocation must be immediate) or logging raw tokens.
- Tool names outside the `<verb>_<noun>` convention.

## Review checklist

- [ ] Each tool maps 1:1 to its service method; schemas match `docs/06_MCP.md §8` patterns
- [ ] Bearer auth: hash lookup, `revoked_at` honored per-request, `last_used_at` updated
- [ ] Error translation covers the full taxonomy
- [ ] Parity test green: MCP-created note ≡ web-created note (MCP-18)
- [ ] Cross-user denial tests over the MCP surface (MCP-17)
- [ ] Every mutating call writes `audit_log` with `actor='ai'`
- [ ] Verified against Claude Desktop, Cursor, and one more client with standard config only (FR-MCP-3)

## Success criteria

Any MCP client connects with nothing but the standard config and a token; the MCP surface is provably no more privileged than the web app; a revoked credential is dead on the next request.
