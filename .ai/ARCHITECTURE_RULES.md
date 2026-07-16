# Architecture Rules — Non-Negotiable

> Digest of the binding rules in [docs/11_CONTRIBUTING.md §7, §9](../docs/11_CONTRIBUTING.md#7-architecture-rules-load-bearing) and [docs/03_ARCHITECTURE.md §12](../docs/03_ARCHITECTURE.md#12-explicitly-excluded-infrastructure). If this file and those sections ever disagree, **they win** (GOV-4). Violating any rule below is a rejected PR regardless of whether the feature works.

## Never

1. **Never access Supabase directly from UI components or route handlers.** Only repository files issue queries; only for tables their feature owns ([docs/05_API.md §1](../docs/05_API.md#1-purpose--scope)).
2. **Never put business logic outside the service layer** — not in components, not in route handlers, not in MCP tool definitions.
3. **Never bypass a service** to reach another feature's tables, and never duplicate a service's logic elsewhere "for convenience."
4. **Never use `any`** at service boundaries; `unknown` + narrowing where typing is genuinely dynamic.
5. **Never accept `userId` from request input.** It comes from the verified session/token, always the first service-method parameter.
6. **Never disable, weaken, or "temporarily" bypass an RLS policy.** RLS is the authorization floor.
7. **Never use the Supabase service-role key** outside the contexts enumerated in [docs/09_SECURITY.md §5](../docs/09_SECURITY.md#5-service-role-key-usage): the embedding webhook endpoint, the retention purge job, and the Cloud integration-test harness (test code only, dev project only — ADR-12).
8. **Never introduce excluded infrastructure** — Docker, Redis, Kafka, Kubernetes, RabbitMQ, microservices, or a second component library — without a human-approved ADR.
9. **Never let AI write to the graph outside chat history** (FR-AI-5). Future write-back features use the confirm-gated pattern only.
10. **Never call the embedding pipeline synchronously on save**; it is DB-webhook-driven by design.
11. **Never commit secrets, log tokens/note content/signed URLs, store raw MCP tokens, or return cached signed URLs.**
12. **Never hand-edit a deployed migration** — forward-only; write a new one.
13. **Never invent product decisions.** If the docs don't answer it, stop and ask ([docs/11_CONTRIBUTING.md §8](../docs/11_CONTRIBUTING.md#8-rules-for-ai-coding-agents)).

## Always

1. **Always use feature-first organization** ([docs/11_CONTRIBUTING.md §2](../docs/11_CONTRIBUTING.md#2-folder-structure)); `shared/` requires ≥2 real consumers.
2. **Always ship RLS + a cross-user denial test with every new table**, in the same PR.
3. **Always write tests** per [docs/11_CONTRIBUTING.md §5](../docs/11_CONTRIBUTING.md#5-testing-strategy); mock AI calls; a bug fix lands with its reproducing test.
4. **Always respect migration deploy ordering**: additive before dependent code; destructive only after nothing references it.
5. **Always update documentation after implementation** — the affected spec doc, [docs/PROJECT_STATE.md](../docs/PROJECT_STATE.md), [docs/AI_HANDOFF.md](../docs/AI_HANDOFF.md), and [TASK_QUEUE.md](TASK_QUEUE.md). No feature is complete until its documentation is updated.
6. **Always stay inside the claimed task's scope** — adjacent improvements become proposed tasks, not PR padding.
7. **Always declare honestly what was not tested or verified** in the PR description.
