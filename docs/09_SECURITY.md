# 09. Security

> Part of the [Documentation Index](DOCUMENT_INDEX.md). Consolidates the security decisions distributed across [03_ARCHITECTURE.md §9](03_ARCHITECTURE.md#9-cross-cutting-concerns), [04_DATABASE.md §7](04_DATABASE.md#7-row-level-security-rls-policies), [05_API.md §3](05_API.md#3-error-taxonomy), and [06_MCP.md §9](06_MCP.md#9-security-considerations) into one threat-model-driven document, and sets the concrete policies (rate limits, headers, secrets handling) those documents deferred here.

## 1. Purpose & Scope

This document is the authority on how Second Brain protects user data. Where an earlier document already made a security-relevant decision (RLS policy shape, MCP credential storage), this document references it rather than restating it — but where a decision was deferred ("thresholds are 09_SECURITY.md's to set"), this document is where it gets set.

**The single most important property of the system:** a user's Knowledge Objects are theirs alone. Every section below exists in service of that, or of keeping the platform itself trustworthy (secrets, headers, abuse resistance).

## 2. Security Principles

1. **The database is the enforcement floor.** Authorization is enforced by Postgres RLS ([04_DATABASE.md §7](04_DATABASE.md#7-row-level-security-rls-policies)), not by application code remembering to check. Application-layer checks are additional, never a substitute.
2. **Every caller is untrusted equally.** The web app, the MCP server, and any future surface authenticate to the same identity system and run under the same RLS-scoped context. There is no "trusted internal caller" that bypasses ownership checks ([03_ARCHITECTURE.md §6.6](03_ARCHITECTURE.md#66-mcp-request-flow)).
3. **Secrets have one home per environment and appear nowhere else.** No secret in code, git history, client bundles, or logs.
4. **Least privilege for the service role.** The Supabase service-role key (which bypasses RLS) is used only where RLS-scoped access is structurally impossible — the contexts enumerated exhaustively in §5, and nowhere else.
5. **Fail closed.** Missing policy, unverifiable token, ambiguous ownership → the request fails. There is no permissive default anywhere in the stack.

## 3. Authentication

| Surface | Mechanism | Defined in |
|---|---|---|
| Web app | Supabase Auth: email/password (FR-AUTH-1), OAuth (FR-AUTH-2), password reset (FR-AUTH-3). Session JWT carried in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie — never in `localStorage`, which any XSS could read. | [03_ARCHITECTURE.md §6.1](03_ARCHITECTURE.md#61-authentication) |
| MCP clients | Long-lived bearer credential, hash-only storage, per-request verification, immediate revocation. | [06_MCP.md §4](06_MCP.md#4-authentication) |
| Embedding webhook endpoint | Shared-secret header configured on both the Supabase and Vercel sides — it is *not* an open endpoint that trusts its caller by URL obscurity. | [03_ARCHITECTURE.md §6.4](03_ARCHITECTURE.md#64-embedding-pipeline) |

**Session policy:** access tokens short-lived (Supabase default, ~1 hour), transparently refreshed via the refresh token; explicit logout revokes the refresh token server-side. Failed-login throttling is delegated to Supabase Auth's built-in protections rather than reimplemented.

## 4. Authorization

The complete model, in order of enforcement:

| Layer | Enforces | Reference |
|---|---|---|
| 1. Postgres RLS | `owner_id = auth.uid()` on every table — the floor. A query from any surface physically cannot return another user's rows. | [04_DATABASE.md §7](04_DATABASE.md#7-row-level-security-rls-policies) |
| 2. Service layer | `userId` as the mandatory first parameter, sourced only from verified session/token — never from request input. Throws `ForbiddenError`/`NotFoundError` per the taxonomy. | [05_API.md §2–3](05_API.md#2-conventions) |
| 3. Surface layer | Web API and MCP Server resolve identity before any service call; no anonymous code path reaches the service layer. | [03_ARCHITECTURE.md §6.2, §6.6](03_ARCHITECTURE.md#62-standard-readwrite-request) |

**Storage authorization (FR-ATTACH-2):** the attachments bucket is private. Access is granted exclusively through short-lived signed URLs generated per request by `AttachmentService.get` ([05_API.md §9](05_API.md#9-attachmentservice)) after the RLS-scoped ownership check has already passed. Signed URL TTL: **5 minutes** — long enough to render/download, short enough that a leaked URL (browser history, shared screenshot, logs) goes stale before it's useful. Storage bucket policies additionally scope object paths by owner id as defense-in-depth, so even a signing bug can't cross user boundaries.

## 5. Service-Role Key Usage

The Supabase service-role key bypasses RLS entirely, so its use is enumerated exhaustively — any use not on this list is a security bug:

| Permitted use | Why RLS-scoped access is impossible there |
|---|---|
| Embedding pipeline endpoint ([03_ARCHITECTURE.md §6.4](03_ARCHITECTURE.md#64-embedding-pipeline)) | Triggered by a database webhook, not a user request — there is no user JWT to run under. The endpoint derives `owner_id` from the note row itself and writes only `embeddings` rows for that object. |
| Scheduled retention purge ([04_DATABASE.md §6](04_DATABASE.md#6-soft-deletes)) | A `pg_cron` job with no user in the loop, deleting rows already 30 days past soft-deletion across all users. |
| Cloud integration-test harness (ADR-12, [DECISIONS.md](DECISIONS.md)) | Creating and deleting isolated test users requires the GoTrue admin API, which is service-role-only; the harness also cleans up test data across those users. Constraints: lives in test code only, never importable from `src/` application code; targets only the shared Cloud *development* project — the production project's key is never configured in any test environment. |

The MCP server is explicitly **not** on this list ([06_MCP.md §9](06_MCP.md#9-security-considerations)) — it resolves a user and runs RLS-scoped, always.

## 6. Secrets Management

| Rule | Detail |
|---|---|
| Storage | Vercel environment variables, scoped per environment (preview vs. production values are distinct) — per [03_ARCHITECTURE.md §8](03_ARCHITECTURE.md#8-deployment-architecture). |
| Inventory | Supabase service-role key, OpenAI API key, webhook shared secret (§3). The Supabase anon key and URL are public by design (RLS is the protection, not key secrecy) — but the *service-role* key must never ship in any client bundle; only code running in Route Handlers/server components may read it. |
| Client exposure | No secret is ever prefixed `NEXT_PUBLIC_`. CI lint rule enforces this mechanically ([11_CONTRIBUTING.md](11_CONTRIBUTING.md)). |
| Logs | Structured logs carry request id + user id, never tokens, note content, or signed URLs ([03_ARCHITECTURE.md §9](03_ARCHITECTURE.md#9-cross-cutting-concerns)). |
| Rotation | All three secrets are rotatable without a schema change; rotation is a Vercel env-var update + redeploy. On any suspected exposure, rotate first, investigate second. |

## 7. Rate Limiting

Concrete starting policies for the surfaces [03_ARCHITECTURE.md §9](03_ARCHITECTURE.md#9-cross-cutting-concerns) and [07_AI.md §10](07_AI.md#10-rate-limits) deferred here. Values are deliberate starting points expected to be tuned against real traffic — the *mechanism* is the commitment, the numbers are calibration:

| Surface | Limit (starting point) | Mechanism |
|---|---|---|
| AI chat (`streamChat`) | 20 requests / user / hour | Token bucket keyed on user id, checked in the service layer before the OpenAI call. |
| MCP tool calls | 120 calls / credential / hour | Same mechanism, keyed on credential id — a runaway agent loop is throttled without blocking the user's other clients. |
| Embedding endpoint | Concurrency cap of 5 simultaneous OpenAI calls | Bounds fan-out from bulk imports/edit bursts ([07_AI.md §10](07_AI.md#10-rate-limits)); excess work queues behind the cap rather than failing. |
| Auth endpoints | Supabase Auth built-in throttling | Not reimplemented. |
| General Web API | None initially | Vercel's platform-level DDoS protection covers volumetric abuse; per-endpoint app-layer limits added only when a measured need appears ([01_PRODUCT.md §6.1](01_PRODUCT.md#6-guiding-principles)). |

State for token buckets lives in Postgres (a small counters table) — consistent with the no-Redis constraint ([03_ARCHITECTURE.md §12](03_ARCHITECTURE.md#12-explicitly-excluded-infrastructure)); at these request rates, Postgres is nowhere near being the bottleneck. All trips throw `RateLimitError` → HTTP 429 / MCP rate-limit error ([05_API.md §3](05_API.md#3-error-taxonomy)).

## 8. Security Headers

Set globally via Next.js middleware/config:

| Header | Value / policy |
|---|---|
| `Content-Security-Policy` | Restrictive allowlist: `default-src 'self'`; `connect-src` limited to self + the Supabase project domain; no third-party script sources. The exact directive set is maintained in code, but the rule is: adding an external origin to CSP requires the same scrutiny as adding a dependency. |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` — HTTPS is guaranteed by Vercel; HSTS makes downgrade non-negotiable. |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` — nothing in the product needs to be iframed; denying wholesale kills clickjacking. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` — note titles can appear in URLs; full-path referrers must not leak to external links. |
| `Permissions-Policy` | Deny camera, microphone, geolocation — nothing in MVP uses them (voice notes, a future feature, would revisit the microphone entry). |

## 9. Threat Model

Assets: user Knowledge Objects (the crown jewel), account credentials, MCP credentials, platform API keys. Trust boundaries: browser ↔ Vercel, MCP client ↔ Vercel, Vercel ↔ Supabase, Vercel ↔ OpenAI.

| # | Threat | Vector | Mitigation |
|---|---|---|---|
| T1 | Cross-user data access | Any query surface (web, MCP, future) | RLS floor (§4); denormalized `owner_id` making policies uniform ([04_DATABASE.md §9](04_DATABASE.md#9-schema-level-decisions), ADR-DB-1); explicit cross-user test coverage required ([11_CONTRIBUTING.md](11_CONTRIBUTING.md)). |
| T2 | Stolen MCP credential | Leaked config file, malware on user device | Hash-only storage, immediate revocation, per-credential rate limit (§7), `last_used_at` visibility so users can spot anomalous use ([04_DATABASE.md §4.12](04_DATABASE.md#412-mcp_credentials)). Full-account scope means a stolen token is serious — which is why revocation is one click and takes effect on the next request. |
| T3 | Prompt injection via note content | Malicious text in a note manipulating an AI client reading it via MCP, or Second Brain's own vault chat | For MCP: the client's responsibility, documented explicitly ([06_MCP.md §9](06_MCP.md#9-security-considerations)). For vault chat: the blast radius is structurally capped — `AIService` cannot write to the graph (FR-AI-5, [05_API.md §10](05_API.md#10-aiservice)), so injected instructions can at worst distort an answer, never mutate or exfiltrate data to a third party. |
| T4 | XSS via rendered markdown | Note bodies are user-controlled markdown, rendered as HTML | Markdown rendering sanitizes HTML output (no raw-HTML passthrough by default); CSP (§8) as second layer, so even a sanitizer bypass has no external origin to exfiltrate to; `HttpOnly` session cookie (§3) as third, so script cannot steal the session. |
| T5 | Signed URL leakage | Attachment URLs in logs/history/screenshots | 5-minute TTL + per-request generation, never cached or stored (§4, [05_API.md §9](05_API.md#9-attachmentservice)). |
| T6 | Webhook endpoint abuse | Attacker POSTs fake "note changed" events to the embedding endpoint | Shared-secret header (§3); endpoint re-reads the actual note row before doing any work, so a forged payload for a nonexistent/other-user note does nothing. |
| T7 | Cost-exhaustion abuse | Scripted AI-chat or embedding load to run up the OpenAI bill | Per-user and per-credential rate limits, embedding concurrency cap (§7); spend alerting on the OpenAI account as the backstop. |
| T8 | Account takeover | Credential stuffing, weak passwords | Supabase Auth throttling, HSTS, `HttpOnly` cookies. Post-MVP hardening: MFA support is the highest-value addition on this row (§12). |
| T9 | Malicious file upload | Attachment containing malware / disguised executable | Size cap (FR-ATTACH-3); served with `nosniff` and correct MIME headers from Storage; attachments are never executed or transformed server-side in MVP — they're opaque stored bytes, which keeps the server-side attack surface near zero. |

## 10. OWASP Top 10 Mapping

| OWASP category | Where it's addressed |
|---|---|
| A01 Broken Access Control | §4 (RLS floor + service layer), T1 |
| A02 Cryptographic Failures | HTTPS/HSTS everywhere (§8); token hashes not plaintext (§3); encryption at rest is provided by Supabase/managed Postgres (§11) |
| A03 Injection | Parameterized queries only via the Supabase client — no string-assembled SQL anywhere ([04_DATABASE.md](04_DATABASE.md) tooling); prompt injection treated separately as T3 |
| A04 Insecure Design | This document set — threat model (§9), fail-closed principles (§2), ADRs with rationale |
| A05 Security Misconfiguration | Enumerated service-role usage (§5), headers (§8), per-environment secrets (§6) |
| A06 Vulnerable Components | Dependency update + audit policy in [11_CONTRIBUTING.md](11_CONTRIBUTING.md) |
| A07 Auth Failures | §3, T8 |
| A08 Software & Data Integrity | CI-gated deploys ([03_ARCHITECTURE.md §8](03_ARCHITECTURE.md#8-deployment-architecture)); no unreviewed migration path ([04_DATABASE.md §11](04_DATABASE.md#11-migration-strategy)) |
| A09 Logging & Monitoring Failures | Structured logging with request/user ids, content-free (§6); audit log for mutations ([04_DATABASE.md §8](04_DATABASE.md#8-audit-strategy)) |
| A10 SSRF | The server fetches no user-supplied URLs in MVP (no web clipper, no link unfurling) — the category is structurally absent until a future connector introduces it, at which point it must be revisited |

## 11. Privacy & Data Ownership

The concrete commitments behind "Open" and "data outlives the app" ([01_PRODUCT.md §4, §6.4](01_PRODUCT.md#4-core-philosophy)):

| Commitment | Implementation |
|---|---|
| Full export, always | A user can export their complete graph as plain markdown files (+ attachments) at any time. Export is a first-class requirement, not a support request. |
| Deletion means deletion | Soft-delete window (30 days, [04_DATABASE.md §6](04_DATABASE.md#6-soft-deletes)), then hard purge including embeddings and storage objects. Account deletion (FR-AUTH-6) cascades the same way after its grace period. |
| No training on user content | User Knowledge Objects are sent to OpenAI solely to serve that user's own requests (embeddings, chat), under API terms where inputs are not used for model training. Any future provider change must preserve this property. |
| No content in telemetry | Logs and metrics carry ids and counts, never note bodies, titles, or search queries (§6). |
| Encryption | In transit: TLS on every hop (browser↔Vercel, Vercel↔Supabase, Vercel↔OpenAI). At rest: provided by Supabase's managed Postgres and Storage. Client-side/E2E encryption is explicitly **not** offered — it is structurally incompatible with server-side search, embeddings, and MCP access, which are the product ([01_PRODUCT.md §1](01_PRODUCT.md#1-purpose)). Stated openly rather than implied. |
| Support access | No admin read path to user content exists in the schema ([04_DATABASE.md §8](04_DATABASE.md#8-audit-strategy)) — operational debugging works from metadata and logs, not from reading users' notes. |

## 12. Post-MVP Security Roadmap

Not MVP scope; recorded so they're planned, not forgotten:

- **MFA/TOTP** — highest-value hardening for T8 (account takeover).
- **Scoped MCP credentials** (read-only, folder-scoped) — deferred per [06_MCP.md §9](06_MCP.md#9-security-considerations) until a concrete use case exists.
- **SSRF review** — mandatory the moment any future connector (web clipper, GitHub, etc.) makes the server fetch external URLs (§10, A10).
- **Anomaly alerting on MCP usage** — `last_used_at` exists now; alerting on unusual patterns builds on it.
- **Shared-graph authorization model** — the RLS ripple effect flagged in [04_DATABASE.md §10](04_DATABASE.md#10-future-schema-considerations); a full security re-review is a prerequisite of that feature, not an afterthought.

## 13. Related Documents

- [03_ARCHITECTURE.md §6, §8–9](03_ARCHITECTURE.md#6-key-flows) — the flows and deployment model this document's controls attach to.
- [04_DATABASE.md §7–8](04_DATABASE.md#7-row-level-security-rls-policies) — RLS policy shape and audit log, the enforcement floor referenced throughout.
- [05_API.md §2–3](05_API.md#2-conventions) — the `userId`-first convention and error taxonomy that carry authorization through the service layer.
- [06_MCP.md §4, §9](06_MCP.md#4-authentication) — MCP credential lifecycle and MCP-specific threat surface.
- [07_AI.md §10](07_AI.md#10-rate-limits) — the AI-surface rate-limit design whose thresholds are set here (§7).
- [11_CONTRIBUTING.md](11_CONTRIBUTING.md) — the test requirements (cross-user access tests) and dependency policy this document depends on.
