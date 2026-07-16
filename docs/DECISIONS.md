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

## ADR-8 — Concrete semantic token values: zinc neutrals + blue accent

**Decision:** The token roles in [10_DESIGN.md §3.3](10_DESIGN.md#33-color) get concrete starting values: shadcn/ui zinc neutral scale, Tailwind blue-600 (light) / blue-500 (dark) as `primary`, red-600 as `destructive`. Full value table now lives in 10_DESIGN §3.3.
**Status:** Accepted (2026-07-16)
**Context:** SETUP-02 was blocked — the design spec defined roles and contrast targets but no values, and inventing them is a product decision an implementation agent correctly refused to make.
**Options Considered:** (a) shadcn/ui defaults verbatim; (b) shadcn zinc + blue accent with a contrast-fixed destructive; (c) commission a bespoke palette.
**Chosen Solution:** (b). shadcn defaults are battle-tested and match the "calm, text-first" character, but its default destructive (red-500) fails the spec's own 4.5:1 text rule on white — red-600 passes. Blue is the conventional, lowest-surprise link/accent hue for a text-first tool.
**Tradeoffs:** Brand-neutral rather than distinctive. Acceptable pre-launch; the token layer makes a later swap a one-file change.
**Future Revisit:** Before public beta (M5), if a brand identity emerges — supersede with a new ADR and re-run the SETUP-02 contrast checks.

## ADR-9 — Theme override persists in a cookie, not localStorage or the database

**Decision:** The manual light/dark/system override is stored in a cookie, read server-side to stamp the `.dark` class during SSR.
**Status:** Accepted (2026-07-16)
**Context:** SETUP-13 was blocked — [10_DESIGN.md §7](10_DESIGN.md#7-dark-mode) said the override "persists per user," but M0 has no profile storage in scope, and the MVP `profiles` schema ([04_DATABASE.md §4.1](04_DATABASE.md#41-profiles)) has no theme column — so DB persistence wasn't just out of M0 scope, it contradicted the schema.
**Options Considered:** (a) `localStorage` — client-only, causes a wrong-theme flash on SSR first paint unless an inline script hack is added; (b) cookie — SSR-readable, no flash, per-browser; (c) add a `profiles.theme` column — cross-device sync, but a schema change and an auth dependency for an M0 task.
**Chosen Solution:** (b). 10_DESIGN §7 wording amended from "per user" to "per browser via a cookie" to match.
**Tradeoffs:** No cross-device sync — a user's laptop and desktop can disagree on theme. Minor for MVP.
**Future Revisit:** If cross-device theme sync is ever requested, add a nullable `profiles` column (additive migration) and treat the cookie as a cache of it.

## ADR-10 — Supabase Cloud-only development workflow

**Decision:** Second Brain uses a shared Supabase Cloud development project for development, integration testing, and previews. No local Supabase Docker stack is used.
**Status:** Accepted (2026-07-16)
**Context:** The project owner explicitly does not want local Supabase containers or images consuming computer resources. A Cloud project is already part of the documented architecture; the local stack was a convenience rather than a product requirement.
**Options Considered:** (a) local Docker stack plus Cloud production; (b) shared Supabase Cloud development project only.
**Chosen Solution:** (b). All schema changes are versioned migrations committed to the repository, reviewed, and then applied to the Cloud development project. Dashboard and ad-hoc Cloud-schema edits are prohibited to prevent migration drift.
**Tradeoffs:** Cloud integration tests require network access and disciplined test-data isolation; they cannot be run offline. The project avoids Docker disk and memory use on contributor machines.
**Future Revisit:** Revisit only if isolation, latency, or Cloud cost makes a local stack necessary; restoring it requires superseding this ADR and restoring the associated testing/deployment guidance.

## ADR-11 — `profiles` RLS policy is `id = auth.uid()`

**Decision:** `profiles` uses `id = auth.uid()` for `SELECT`/`UPDATE`, with no user-facing `INSERT` (signup trigger only, `SECURITY DEFINER`) or `DELETE` (account-deletion path only). Documented in [04_DATABASE.md §4.1, §7](04_DATABASE.md#41-profiles) as the sole exception to the uniform `owner_id = auth.uid()` shape.
**Status:** Accepted (2026-07-16)
**Context:** DB-02 was blocked: §7 claimed *every* table carries `owner_id`, but `profiles` (§4.1) has none — its PK *is* the auth user id. The spec overlooked its own identity-root table.
**Options Considered:** (a) add a redundant self-referential `owner_id` to `profiles` for uniformity; (b) document `id = auth.uid()` as an explicit exception.
**Chosen Solution:** (b). A column that always equals the PK is noise that would itself need explaining forever.
**Tradeoffs:** The "uniform at a glance" audit property now has exactly one documented exception. Acceptable — an explicit exception beats a fake column.
**Future Revisit:** None anticipated; shared-graph work ([04_DATABASE.md §10](04_DATABASE.md#10-future-schema-considerations)) revisits all policies anyway.

## GOV-6 — RLS ships inside each table's own migration; DB-13 is an audit

**Decision:** Every schema migration that creates a table includes that table's RLS enablement, policy, and cross-user denial test in the same PR — [11_CONTRIBUTING.md §7.4](11_CONTRIBUTING.md#7-architecture-rules-load-bearing) wins over DB-13's original batch framing. DB-13 is redefined as a verification/audit task.
**Status:** Accepted (2026-07-16)
**Context:** 12_TASKS structured RLS as one batch task (DB-13) after all tables (DB-02..12), contradicting the rulebook's same-PR rule. Under ADR-10 the contradiction became dangerous: tables now land in the *shared Cloud project*, so a batched-RLS sequencing would leave real tables unprotected between merges.
**Options Considered:** (a) batch RLS in DB-13 as written; (b) per-table RLS in the same migration, DB-13 becomes the audit.
**Chosen Solution:** (b). "A table without correct RLS never reaches `main`" must hold at every commit, not at end-of-phase.
**Tradeoffs:** DB-02..DB-12 each grow slightly; DB-13 shrinks to verification. Net effort unchanged.
**Future Revisit:** None anticipated.

## ADR-12 — Service-role key permitted in the Cloud integration-test harness; Supabase client packages approved

**Decision:** [09_SECURITY.md §5](09_SECURITY.md#5-service-role-key-usage) gains a third enumerated service-role context: the Cloud integration-test harness, for test-user lifecycle (create/delete via the GoTrue admin API) and test-data cleanup. Constraints: test code only, never importable from `src/`; targets only the shared Cloud *development* project; the production key is never configured in test environments. Additionally, `@supabase/supabase-js` and `@supabase/ssr` are the approved client packages (recorded in [03_ARCHITECTURE.md §2.1](03_ARCHITECTURE.md#21-technology-stack)).
**Status:** Accepted (2026-07-16)
**Context:** DB-16 was blocked: GOV-6's repeatable cross-user tests require creating and deleting isolated Auth users, which is service-role-only — but §5's enumeration didn't include it. Session-scoped Next.js clients also require `@supabase/ssr`, which no doc had named.
**Options Considered:** (a) extend §5 with a tightly-constrained test-harness context; (b) create test users via anon-key `signUp()` and leave cleanup unsolved (accumulating orphan users in the shared dev project); (c) a `SECURITY DEFINER` SQL function deleting from `auth.users` callable by tests (a standing privilege-escalation footgun worse than the key itself).
**Chosen Solution:** (a). The enumeration's value is that every use is *documented and constrained*, not that the count stays at two.
**Tradeoffs:** The service-role key now exists in test environments; contained by the dev-project-only constraint and SEC-04's audit (updated to include verifying harness code isn't importable from `src/`).
**Future Revisit:** If Supabase ships scoped admin credentials (test-user management without full service role), adopt them and supersede this context.

## ADR-13 — CI-04 migration check: ephemeral Postgres in CI, full-history replay

**Decision:** CI-04 validates migrations by replaying the **entire migration history from scratch** against an ephemeral `supabase/postgres` service container in GitHub Actions, version-pinned to the Cloud project's Postgres version. A second step of the same job runs the migration-history consistency check (`supabase migration list` against the linked dev project) to detect repo↔Cloud drift; this step requires the access token and is **skipped on fork PRs** (GOV-7 — the container step runs credential-free everywhere). Scope clarification: ADR-10 banned a local Docker *development* stack for workflow-simplicity reasons; a CI-only service container does not contradict ADR-10's rationale and is explicitly permitted.
**Status:** Accepted (2026-07-17) — user decision
**Context:** Under ADR-10 there is no local stack, so nothing executed migration SQL before it reached the shared Cloud development project; a broken migration would land directly on the project every implementer shares. Flagged at DB-01 review; options held in PROJECT_STATE until decided.
**Options Considered:** (a) Supabase preview branching — highest fidelity but paid (Pro + per-branch-hour), credential-bound, external availability risk; (b) ephemeral `supabase/postgres` container in CI — executes real SQL free and credential-free, ships `auth` schema/`auth.uid()`/pgvector/pg_cron so migrations run unmodified; (c) history consistency check only — trivial but never executes SQL, missing CI-04's core purpose.
**Chosen Solution:** (b), with (c) folded in as a token-gated second step for drift detection.
**Tradeoffs:** A pinned image can drift slightly from the managed platform (rare; mitigated by pinning and bumping alongside Cloud upgrades). Full-history replay time grows with migration count — trivial for years at this project's scale.
**Future Revisit:** If per-PR isolated integration testing becomes valuable (e.g., DB-14 suite contention on the shared dev project), revisit option (a) preview branching as its own decision.

## ADR-14 — All `owner_id` FKs and `knowledge_objects.id`-referencing FKs are `ON DELETE CASCADE`

**Decision:** Uniform rule, recorded once so it never re-blocks a DB task: every `owner_id` FK → `profiles.id` is `ON DELETE CASCADE`, and every FK referencing `knowledge_objects.id` (subtype tables, `embeddings`, `links`, `knowledge_object_tags`) is `ON DELETE CASCADE`. Recorded in [04_DATABASE.md §4](04_DATABASE.md#4-schema-reference) intro; applies to DB-03..DB-12.
**Status:** Accepted (2026-07-17)
**Context:** DB-03 blocked: §4.2 declared `owner_id` FK → `profiles.id` with no delete action. With Postgres's default `NO ACTION`, the FR-AUTH-6 final account deletion ([05_API.md §11](05_API.md#11-userservice): grace period, then Supabase Auth deletion → cascades to `profiles`) would fail for any user owning a single physical row — and soft-deleted rows are physical rows, so it would fail for essentially every real user. §6's hard-delete purge also already *assumed* child cascades that were never specified.
**Options Considered:** (a) `ON DELETE CASCADE` everywhere; (b) `NO ACTION` + service-layer hard-delete of every owned row before Auth deletion (post-session, so service-role — more moving parts, and one missed table blocks deletion forever); (c) `SET NULL` (impossible: `owner_id` is `NOT NULL`).
**Chosen Solution:** (a). It is the only option consistent with §4.1's existing `auth.users → profiles` cascade, §6's purge assumptions, and 05_API §11's deletion orchestration; it also matches [09_SECURITY.md](09_SECURITY.md)'s data-deletion posture. Safety: the cascade fires only on physical deletion, which per 05_API §11 happens only after the grace period — soft deletes never touch it.
**Tradeoffs:** A mistaken `profiles`-row deletion would erase all owned data transactionally — accepted because no user-facing `DELETE` path to `profiles` exists (ADR-11: no DELETE policy), so the only route is the deliberate service-role account-deletion flow.
**Future Revisit:** If a compliance need for pre-deletion export/tombstoning arises, add it as an orchestration step in `deleteAccount` before Auth deletion — the cascade rule itself doesn't change.

## ADR-15 — Folder-reference FKs are `ON DELETE SET NULL`; DB-04 gains the DB-05 dependency

**Decision:** Two rulings from one DB-04 escalation. (1) **Backlog fix:** DB-04 (`notes`) canonically depends on **DB-03 and DB-05** — `notes.folder_id` references `folders.id`, so `folders` must exist first; [12_TASKS.md](12_TASKS.md) corrected. (2) **Delete actions for folder references** (the gap ADR-14 deliberately left): `notes.folder_id → folders.id` and `folders.parent_folder_id → folders.id` are both `ON DELETE SET NULL`, recorded in [04_DATABASE.md §4.3/§4.5](04_DATABASE.md#43-notes).
**Status:** Accepted (2026-07-17)
**Context:** Codex blocked DB-04 on the missing dependency (correctly — Cloud confirms `folders` is absent). The adjacent unstated question would have re-blocked DB-05/DB-04: `FolderService.delete` defines *soft*-delete strategies (`delete_contents` | `move_to_parent`) at the service layer ([05_API.md §5](05_API.md#5-folderservice)), but nothing specified what the §6 physical purge does to rows still referencing a purged folder.
**Options Considered:** For folder references: (a) `SET NULL` — orphaned notes fall to root, surviving child folders become root-level; (b) `CASCADE` — purging a folder physically deletes notes/subfolders that may not have expired their own 30-day windows (data loss); (c) `NO ACTION` — purge job fails whenever any reference survives (exactly the DB-03/ADR-14 failure shape again).
**Chosen Solution:** (a) `SET NULL`. It matches the documented "null = root" semantics, makes the purge unconditionally safe as the DB floor, and loses no data. Service-layer strategies still shape the tree at soft-delete time; `SET NULL` only governs the physical fallback.
**Tradeoffs:** A note restored from trash after its folder was purged appears at root rather than erroring — the least-surprise outcome. Nullability was already specified for both columns.
**Future Revisit:** None anticipated; new folder-referencing columns must state their delete action at spec time.

## GOV-7 — Repository is public

**Decision:** `techminion/second-brain` is a public GitHub repository. Consequences are binding: no secret may ever appear in the repository or its history (already policy — now with public blast radius); GitHub Actions workflows must assume fork PRs run them without secrets and with a read-only token; any future CI job that needs credentials (e.g., Cloud integration tests) must be gated so it cannot be triggered by a fork PR.
**Status:** Accepted (2026-07-17) — user decision, recorded by the reviewer
**Context:** CI-03 requires branch protection with required status checks and admin enforcement, which GitHub does not offer on private repositories under the free plan. The user made the repository public to enable it.
**Options Considered:** (a) public repo + full branch protection; (b) private repo, protection deferred until a paid plan; (c) private repo with rulesets-lite and no admin enforcement.
**Chosen Solution:** (a). Enforced process now outweighs privacy of a codebase whose spec contains no proprietary secrets. Reviewer ran a full-history secret scan at flip time: clean.
**Tradeoffs:** Code, docs, and the shared dev Supabase project ref are publicly visible (the ref is not a credential; data is protected by RLS and key secrecy). Fork-PR hardening becomes a standing CI constraint.
**Future Revisit:** If the project must go private later, branch protection must be re-verified on the new plan before the visibility change.

## GOV-5 — Agent ownership follows task-area prefixes

**Decision:** Each [agents/](../agents/) role owns the task areas listed in its file (e.g., `mcp` owns MCP-*); the reviewer role owns no implementation area and reviews everything.
**Status:** Accepted (2026-07-16)
**Context:** Multiple agents working in parallel need non-overlapping write boundaries; the backlog's area prefixes already partition the work.
**Options Considered:** Ownership by folder; by milestone; by task-area prefix.
**Chosen Solution:** By task-area prefix, since prefixes map cleanly to both feature folders and doc sections.
**Tradeoffs:** Cross-cutting tasks (e.g., FOLD UI + service) name a primary owner and a supporting role in [MILESTONES.md](MILESTONES.md).
**Future Revisit:** Revisit if agent count or parallelism grows beyond one agent per area.
