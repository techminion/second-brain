# Decisions — Architecture Decision Registry

> Single registry of every recorded decision. Engineering ADRs made during the spec phase live embedded in their home documents and are **indexed** here, not restated (GOV-3). New decisions — architectural or governance — are recorded here in full using the template.

## Template

```
## <ID> — <Decision title>
Decision:
Status: Proposed | Accepted | Superseded by <ID>
Context:
Options Considered:
Chosen Solution:
Tradeoffs:
Future Revisit:
```

## Index of Embedded Engineering ADRs

| ID | Decision (one line) | Recorded in |
|---|---|---|
| ADR-1 | Layered monolith on Vercel + Supabase; no microservices | [03_ARCHITECTURE.md §11](03_ARCHITECTURE.md#11-architecture-decision-records) |
| ADR-2 | Async embeddings via Supabase DB Webhook, not a message queue | [03_ARCHITECTURE.md §11](03_ARCHITECTURE.md#11-architecture-decision-records) |
| ADR-3 | MCP server is a route handler in the same Next.js app | [03_ARCHITECTURE.md §11](03_ARCHITECTURE.md#11-architecture-decision-records) |
| ADR-4 | pgvector in the primary Postgres, no dedicated vector DB | [03_ARCHITECTURE.md §11](03_ARCHITECTURE.md#11-architecture-decision-records) |
| ADR-5 | Hybrid search in Postgres (tsvector + pgvector), no external engine | [03_ARCHITECTURE.md §11](03_ARCHITECTURE.md#11-architecture-decision-records) |
| ADR-6 | AI streaming via SSE, not WebSockets | [03_ARCHITECTURE.md §11](03_ARCHITECTURE.md#11-architecture-decision-records) |
| ADR-7 | Repository pattern for testability, not DB portability | [03_ARCHITECTURE.md §11](03_ARCHITECTURE.md#11-architecture-decision-records) |
| ADR-DB-1 | `owner_id` denormalized onto every table for uniform RLS | [04_DATABASE.md §9](04_DATABASE.md#9-schema-level-decisions) |
| ADR-DB-2 | `title` mirrored onto `notes` for same-table generated tsvector | [04_DATABASE.md §9](04_DATABASE.md#9-schema-level-decisions) |
| ADR-DB-3 | Enums as `text` + `CHECK`, not native `ENUM` types | [04_DATABASE.md §9](04_DATABASE.md#9-schema-level-decisions) |
| ADR-DB-4 | Attachment binaries in Storage; Postgres holds only the path | [04_DATABASE.md §9](04_DATABASE.md#9-schema-level-decisions) |
| ADR-DB-5 | Soft-delete marker only on `knowledge_objects` and `folders` | [04_DATABASE.md §9](04_DATABASE.md#9-schema-level-decisions) |

---

## GOV-1 — Roadmap keeps the PRD milestone structure

**Decision:** [ROADMAP.md](ROADMAP.md) uses the milestones committed in [02_PRD.md §7](02_PRD.md#7-milestones) (M0 Foundations … M5 Launch Readiness), adding M6 Integrations as an uncommitted post-MVP horizon.
**Status:** Accepted (2026-07-16)
**Context:** The governance brief sketched an alternative split (…AI / MCP / Integrations as separate milestones). The docs are the source of truth and already define milestones with exit criteria.
**Options Considered:** (a) Adopt the brief's split, amending the PRD; (b) keep the PRD structure and map the sketch onto it.
**Chosen Solution:** (b). AI chat and MCP stay in one milestone (M4 Collaborate) — they share the service layer, and the PRD's M4 exit criteria cover both.
**Tradeoffs:** M4 is the largest milestone (52 tasks); acceptable because its two halves parallelize across the `ai` and `mcp` agent roles.
**Future Revisit:** If M4 proves too large in practice, split at the phase boundary (AICH+VCH / MCP+CRED) without renaming PRD milestones.

## GOV-2 — TASK_QUEUE is a live view over 12_TASKS, never a second backlog

**Decision:** [12_TASKS.md](12_TASKS.md) remains the canonical, immutable-ID backlog. [.ai/TASK_QUEUE.md](../.ai/TASK_QUEUE.md) holds only operational state: what's queued now, who owns it, its status.
**Status:** Accepted (2026-07-16)
**Context:** The governance brief asks for a prioritized backlog file; one already exists with 309 tasks. Two definitions of the same task will diverge.
**Options Considered:** (a) Regenerate the backlog in TASK_QUEUE; (b) queue references backlog IDs only.
**Chosen Solution:** (b). The queue never redefines a task's scope, dependencies, or acceptance criteria — it adds status/owner/priority and links back.
**Tradeoffs:** Agents must open two files; the queue keeps per-task pointers to minimize that.
**Future Revisit:** If GitHub Issues become the operational tracker, TASK_QUEUE becomes a generated mirror.

## GOV-3 — DECISIONS.md is a registry; embedded ADRs stay embedded

**Decision:** ADRs already recorded in 03/04 are indexed above, not moved or duplicated. All *new* decisions are recorded in this file in full.
**Status:** Accepted (2026-07-16)
**Context:** Moving ADRs would break dozens of verified cross-references; duplicating them violates the doc set's no-duplication rule.
**Options Considered:** Migrate all ADRs here; duplicate; index.
**Chosen Solution:** Index existing, record new here.
**Tradeoffs:** Two homes for ADRs, mitigated by the index being exhaustive.
**Future Revisit:** None anticipated.

## GOV-4 — `.ai/` files are digests; `docs/` always wins

**Decision:** [.ai/ARCHITECTURE_RULES.md](../.ai/ARCHITECTURE_RULES.md), [.ai/CODING_STANDARDS.md](../.ai/CODING_STANDARDS.md), and [.ai/PROJECT_CONTEXT.md](../.ai/PROJECT_CONTEXT.md) are context-loading digests of the 12-document spec. On any conflict, the `docs/` source is authoritative, and the digest must be fixed.
**Status:** Accepted (2026-07-16)
**Context:** Digests are what agents load first; they will drift if treated as independent documents.
**Options Considered:** No digests (agents read full docs — too much context per session); digests as authority (spec rots); digests that always lose.
**Chosen Solution:** Digests that always lose, each carrying an explicit authority banner.
**Tradeoffs:** Digest maintenance is a standing chore; assigned to the architect role on every spec change.
**Future Revisit:** None anticipated.

## GOV-5 — Agent ownership follows task-area prefixes

**Decision:** Each [agents/](../agents/) role owns the task areas listed in its file (e.g., `mcp` owns MCP-*); the reviewer role owns no implementation area and reviews everything.
**Status:** Accepted (2026-07-16)
**Context:** Multiple agents working in parallel need non-overlapping write boundaries; the backlog's area prefixes already partition the work.
**Options Considered:** Ownership by folder; by milestone; by task-area prefix.
**Chosen Solution:** By task-area prefix, since prefixes map cleanly to both feature folders and doc sections.
**Tradeoffs:** Cross-cutting tasks (e.g., FOLD UI + service) name a primary owner and a supporting role in [MILESTONES.md](MILESTONES.md).
**Future Revisit:** Revisit if agent count or parallelism grows beyond one agent per area.
