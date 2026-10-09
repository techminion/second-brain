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
**Status:** Superseded by ADR-39 (2026-10-01)
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
**Status:** Accepted (2026-07-16); **amended by ADR-40** (2026-10-09: CI runs a local Supabase stack; development is unchanged)
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
**Status:** Accepted (2026-07-16); **amended by ADR-40** (2026-10-09: the harness may also target the loopback CI-only local stack; production still fails closed)
**Context:** DB-16 was blocked: GOV-6's repeatable cross-user tests require creating and deleting isolated Auth users, which is service-role-only — but §5's enumeration didn't include it. Session-scoped Next.js clients also require `@supabase/ssr`, which no doc had named.
**Options Considered:** (a) extend §5 with a tightly-constrained test-harness context; (b) create test users via anon-key `signUp()` and leave cleanup unsolved (accumulating orphan users in the shared dev project); (c) a `SECURITY DEFINER` SQL function deleting from `auth.users` callable by tests (a standing privilege-escalation footgun worse than the key itself).
**Chosen Solution:** (a). The enumeration's value is that every use is *documented and constrained*, not that the count stays at two.
**Tradeoffs:** The service-role key now exists in test environments; contained by the dev-project-only constraint and SEC-04's audit (updated to include verifying harness code isn't importable from `src/`).
**Future Revisit:** If Supabase ships scoped admin credentials (test-user management without full service role), adopt them and supersede this context.

## ADR-13 — CI-04 migration check: ephemeral Postgres in CI, full-history replay

**Decision:** CI-04 validates migrations by replaying the **entire migration history from scratch** against an ephemeral `supabase/postgres` service container in GitHub Actions, version-pinned to the Cloud project's Postgres version. A second step of the same job runs the migration-history consistency check (`supabase migration list` against the linked dev project) to detect repo↔Cloud drift; this step requires the access token and is **skipped on fork PRs** (GOV-7 — the container step runs credential-free everywhere). Scope clarification: ADR-10 banned a local Docker *development* stack for workflow-simplicity reasons; a CI-only service container does not contradict ADR-10's rationale and is explicitly permitted.
**Status:** Accepted (2026-07-17) — user decision; **amended by ADR-21** (2026-07-19: baseline fixture + drift-check credentials)
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

## ADR-16 — Remaining FK delete actions: tag/conversation children cascade; audit_log is the exception

**Decision:** The delete-action matrix is now complete for all 13 tables. (1) `knowledge_object_tags.tag_id → tags.id` is `ON DELETE CASCADE` — join rows are meaningless without the tag (and `SET NULL` is impossible: the column is part of the composite PK). (2) `chat_messages.conversation_id → chat_conversations.id` is `ON DELETE CASCADE`. (3) `audit_log.knowledge_object_id → knowledge_objects.id` is `ON DELETE SET NULL` — an **explicit exception to ADR-14's blanket cascade**: cascading would erase an object's audit history at purge time, defeating the append-only audit intent ([04_DATABASE.md §8](04_DATABASE.md#8-audit-strategy), OWASP A09 posture in [09_SECURITY.md §10](09_SECURITY.md#10-owasp-top-10-mapping)); the column is already nullable. Everything else is covered by ADR-14 (owner/envelope cascades) and ADR-15 (folder references SET NULL).
**Status:** Accepted (2026-07-17)
**Context:** DB-06 blocked on the unspecified `tag_id` action (Codex escalation — correct call, recommendation accepted). Rather than ruling one column, the architect swept every remaining FK in §4.6–4.13 so no further delete-action escalations are possible; the sweep surfaced the audit_log case where mechanically applying ADR-14 would have been wrong.
**Options Considered:** For tag/conversation children: cascade vs. restrict-with-service-cleanup (more moving parts, blocks deletes on any missed row — the recurring ADR-14 failure shape). For audit_log: cascade (loses history), `SET NULL` (keeps history, loses the object pointer — owner + action + timestamp remain), restrict (blocks the purge job entirely).
**Chosen Solution:** Cascade for true children; `SET NULL` for the audit record.
**Tradeoffs:** Purged objects' audit rows lose their object reference — acceptable: the row's `owner_id`, action, and timestamp still tell the story, and a purged object's id is meaningless anyway. Account deletion still erases the user's whole audit trail via `owner_id` cascade (ADR-14) — correct under FR-AUTH-6's erasure posture.
**Future Revisit:** None; new FK columns must state their delete action at spec time (standing rule from ADR-15).

## ADR-17 — DB-13 hardening dispositions: composite same-owner FKs and blanket owner/FK indexes both declined for MVP

**Decision:** The two hardening candidates escalated by the DB-13 audit are **deliberately not adopted**. (1) Composite same-owner FKs (`FOREIGN KEY (ref_id, owner_id) REFERENCES t(id, owner_id)`) are declined: they would require `UNIQUE(id, owner_id)` on every referenced table and a rewrite of ~10 FKs to close a threat that requires knowing another user's unguessable UUIDv4 and, even then, yields only a dangling invisible reference — no data disclosure (RLS remains the enforcement floor; the service layer validates references under RLS). (2) Blanket owner-leading/FK indexes are declined: every index the documented query patterns need already exists ([04_DATABASE §4](04_DATABASE.md#4-table-definitions)); advisor notices are INFO-only; indexes are added when a measured query needs them ([01_PRODUCT §6.1](01_PRODUCT.md#6-guiding-principles)), not preemptively.
**Status:** Accepted (2026-07-18)
**Context:** Flagged during DB-05 review (FK-vs-RLS bypass observation) and DB-08 review (advisor unindexed-FK notice); the DB-13 audit correctly surfaced both for architect disposition instead of changing schema unilaterally.
**Options Considered:** Adopt now; adopt selectively; decline with recorded revisit triggers.
**Chosen Solution:** Decline both, with triggers below — recorded so the questions cannot resurface as per-table escalations.
**Tradeoffs:** A cross-owner reference planted via a known UUID remains representable at FK level (invisible and harmless under RLS). Some FK columns lack dedicated indexes, making certain cascade deletes marginally slower at scale — irrelevant at MVP volumes.
**Future Revisit:** Composite FKs: if sharing/collaboration features (post-MVP) make other users' object IDs legitimately knowable. Indexes: if a measured slow query or advisor WARN (not INFO) implicates an unindexed FK.

## ADR-18 — Retention purge is a pg_cron-scheduled worker endpoint, Storage-API-first; folders purge included

**Decision:** DB-15 is implemented as: a **pg_cron schedule** (daily) that makes an authenticated HTTP call (`pg_net`, shared-secret header — the embedding-webhook pattern, [09_SECURITY.md §3/T6](09_SECURITY.md#3-authentication)) to a **Vercel purge route handler** running with the service-role key (already an enumerated context, [09_SECURITY.md §5](09_SECURITY.md#5-service-role-key-usage)). The worker, per run: (1) selects expired `knowledge_objects` (`deleted_at < now() - 30 days`, batch-limited); (2) for attachment-type objects, **deletes Storage binaries via the Storage API first**; (3) deletes the envelope rows only after Storage deletion succeeds (FK cascades handle all children per ADR-14/16); (4) purges expired `folders` rows — **§6's hard-delete rule now explicitly includes folders** (ADR-15's `SET NULL` protects any surviving children/notes); (5) is idempotent and partial-failure-safe: Storage "not found" counts as success, and rows are only deleted once their binaries are confirmed gone, so any crash point is safely re-runnable. The cron job reads its endpoint URL + shared secret from Supabase Vault; if unset, it no-ops harmlessly — real values are wired when CI-07 configures environments.
**Status:** Accepted (2026-07-18)
**Context:** Codex blocked DB-15 correctly: pure SQL cannot delete Storage binaries (Supabase requires the Storage API — SQL-only purge orphans files), and §6's hard-delete row named only `knowledge_objects` despite folders being soft-deletable. A pure-`pg_cron` reading of the task was unimplementable as documented.
**Options Considered:** (a) pg_cron → pg_net → service-role worker endpoint (chosen); (b) Vercel Cron → worker (contradicts §6's pg_cron wording; adds a Vercel-plan coupling); (c) SQL-only purge + separate orphan-sweep (guarantees orphaned binaries between sweeps; two eventually-consistent jobs instead of one safe one).
**Chosen Solution:** (a) — it keeps §6's pg_cron scheduler true, reuses the documented webhook auth pattern and the already-enumerated service-role context, and adds zero new infrastructure categories (pg_net already underlies Supabase webhooks, ADR-2).
**Tradeoffs:** DB-15 grows from migration-only to migration + route handler (backlog row updated; complexity stays M). Deployed end-to-end wiring (real URL/secret in Vault + Vercel env) completes at CI-07; until then the schedule exists but no-ops.
**Future Revisit:** If purge volumes ever exceed a single invocation's limits, add pagination/continuation — the idempotent design already permits it.

## ADR-19 — Email confirmation disabled for MVP signup; password minimum 8; templates staged until CI-07

**Decision:** Supabase Auth for the MVP is configured with: **email confirmation off** (signup immediately returns an authenticated session); **minimum password length 8** with no composition requirements (length over complexity); Site URL + a `/**` redirect allow-list per environment; JWT expiry left at the 3600 s default per [09_SECURITY §3](09_SECURITY.md#3-authentication). Auth email templates are **committed to the repo** ([supabase/templates/](../supabase/templates/)) but not applied to the dev project — free-tier projects created after 2026-06-03 cannot customize templates on Supabase's default SMTP ([changelog 46599](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier)); CI-07 configures custom SMTP on production and applies them there. The full setting-by-setting record lives in [supabase/auth-config.md](../supabase/auth-config.md), which the dashboard must match.
**Status:** Accepted (2026-07-18)
**Context:** AUTH-01. A live signup probe against the dev project showed email confirmation **on** (signup returned no session), which fails FR-AUTH-1's acceptance criterion — "a new email/password pair creates an account **and an authenticated session**" — and the PRD §8 E2E journey (signup lands in an authenticated shell, no interstitial). Supabase structurally cannot return a session at signup while confirmation is pending, so the spec forces the setting.
**Options Considered:** (a) confirmation off (chosen); (b) confirmation on + a "check your email" interstitial and resend flow (contradicts FR-AUTH-1's acceptance criterion as written and adds unscoped AUTH UI); (c) confirmation on + service-role auto-confirm endpoint (reimplements the toggle server-side with service-role exposure for zero gain).
**Chosen Solution:** (a) — the only configuration satisfying FR-AUTH-1/FR-AUTH-5 as specified. Password minimum raised 6 → 8 (spec is silent; Supabase's own hardening guidance) without composition rules.
**Tradeoffs:** Unverified addresses can create accounts: acceptable while the product is single-user-scale, and dev's default SMTP only delivers to team addresses anyway. Password reset (FR-AUTH-3) still proves address ownership when exercised. A typo'd signup email locks its owner out of reset — tolerated at MVP scale.
**Future Revisit:** Before production signup opens to real users (CI-07 / M0 exit): re-decide confirmation with a PRD amendment if turned on (FR-AUTH-1's acceptance criterion must change with it), and configure custom SMTP + committed templates at that point.

## ADR-20 — Auth tokens are handled exclusively server-side; session cookies are HttpOnly

**Decision:** All Supabase Auth calls that touch tokens (`signUp`, `signInWithPassword`, future logout/OAuth exchange) run **server-side** — as server actions or route handlers — using the DB-16 cookie-adapter client with every session cookie forced to `HttpOnly; SameSite=Lax` (+ `Secure` in production, matching the theme-cookie precedent since `Secure` breaks plain-HTTP localhost in some browsers). Token refresh happens in `src/middleware.ts` via `supabase.auth.getClaims()` on every matched request, writing rotated cookies with the same hardened flags. The JS-readable browser Supabase client is **deleted**: under this model any client that can read tokens from `document.cookie` is exactly the XSS surface [09_SECURITY §3](09_SECURITY.md#3-authentication) exists to eliminate, and dead code that tempting doesn't get to stay.
**Status:** Accepted (2026-07-19)
**Context:** AUTH-04. 09_SECURITY §3 requires the session JWT in an `HttpOnly` cookie ("never in `localStorage`, which any XSS could read"), but the standard `@supabase/ssr` browser-client pattern — which AUTH-02/03's first-pass wrappers used — stores session cookies readable by JavaScript, which has the identical XSS exposure the spec names. The two cannot coexist; one had to give.
**Options Considered:** (a) keep browser-side auth and weaken 09_SECURITY §3 to match the ecosystem-default pattern; (b) move auth calls into server actions so cookies can be genuinely HttpOnly; (c) hybrid (browser-side auth now, harden later).
**Chosen Solution:** (b). The docs are the source of truth and the requirement is explicit, deliberate, and correct. The architecture already routes all data access server-side through the service layer (components never touch Supabase directly), so nothing else needs browser-held tokens; 03_ARCHITECTURE §6.1's "UI → Auth" remains accurate with the Next.js server as the UI tier. Conversion cost was two wrapper functions.
**Tradeoffs:** Every future feature needing client-side Supabase access (e.g. Realtime subscriptions — currently absent from the MVP architecture) must go through a server-issued mechanism instead of reading cookies. Auth round-trips traverse the Next.js server (negligible; they already traversed Vercel).
**Future Revisit:** If a post-MVP feature genuinely requires browser-held tokens, supersede with a token-broker design — do not resurrect a cookie-reading browser client.

## ADR-21 — CI-04 clarifications: pinned image + baseline fixture; drift check needs token AND database password

**Decision:** Amends ADR-13 with the facts CI-04 implementation surfaced. (1) **Replay job:** pin `supabase/postgres:17.6.1.136` (matching the Cloud project's Postgres 17 line) and, before replaying our history, apply a **commit-pinned initialization fixture** vendored from the official Supabase Docker realm providing the platform baseline our migrations reference (`auth.users`, `storage.objects`/`storage.buckets`, storage policy helpers) — the bare image does not create these; the hosted platform's Auth/Storage services do. The fixture's source commit SHA is recorded next to the file so drift is a reviewable diff, and the job stays credential-free and fork-safe. (2) **Drift check:** `supabase migration list` against the linked dev project requires repository secrets `SUPABASE_ACCESS_TOKEN` **and** `SUPABASE_DB_PASSWORD` (per current Supabase CI guidance — the token alone links, the database password authenticates the pooler connection); the step is explicitly conditioned off for fork PRs (GOV-7; forks also never receive secrets). The dev-project database password entering GitHub Actions secrets is an accepted, enumerated credential context — the production password never will be (CI-07/ADR-12 discipline).
**Status:** Accepted (2026-07-19)
**Context:** Codex blocked CI-04 correctly on two ADR-13 inaccuracies: ADR-13 assumed the access token alone powers the drift check, and assumed the bare `supabase/postgres` image ships a sufficient `auth`/`storage` baseline. Reviewer verified both against current Supabase docs (managing-environments CI guidance names both secrets) and Docker Hub (tag exists, published 2026-06-15).
**Options Considered:** (a) accept the two-secret requirement + pinned fixture (chosen); (b) replace the drift check with a `--db-url` single-secret form (same credential in different clothing, loses the documented CLI path); (c) drop the drift check entirely (loses repo↔Cloud divergence detection, CI-04's second purpose); (d) run migrations against a full docker-compose Supabase stack in CI (heavy, slow, contradicts ADR-13's minimal-container rationale).
**Chosen Solution:** (a). It keeps ADR-13's two-step shape intact and makes both steps actually implementable.
**Tradeoffs:** A vendored fixture must be bumped when our migrations start referencing newer platform objects (reviewable, pinned). Two repository secrets to rotate instead of one.
**Future Revisit:** When CI-07 provisions production, re-verify the fixture against the production project's Postgres version before reuse.

## ADR-22 — Logout uses `signOut({ scope: "local" })`, not the SDK's global default

**Decision:** AUTH-08 logout calls Supabase `signOut({ scope: "local" })` from a server action (ADR-20): it revokes **the current session's** refresh token server-side and clears the HttpOnly session cookies, then redirects to `/login`. It deliberately does **not** use the SDK default `scope: "global"` (which revokes every session on every device the user is signed into).
**Status:** Accepted (2026-07-19)
**Context:** AUTH-08. 09_SECURITY §3 says "explicit logout revokes **the** refresh token server-side" — singular, describing the acting session, not a fan-out to all of the user's devices. `@supabase/supabase-js` defaults `signOut` to `global`, so the correct behavior must be requested explicitly.
**Options Considered:** (a) `local` — revoke only the logging-out session (chosen); (b) `global` — SDK default, revoke all of the user's sessions everywhere; (c) expose scope as a user choice ("log out everywhere" affordance).
**Chosen Solution:** (a). It matches the spec's singular wording and the least-surprise meaning of a logout button: signing out here does not silently kill a user's phone session. Access tokens already expire in ≤1h (§3), so the revoked session's residual window is bounded regardless.
**Tradeoffs:** A user who wants to invalidate a lost device's session cannot do it from a normal logout — that belongs to a future "sign out everywhere" security affordance (revisit trigger below).
**Future Revisit:** A post-MVP account-security surface (alongside MFA on the §12 roadmap) can add an explicit `global`/`others` "sign out other devices" action.

## ADR-23 — `Profile` shape and `updateProfile` display-name validation contract

**Decision:** The `UserService` `Profile` type is `{ id: string; displayName: string | null; email: string; createdAt: string }`. `email` is read-only and sourced from the verified session (`auth.users`) at read time — it is **not** stored on `profiles` and cannot be changed through `updateProfile` in MVP. `updateProfile`'s `displayName` is trimmed; an empty or whitespace-only value clears it to `null`; a non-empty trimmed value must be **1–80 characters** (any Unicode) or the method throws `ValidationError`; omitting the key leaves the stored value unchanged. Recorded in full in [05_API.md §11](05_API.md#11-userservice).
**Status:** Accepted (2026-07-22)
**Context:** AUTH-09 (`getProfile`/`updateProfile`) was correctly **not** started because 05_API §11 named `Profile` as a return type and `ValidationError` as an `updateProfile` failure without ever defining the type's fields or the validation rules — an implementer would have had to invent product decisions (11_CONTRIBUTING §8.3). The `profiles` table (04_DATABASE §4.1) is fully specified (`id`, nullable `display_name`, `created_at`); the two undefined pieces were the DTO shape and the display-name rules. Decided by the user (architect-role escalation).
**Options Considered:** *Profile fields:* (a) `{ id, displayName, email, createdAt }` — include email from the session (chosen); (b) mirror the table exactly (`id, displayName, createdAt`) and have AUTH-10 read email separately. *Display-name rules:* (a) trim + 1–80 + null-clears (chosen); (b) trim + 1–50 + null-clears; (c) required 1–50, empty rejected (cannot clear).
**Chosen Solution:** Profile includes `email` so the AUTH-10 account-settings page has everything it renders from one DTO without a second data source, while keeping email read-only (account email change is out of MVP scope). Display-name allows clearing (matches the nullable column and a signup default of null) with a generous 80-char cap and no character restrictions beyond length (names are international; composition rules add friction, not safety — consistent with ADR-19's stance on passwords).
**Tradeoffs:** Putting `email` on `Profile` means the type mixes a `profiles` column set with a session-derived field; documented explicitly so implementers source it from the verified session, never from client input (09_SECURITY §4). The 80-char cap is a product guess, tunable later.
**Future Revisit:** If account email change (or additional profile fields: avatar, timezone) enters scope, extend `Profile` and add the corresponding `updateProfile` inputs + validation here.

## ADR-24 — OpenAI credentials are deferred from CI-07 to EMB-01

**Decision:** CI-07 closes after the Preview/Production Supabase, webhook-secret, deployment-protection, production-project, Auth, and retention-worker configuration is complete and verified. Distinct Preview and Production `OPENAI_API_KEY` values are deliberately deferred to EMB-01, which must configure and verify both Vercel scopes before any live OpenAI-backed deployment or call. The environment contract and [09_SECURITY §6](09_SECURITY.md#6-secrets-management) inventory remain unchanged: the key stays server-only, per-environment, and never committed.
**Status:** Accepted (2026-07-22) — explicit user decision
**Context:** CI-07's original backlog row bundled OpenAI credentials with the M0 deployment foundation even though no OpenAI client or live AI consumer exists yet. The user chose to provision billing-bearing OpenAI credentials later. All other CI-07 environment work is live and verified, so keeping the task open would make unrelated M0 completion depend on a credential that cannot be exercised until EMB-01.
**Options Considered:** (a) keep CI-07 open until both OpenAI keys exist; (b) close CI-07 and defer scoped key provisioning to EMB-01 (chosen); (c) use one shared key across Preview and Production (rejected — violates the per-environment separation required by 09_SECURITY §6).
**Chosen Solution:** (b). EMB-01 is the first task that introduces the typed OpenAI client boundary and can validate the credentials against a real, mockable consumer. It now owns adding distinct keys to Vercel Preview and Production, redeploying, and verifying scope isolation before completion.
**Tradeoffs:** M0 deployments cannot execute future OpenAI-backed behavior until EMB-01 supplies the keys; currently there is no such behavior to break. Moving the credential gate closer to first use avoids idle secret exposure and premature spend configuration, but EMB-01 gains a small operational step.
**Future Revisit:** None. If a live OpenAI consumer is scheduled before EMB-01, that task is blocked until EMB-01 (including its credential setup) is complete.

## ADR-25 — AI features are built but per-user gated; the gate is an operator-set SQL flag (no admin role in MVP)

**Decision:** All OpenAI-backed features — the embedding pipeline (EMB), hybrid/semantic search (SEM), and AI chat (AICH/VCH) — are implemented on the documented roadmap but ship **gated per user and disabled by default**. For the MVP the per-user gate is a single `profiles.ai_enabled` boolean, toggled **directly in the database (SQL / Supabase dashboard) by an operator with database access**. **No admin role, admin actor, or admin panel is added in the MVP** — so the existing "no admin concept" architecture is unchanged. An in-app admin role and management UI are explicitly deferred to a future phase.
**Status:** Accepted (2026-07-22) — explicit user decision. Supersedes the earlier "skip OpenAI for now" framing (AI is built, not deferred) and the earlier per-user-*admin* framing (MVP uses an operator SQL toggle, not an in-app admin).
**Context:** The product owner chose to build AI while controlling exposure — no user sees AI until it is turned on for that specific user — but wants the smallest MVP mechanism. The current architecture deliberately has **no** admin concept: `profiles` RLS is `id = auth.uid()` (ADR-11, [04_DATABASE §7](04_DATABASE.md#7-row-level-security-rls-policies)) and "[no] admin read path to user content exists in the schema" ([09_SECURITY §4](09_SECURITY.md#4-authorization-model)). An operator-set SQL flag preserves both properties: it adds a per-user entitlement without introducing any in-product admin actor.
**Options Considered:** (a) skip AI / defer to a later phase (rejected — owner wants it built now, gated); (b) global operator switch, one flag for everyone (rejected — no per-user control); (c) in-app per-user **admin** gating with an `is_admin` role + management UI (rejected for MVP — more architecture than needed now; deferred to a future phase); (d) **per-user gate via an operator-set SQL flag, no admin role** (chosen).
**Chosen Solution:** (d). Mechanism (the security constraints below are binding):
- **Schema:** add exactly one column — `profiles.ai_enabled boolean not null default false` (the per-user entitlement). **No `is_admin` column** and no roles table in MVP.
- **Who sets it:** an operator toggles `ai_enabled` per user directly via SQL / the Supabase dashboard, using database access that already bypasses RLS. There is no in-app toggle and no admin service method in MVP.
- **Self-grant prevention (binding):** the existing `profiles` `UPDATE` policy (`id = auth.uid()`) lets a user mutate their own row, so `ai_enabled` must be **write-protected from the owning user** — column-level `REVOKE UPDATE (ai_enabled)` from the authenticated role (and/or a trigger). The flag is writable only out-of-band (SQL / service-role, which bypasses RLS), never by the user. A regular user must be structurally unable to enable AI for themselves. `ai_enabled` remains user-**readable** on their own row (`id = auth.uid()` SELECT is unchanged) so the app can reflect gate state.
- **User contract unchanged:** `updateProfile` (ADR-23) never accepts `ai_enabled`.
- **Runtime gating:** the async embed worker (ADR-2) checks the note owner's `ai_enabled` before calling OpenAI and no-ops otherwise; hybrid search degrades to keyword-only (the SEM-06 graceful-degradation path) when the caller is not AI-enabled; AI chat UI is hidden and its endpoints reject when the caller is not AI-enabled.
**Tradeoffs:** Turning a user's AI on/off is a manual DBA action with no in-app affordance and no audit trail beyond database logs — acceptable at MVP scale, explicitly a future improvement. Keeping the flag operator-only (no admin actor) means no new admin RLS surface and the [09_SECURITY §4](09_SECURITY.md#4-authorization-model) "no admin read path to user content" invariant is untouched. Gated AI still complicates search/chat tests, which must cover both enabled and disabled callers.
**Ripples (implementers must honor, not yet applied to the specs):** [04_DATABASE](04_DATABASE.md) — `profiles.ai_enabled` column + column-privilege `REVOKE` + a GOV-6 test proving a user cannot self-enable; [09_SECURITY](09_SECURITY.md) — note the operator-only gate flag (no admin actor added); [05_API](05_API.md) — `updateProfile` exclusion of `ai_enabled`; [07_AI](07_AI.md)/EMB — owner `ai_enabled` check in the embed worker; [08_SEARCH](08_SEARCH.md)/SEM — degradation when disabled; [12_TASKS](12_TASKS.md) — gating acceptance criteria on EMB/SEM/AICH/VCH. Interacts with **ADR-24**: the `OPENAI_API_KEY` is still provisioned there (at/around EMB-01); a live key does not ungate any user.
**Future Revisit:** Add an admin role + admin panel + in-app per-user AI toggle (the deferred option (c)); at that point introduce `is_admin` (or a roles table), an admin-only service method, an admin RLS branch scoped to the gate, and an audit trail of toggles. If AI becomes generally available at launch, flip the default or retire the gate.

## ADR-26 — Inaccessible resources return `NotFoundError`, not `ForbiddenError` (no existence oracle)

**Decision:** For every owner-scoped single-resource access (`get`/`update`/`delete`/`restore`/tag operations across `NoteService`, `FolderService`, `AttachmentService`, `ChatService`, `UserService`), a target that is nonexistent, soft-deleted, **or owned by another user** uniformly raises `NotFoundError`. Services do **not** distinguish "foreign-owned" from "nonexistent" and do **not** raise `ForbiddenError` for cross-owner access. `ForbiddenError` remains in the error taxonomy but is reserved for the future case where a caller can already see a resource yet lacks permission for the operation (the shared/multi-owner-graph model, [04_DATABASE §10](04_DATABASE.md#10-future-schema-considerations)) — a case that does not arise under the current uniform owner-RLS model.
**Status:** Accepted (2026-07-23) — explicit user (product-owner) decision on an architect-surfaced conflict.
**Context:** NOTE-03 (`NoteService.get`) surfaced a genuine contradiction. The old [05_API §3](05_API.md#3-error-taxonomy) intent had a service throw `ForbiddenError` "when a query legitimately returns zero rows because RLS filtered them" — but an RLS-scoped query cannot tell *why* it got zero rows: nonexistent, soft-deleted, and foreign-owned are indistinguishable by design ([04_DATABASE §7](04_DATABASE.md#7-row-level-security-rls-policies)). The only way to distinguish them is a privileged existence probe (service-role or `SECURITY DEFINER`), which [09_SECURITY §5](09_SECURITY.md#5-service-role-key-usage) prohibits outside its enumerated contexts — and which would itself be an **enumeration oracle**, letting any authenticated user discover which object IDs exist across all users. Note/object IDs are unguessable UUIDv4, so practical risk is low, but distinguishing the cases is an information leak that contradicts RLS's deliberate indistinguishability.
**Options Considered:** (1) collapse foreign-owned → `NotFoundError` (chosen); (2) add a narrow `SECURITY DEFINER` existence probe to preserve `ForbiddenError` (rejected — creates the enumeration oracle, expands the constrained service-role/`SECURITY DEFINER` surface, needs its own security-doc change); (3) return `ForbiddenError` for every empty result (rejected — real nonexistent notes would then violate the documented `NotFoundError` contract, and it still leaks existence).
**Chosen Solution:** (1). It is the industry-standard secure pattern (e.g., a private resource you cannot see returns 404, not 403), it is RLS-native (the empty result already maps to `NotFoundError`), it needs no privileged code, and it closes the enumeration leak. The `ForbiddenError` taxonomy entry is retained and re-scoped for the future shared-graph authorization model.
**Tradeoffs:** A user who genuinely owns nothing at a given ID and one who is denied someone else's note get the same 404 — slightly less "helpful" than a 403, but that ambiguity *is* the security property. Any future shared/multi-owner model must re-introduce `ForbiddenError` where a resource is visible-but-not-permitted, and add tests for it.
**Applied to specs:** [05_API §3](05_API.md#3-error-taxonomy) — `NotFoundError`/`ForbiddenError` rows redefined + the 404-over-403 rule stated; `ForbiddenError` removed from the error column of every owner-scoped single-resource method in §4–§11. No code existed yet for the affected methods beyond `NoteService.create` (which has no such lookup).
**Future Revisit:** The shared/multi-owner-graph feature ([04_DATABASE §10](04_DATABASE.md#10-future-schema-considerations)) — it must define exactly when a visible resource is permission-denied and restore `ForbiddenError` there.

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

## GOV-8 — `E2E (preview)` and `Accessibility` are required branch-protection checks

**Decision:** The `E2E (preview)` and `Accessibility` (axe/WCAG 2.1 AA) CI jobs are **required** status checks on `main` (added 2026-07-24 via the GitHub branch-protection API; `strict: true` / up-to-date-branches preserved). Merging is blocked until both pass, alongside the existing six (Typecheck, Lint, Format, Unit tests, Dependency audit, Migration check).
**Status:** Accepted (2026-07-24) — user decision, recorded by the reviewer
**Context:** CI-06/CI-08 (PRs #109/#111) added these jobs; they had run advisory-only through several clean live cycles. With the note-taking UI (Sprint 5) now landing real rendered surfaces, a browser-verified functional + accessibility gate is worth making merge-blocking.
**Options Considered:** (a) make both required (chosen); (b) keep advisory (a preview-lane flake can never block, but a real UI/a11y regression can merge); (c) defer to Sprint 5 close.
**Chosen Solution:** (a). Unit tests miss axe color-contrast/landmark failures and never exercise a real deployment; gating on the preview jobs closes that gap.
**Tradeoffs:** The preview lane occasionally flakes when Vercel misses creating a deployment for a commit (seen on PR #117), which now **blocks merge** until re-triggered (e.g., an empty commit). Both jobs remain fork-safe and skip-until-provisioned (GOV-7); since the repo works on same-repo branches with secrets provisioned, they execute normally. A skipped-because-unprovisioned state would block merge — acceptable, as it signals a real misconfiguration.
**Future Revisit:** If preview-lane flakes become frequent, harden `tools/ci/wait-for-vercel-preview.sh` (longer window / deployment-trigger nudge) before reconsidering the gate.

## ADR-27 — Production database migrations deploy via the Supabase GitHub integration (not GitHub Actions)

**Decision:** Production schema migrations are applied to the production Supabase project (`hqzakxpbxqzxismmgnyn`) automatically by the **Supabase GitHub integration**'s "Deploy to production" workflow, triggered on merge to `main`. The integration reads `supabase/migrations/` and applies pending migrations on Supabase's own infrastructure — no `supabase db push` from a laptop and no production database password in the CI runner. Preview **Branching** (per-PR isolated databases, Pro-plan only) is explicitly out of scope; only the all-plans "deploy from `main`" capability is used.
**Status:** Accepted (2026-07-26) — user decision (Option 2), recorded by the architect; **revised 2026-07-26 after review** to make deploy-ordering a blocking requirement, correct the `config.toml` fact (it does not exist), and reconcile CI-09's initial validation with the no-op first run. **Implementation is owned by Codex** (task CI-09); this ADR is the spec, not the implementation.
**Context:** The 2026-07-26 production outage (note create → HTTP 500) was caused by application code shipping ahead of its schema: production sat at 17 migrations while the deployed app required 20 (the `create_note`/`update_note` RPCs and `profiles.delete_requested_at` were missing). CI-04's `Migration check` validates only the **development** project; nothing applied migrations to production after the one-time manual bootstrap in CI-07. A permanent, automated production-migration path is required so schema can never silently fall behind deployed code again.
**Options Considered:**
- (a) **GitHub Actions job running `supabase db push` to production on merge to `main`** — the Supabase-documented `production.yml` pattern (verified in the current docs: it needs `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`). **Rejected:** it requires the **production DB password as a GitHub Actions secret**, which **ADR-21 explicitly forbids** ("the dev-project database password entering GitHub Actions secrets is an accepted, enumerated credential context — the production password never will be").
- (b) **Supabase GitHub integration (chosen).** The deploy workflow runs on Supabase's side (Clone → Pull → Health → [Configure] → Migrate → Seed → Deploy), so **no production DB password ever enters GitHub Actions** — it **honors ADR-21** rather than amending it. Verified in the current Supabase docs to work on **all plans** (free tier included; Branching is the Pro-only extension). Supabase's own Production Checklist recommends it: "enable **Deploy to production** in the integration settings … avoids manual `supabase db push` from a local machine."
- (c) **Manual, documented release step.** Rejected — it relies on a human remembering, which is exactly the failure mode that caused this outage.
**Chosen Solution:** (b). It closes the automation gap without violating ADR-21's prohibition on production credentials in CI, adds **no new secret**, and is the vendor-recommended path for this exact workflow.
**Tradeoffs / risks (binding notes for CI-09):**
- **Deploy ordering is a blocking requirement, not an accepted race.** [03_ARCHITECTURE.md §8](03_ARCHITECTURE.md#8-deployment-architecture) makes "schema changes ship before dependent code" **binding**, and [11_CONTRIBUTING.md](11_CONTRIBUTING.md) (every-PR rule 4) ships the migration in the **same PR** as its code. Automation prevents *persistent* drift, but if the Supabase deploy and the Vercel production deploy both fire on merge to `main` **concurrently**, it does **not** prevent a transient window where new code hits the old schema — the **same failure class as this incident**. Simply accepting that race is therefore **not** acceptable. **CI-09 must establish a dependable ordering guarantee**, in preference order: **(1)** gate Vercel production promotion on the Supabase migration deploy via [Vercel Deployment Checks](https://vercel.com/docs/deployment-checks), so production code is promoted only *after* the migration lands — this preserves both §8 and the same-PR rule; **(2)** if the Supabase integration cannot expose a check Vercel can dependably gate on, fall back to a **two-PR ordering** — *additive*: migration PR → verify production parity → dependent application PR; *destructive*: application-removal PR → migration PR — which **requires amending the [11_CONTRIBUTING.md](11_CONTRIBUTING.md) same-PR rule** (rule 4) for schema-dependent changes, recorded as its own decision.
- **Scope of what the integration deploys — `config.toml` does not exist yet.** Besides migrations the integration also deploys Edge Functions and applies `supabase/config.toml`-declared service settings. **There is currently no `supabase/config.toml` in the repo** (only `supabase/migrations/`, `auth-config.md`, and `templates/`). CI-09 must therefore first establish either that the integration **applies migrations with no `config.toml` present**, or add a **reviewed minimal `config.toml` that declares no `[auth]`/`[api]`/SMTP settings** so it can never override the dashboard-managed production Auth/SMTP/OAuth (owned per ADR-24 / `supabase/auth-config.md`). Whichever holds, CI-09 must confirm — before and after enabling — that production Auth configuration is untouched.
- **Connect the production project only** (`hqzakxpbxqzxismmgnyn`) to the repo's `main` branch. The development project (`zkzyfwclvquiargnwgtw`) stays as-is (local development + the CI-04 drift target).
- **First run is a no-op — so define initial validation accordingly.** Production is already at 20/20 parity after the 2026-07-26 remediation, so the integration has nothing pending initially; it engages on the next migration merged to `main`. CI-09 must **not** invent a throwaway migration to test it. Acceptable initial validation is: the integration connects and runs a **successful (empty) deployment**, and a **`supabase migration list` readback confirms 20/20 parity**. Full end-to-end auto-apply is then confirmed **with the next legitimate migration** that ships, at which point CI-09 can be marked Done (or split: enable-and-validate now, confirm-auto-apply on the next real migration).
**Relationship to ADR-21:** **Honored, not amended.** ADR-21's "production password never in GitHub Actions" still stands; this decision deliberately chose the mechanism that keeps it true.
**Future Revisit:** If neither ordering guarantee above proves workable in practice, moving to the Actions `db push` pattern would require an explicit ADR-21 amendment (production DB password in CI) and is the last resort. If the project moves to the Pro plan, enable Branching to preview/test migrations per-PR before they reach production.

## ADR-28 — Trash listing is a dedicated `NoteService.listTrash`, with `/api/notes/trash` and `/api/notes/[id]/restore`

**Decision:** `NoteService` gains `listTrash(PaginationOptions) → Paginated<TrashedNote>` where `TrashedNote = Note & { deletedAt: string }`. It returns only the caller's soft-deleted notes still inside the 30-day retention window (04_DATABASE §6), most recently deleted first, keyset-paginated on `(deleted_at desc, id desc)` behind the same opaque cursor shape as `list`. Like `list`, it declares no errors (limit clamps 1–100; a malformed cursor restarts from page one). The Web API exposes it as `GET /api/notes/trash`, and exposes the existing `restore` as `POST /api/notes/[id]/restore`.
**Status:** Accepted (2026-09-27) — explicit user (product-owner) decision on an implementer-surfaced spec gap.
**Context:** NOTE-12 ("Trash view: list soft-deleted notes, restore action") requires listing trash, but 05_API §4 defined `restore` and no way to enumerate restorable notes. 04_DATABASE §6 already sanctions a *deliberate* trash query ("every repository read filters `deleted_at IS NULL` unless explicitly querying trash"; RLS governs ownership, not soft-delete state), so only the service contract was missing.
**Options Considered:** (1) a dedicated `listTrash` method (chosen); (2) a `trashed: true` flag on `list`.
**Chosen Solution:** (1). `list` keeps a single meaning (active notes, `updated_at` order, folder filter); trash has a different sort key, a retention bound, and a richer item shape (`deletedAt`, so the UI can show time left before purge). Expired-but-unpurged rows are excluded because `restore` would refuse them anyway.
**Tradeoffs:** One more method on the NoteService surface. MCP (06_MCP) does not gain a trash tool — MCP parity (FR-MCP-2) covers the documented tool list only; a trash tool would need its own decision.
**Applied to specs:** [05_API §4](05_API.md#4-noteservice) — `listTrash` row + behavioral note.
**Future Revisit:** When folders gain a trash view (FOLD-*), decide whether trash becomes a cross-type `KnowledgeObject` listing rather than per-service.

## ADR-29 — Daily-note conventions: ISO-date title, fixed template, auto-restore from trash, browser-local "today"

**Decision:** `NoteService.getOrCreateDailyNote(date)` (1) validates `date` as a real `YYYY-MM-DD` calendar date (`ValidationError` otherwise — input validation, not a contract error); (2) returns the active daily note for that date; (3) if that date's note is **in trash**, restores it (ignoring the 30-day window, since an expired-but-unpurged row still occupies the unique index) and returns it; (4) otherwise creates it with **title = the ISO date** (e.g. `2026-09-27`) and a **fixed MVP template** body `## Notes` / `## Tasks` with an empty checkbox; (5) a create that loses the `(owner_id, daily_note_date)` unique-index race re-reads the winner, so no `ConflictError` surfaces. "Today" is the user's **local** calendar day, resolved in the browser (`/daily` → `/daily/<date>`); the server never guesses a timezone.
**Status:** Accepted (2026-09-27) — explicit user (product-owner) decisions on three implementer-surfaced gaps (title format, template content, trashed-daily-note behavior).
**Context:** FR-DAILY-1/3 require "created automatically from a template" and a "naming/date convention", but no spec defined either; the unique index includes soft-deleted rows, so a trashed daily note would otherwise block reopening that date.
**Options Considered:** Title — ISO date (chosen) / long-form localized / weekday+ISO. Template — fixed minimal (chosen) / empty. Trashed daily — auto-restore (chosen) / detach the date on delete / error.
**Chosen Solution:** As above. ISO titles are sortable, locale-neutral, and clean `[[wiki link]]` targets; auto-restore keeps "one action opens today" true without losing content.
**Tradeoffs:** The template is not user-editable in MVP. Restoring an old daily note surprises nobody but does resurrect content the user trashed.
**Applied to specs:** [05_API §4](05_API.md#4-noteservice) behavioral note on `getOrCreateDailyNote`.
**Future Revisit:** User-editable templates (settings) — needs a storage decision (profile column vs. a template note).

## ADR-30 — FolderService composes NoteService for contained notes; folder deletes are ordered, not transactional

**Decision:** `FolderService.delete`/`move` never write `notes` or `knowledge_objects`. Contained notes are relocated (`move_to_parent`) or trashed (`delete_contents`) through `NoteService.update`/`delete`, one note at a time, before the folder rows change; folder rows are then re-parented/soft-deleted through `FolderRepository`. There is no multi-table RPC. Cycle detection for `move` loads the owner's active folders and walks up from the destination. The Web API is `GET/POST /api/folders` (tree / create), `PATCH /api/folders/[id]` (`name` renames, `parentFolderId` moves; `null` = root) and `DELETE /api/folders/[id]?strategy=…` (no default).
**Status:** Accepted (2026-09-27) — implementer decision within the existing contract; flagged for reviewer confirmation.
**Context:** 05_API §12 rules 3–4 forbid FolderService from writing type-owned tables, and 04_DATABASE §4.3 makes NoteService the only writer of `notes`. A single `delete_folder` RPC would be atomic but would be a second writer of `notes`, and under ADR-10/CI-09 any new migration also needs the dev Cloud project migrated before the Cloud-drift CI check passes.
**Options Considered:** (1) compose NoteService, ordered steps (chosen); (2) a `SECURITY INVOKER` `delete_folder` RPC touching folders + notes + envelope atomically.
**Chosen Solution:** (1). Every step is idempotent and ordered so contents move before their container disappears: a partial failure leaves notes either still in the (still-visible) folder or already relocated/trashed (restorable), and retrying the same delete completes it. No note is ever orphaned in a hidden folder by a failure.
**Tradeoffs:** Not atomic; N+1 requests for large folders (fine at MVP scale, bounded by a batch guard). A concurrent move could, in principle, race the cycle check (two simultaneous cross-moves) — accepted for a single-user MVP. Notes restored from trash whose folder was later trashed keep that `folder_id` and appear only in the flat note list until moved.
**Future Revisit:** If folder operations show latency or partial-failure reports, move them into an RPC and amend the §4.3 single-writer rule accordingly.

## ADR-31 — Tag shape and tagging rules

**Decision:** (1) `Tag = { id, name }`, and `KnowledgeObjectSummary.tags` is `Tag[]` (sorted by name) — clients need the id because `removeTag` takes `tagId`. (2) Tag names are trimmed, a leading `#` is stripped, empty names are rejected, and names are capped at **64 characters** (`ValidationError`). (3) `NoteService.addTag` creates the tag on first use via a case-insensitive exact lookup (LIKE wildcards escaped) against the `(owner_id, lower(name))` index, re-reading on a lost insert race; re-attaching is a no-op. `removeTag` of a tag not on the note is a no-op (only a missing/trashed note is `NotFoundError`). (4) Unused tags are kept (no tag delete in MVP). (5) Web API: `POST /api/notes/[id]/tags {name}`, `DELETE /api/notes/[id]/tags/[tagId]`, `GET /api/tags`, `GET /api/tags/[id]/objects` (keyset-paged, active objects only, unknown tag → 404).
**Status:** Accepted (2026-09-27) — implementer decisions filling unspecified details within the 05_API §4/§6 contracts; flagged for reviewer confirmation. The 64-character cap is the only new product constraint.
**Context:** 05_API names `tags` on `KnowledgeObjectSummary` without a shape and defines no tag-name validation.
**Options Considered:** `tags: string[]` (names only — cannot drive `removeTag(tagId)` without a second lookup) vs. `Tag[]` (chosen).
**Chosen Solution:** As above; tag rows are written by the owning object's service (05_API §6 note), tag reads by `SearchService`.
**Tradeoffs:** Orphaned tags accumulate in the sidebar until a tag-management feature exists.
**Applied to specs:** [05_API §2 Shared Types](05_API.md#shared-types) — `Tag` row; `KnowledgeObjectSummary.tags` typed.
**Future Revisit:** Tag rename/merge/delete (post-MVP tag management).

## ADR-32 — Wiki-link syntax, resolution, and where link maintenance runs

**Decision:** (1) **Syntax:** a wiki link is `[[Title]]` on one line — non-empty trimmed title without `[`, `]` or newline; **no alias syntax** in MVP (`|` is part of the title); links inside fenced code blocks and inline code spans are not links. Parsing is TypeScript (`features/notes/wiki-links.ts`, LINK-01) and is shared by the service, backlink snippets, and the editor. (2) **Resolution:** a title resolves, case-insensitively, to the owner's **oldest active** note with that title; unresolved titles and self-links produce no edge; edges to trashed targets are dropped on the source's next save. (3) **Transactionality:** the service passes the parsed titles to `create_note`/`update_note` (new `p_link_titles text[]` parameter, default `null`), and resolution, edge reconciliation (`reconcile_note_links`), rename propagation (`[[old]]` → `[[new]]`, case-insensitive, in active linking notes, bumping their `updated_at`), and **dangling-link attachment** (`attach_dangling_note_links`: when a note is created or renamed, active notes already containing `[[its title]]` gain an edge — makes FR-LINK-4 create-on-click backlinks correct) all run inside that one RPC transaction. (4) **Autocomplete:** `pg_trgm` GIN index on `notes.title` + `suggest_note_titles(owner, query, limit)` ranking prefix → substring → fuzzy (similarity ≥ 0.3), LIKE-escaped, limit 1–50. (5) **Graph:** `GraphService` reads `knowledge_objects`/`links` directly (05_API §12 rule 1); a folder filter includes subfolders (via `FolderService.getTree`); local graph follows links both ways, depth clamped 1–3. (6) **Web API:** `GET /api/notes/[id]/backlinks`, `GET /api/search/titles?q=&limit=`, `GET /api/graph?tagId=&folderId=`, `GET /api/notes/[id]/graph?depth=`.
**Status:** Accepted (2026-09-27) — implementer decisions filling details the specs leave open; flagged for reviewer confirmation. Migrations `20260927220000_add_wiki_link_reconciliation` and `20260927220100_add_note_title_trigram_suggest` were replayed from scratch and exercised against a local Supabase Postgres 17 + PostgREST stack; **they have not been applied to the dev Cloud project** (Supabase MCP unavailable in the authoring session), so the CI Cloud-drift check will fail until someone applies them (ADR-10 workflow).
**Context:** 04_DATABASE §4.8 and 05_API §4 require reconciliation and rename propagation "in the same transaction as the note save", which a sequence of PostgREST calls cannot provide.
**Options Considered:** (a) parse + reconcile in SQL entirely (rejected — markdown parsing rules would live in two languages); (b) TS parse, SQL resolve/reconcile inside the save RPC (chosen); (c) separate reconcile RPC after the save (rejected — not the same transaction).
**Chosen Solution:** (b). The regex used by rename propagation and dangling attachment is a deliberate over-approximation (it does not skip code blocks); each source's next save re-reconciles precisely.
**Tradeoffs:** Rename propagation also rewrites a matching `[[old]]` inside a code block. Dangling attachment scans the owner's note bodies on create/rename (bounded by the 10k-note NFR). Duplicate titles are legal; links pick the oldest.
**Applied to specs:** [04_DATABASE §4.8](04_DATABASE.md#48-links) write-rule note; [05_API §4](05_API.md#4-noteservice) `getBacklinks` note; [08_SEARCH §6](08_SEARCH.md#6-wiki-links--autocomplete) ranking note.
**Future Revisit:** Alias syntax (`[[Title|label]]`) and heading links (`[[Title#Heading]]`) if users ask; a dedicated wiki-link editor node.

## ADR-33 — Graph canvas: React Flow (`@xyflow/react`) with a precomputed `d3-force` layout

**Decision:** The graph view (GRAPH-04..17) renders with **`@xyflow/react` 12** (React Flow, already the documented renderer, 03_ARCHITECTURE §2.1 / 10_DESIGN §10). Layout comes from **`d3-force` 3** (ISC; 3 tiny deps), run **synchronously off-screen to a fixed tick budget** in a pure function (`features/graph/graph-layout.ts`); React Flow only renders the final positions. Details:
- Graphs with more than 500 nodes get 120 ticks, cool faster so the layout still settles within that budget, and drop the collision force.
- Warm starts reuse cached positions from `sessionStorage` (GRAPH-17).
- Node diameter grows logarithmically with degree; orphans are muted.
- Edges are straight lines from node center to node center.
- Nodes are non-draggable and carry React Flow's `nopan` class. Without it, pressing a non-draggable node starts a canvas pan that captures the pointer and swallows the click.
- Keyboard and screen-reader access goes through a synchronized notes list next to the canvas (GRAPH-11). Canvas nodes are not focusable.

Routes: `/graph` shows the whole graph and `/graph?note=<id>&depth=1..3` a local graph; ⇧⌘G opens the graph.

**Status:** Accepted (2026-09-28): the user approved the next step (GRAPH-04) and the dependency was flagged for review.

**Context:** 10_DESIGN §10 requires a "force-directed layout" but names no layout engine, and React Flow ships none. There's also a 2,000-node interactivity requirement (GRAPH-13).

**Options Considered:** (1) `d3-force`, precomputed (chosen); (2) hand-rolled Fruchterman–Reingold, which is O(n²) per tick and too slow at 2,000 nodes without a quadtree; (3) live animated simulation, which keeps the main thread busy while you interact; (4) ELK/dagre, which are hierarchical layouts, not force-directed.

**Chosen Solution:** (1). Barnes–Hut repulsion keeps it fast: a cold layout of 2,000 nodes takes about 1.2s under jsdom in the unit test (budget 3s), and warm starts are about 4× cheaper. Doing it as a pure function keeps it testable and cacheable.

**Tradeoffs:** Two runtime dependencies (`@xyflow/react` ≈1.2 MB unpacked, loaded only on `/graph`; `d3-force` ≈90 KB). The layout doesn't animate. Past a few hundred nodes, the local graph remains the intended way in (10_DESIGN §10).

**Future Revisit:** Move the layout into a Web Worker if cold layouts on real 2k-node graphs are felt as jank.

## ADR-34 — Editor code highlighting (lowlight, curated grammars) and GFM tables

**Decision:** Fenced code blocks (EDIT-06) use Tiptap's **`@tiptap/extension-code-block-lowlight`** with **`lowlight` 3 / `highlight.js` 11** and a **curated set of 15 grammars** (bash, css, diff, go, java, javascript, json, markdown, python, rust, shell, sql, typescript, xml/html, yaml — each with its aliases), registered in `features/editor/code-languages.ts`. Highlighting is decoration-only; the fence's info string round-trips unchanged, and a fence in any other language renders unhighlighted. Colors are token-driven and **single-accent** (10_DESIGN §3.3): keywords, literals and numbers take `primary`, comments and attributes `muted-foreground`, with weight and italics carrying the rest. Code blocks sit on `background` (bordered) rather than `muted`, because `primary` text on dark `muted` is ~4.0:1 and on dark `background` ~5.4:1.

GFM tables (EDIT-07) use **`@tiptap/extension-table`** (header row + cells, no column resizing — widths have no markdown form), with its markdown serializer wrapped to (a) escape `|` inside cell content — upstream writes it raw, which splits the cell on the next load (silent content loss, FR-NOTE-2) — and (b) trim the newlines the upstream renderer wraps the table in. A multi-paragraph cell serializes with `<br>`, which the table parser reads back as paragraphs, so `detectUnsupportedMarkdown` treats `<br>` on a table row as table syntax, not HTML.

**Status:** Accepted (2026-09-28) under the user's "continue with the next tasks" direction; dependencies flagged in the PR body per 11_CONTRIBUTING §6.

**Context:** 10_DESIGN §7 requires token-driven, theme-tested syntax highlighting, and 12_TASKS EDIT-06/07 require code blocks, tables, quotes and rules. Tiptap ships none of highlighting or tables in StarterKit.

**Options Considered:** (1) lowlight with the curated grammar set (chosen); (2) lowlight's `common` set (~35 grammars) — measured +70 kB First Load JS on `/notes/[id]`, versus +37 kB for the curated set; (3) Shiki — higher-fidelity themes but WASM/oniguruma-sized and theme-by-palette, at odds with the token layer; (4) no highlighting — contradicts 10_DESIGN §7.

**Chosen Solution:** (1). Measured with `next build`: `/notes/[id]` First Load JS 305 kB → 356 kB (tables ≈ +14 kB, highlighting ≈ +37 kB).

**Tradeoffs:** Four runtime dependencies (`@tiptap/extension-code-block-lowlight`, `@tiptap/extension-table` — same family and version as the existing Tiptap pins — plus `lowlight` and `highlight.js`, BSD-3). The editor route grows by ~51 kB. Languages outside the curated set are not highlighted.

**Future Revisit:** PERF-06 (bundle audit / editor lazy loading) — load `highlight.js` and the grammars on first code block instead of with the editor; add languages on demand if users ask.

## ADR-35 — Audit rows are written inside the note RPCs, in the mutation's transaction

**Decision:** NOTE-13's audit log writes (04_DATABASE §8) happen **inside the database RPCs that perform each note mutation**, in the same transaction:
- `create_note` and `update_note` gain `p_actor text default 'user'`.
- Soft delete and restore move from plain `knowledge_objects` updates into new RPCs, `delete_note` and `restore_note`, so they are audited atomically too.
- A shared `write_note_audit` helper builds the row.
- **Metadata:** `{"fields": [...]}` holds only the names of fields whose value actually changed; an update that changes nothing writes no row. There is never any content.
- **Rename propagation:** its rewrites of linking notes are recorded as `actor = 'system'`, with `{"cause": "rename_propagation", "source_object_id": …}`.
- **Actor source:** `NoteRepository` takes the actor at construction (`"user"` for the web app). Future MCP/AI entry points construct theirs with their own actor.
- All functions stay SECURITY INVOKER with an empty `search_path`; RLS (`audit_log_insert_own`) remains the floor.

**Status:** Accepted (2026-09-28) by the user, choosing "Inside note RPCs (Recommended)" when asked.

**Context:** 04_DATABASE §8 defines what is captured (actor, action, target, changed fields; append-only) but not where rows are written. Create and update already ran through RPCs, while delete and restore did not.

**Options Considered:**
- **(1) Inside the note RPCs** (chosen).
- **(2) Row triggers on `knowledge_objects`/`notes`.** Atomic and path-independent, but the actor needs a per-transaction setting, and every internal write (propagation, link bookkeeping) would log implicitly.
- **(3) Service-layer inserts after each mutation.** Not atomic: an audit row can be lost after a committed change.

**Chosen Solution:** (1). Atomic, with explicit attribution at the call site and no hidden write paths.

**Tradeoffs:**
- Every new mutating note path must go through an audited RPC; the replay guard asserts the functions exist.
- `actor` is supplied by the caller. A user with their own session could call the RPC directly with another actor value, or insert audit rows directly, which the existing insert policy already allows. Attribution is therefore trustworthy for writes made through the app's service layer, and forgery can only mislead the user's own log.

**Applied to specs:** [04_DATABASE §8](04_DATABASE.md#8-audit-strategy) gains a "How it's written" row.

**Future Revisit:** When MCP or AI writes land, decide whether their actor must be enforced server-side (e.g. a SECURITY DEFINER audit writer that derives the actor from the JWT) rather than passed as a parameter.

## ADR-36 — Full-text search: marker-delimited snippets and an offset cursor over a deterministic rank order

**Decision:** Full-text search (FTS-01..03) runs in one SECURITY INVOKER SQL function, `search_notes`.
- **Query parsing:** `websearch_to_tsquery('english')`, as 08_SEARCH §2 specifies.
- **Ranking:** `ts_rank_cd` order, with ties broken by `updated_at desc, id desc`.
- **Snippets:** `ts_headline`, computed only for the returned page.
- **Match markers:** snippets wrap each match in the control characters U+0002/U+0003 rather than HTML. The client splits on them and renders its own `<mark>` elements.
- **Pagination:** an opaque cursor over an **offset** into that deterministic order, capped at 10,000.

**Status:** Accepted (2026-09-28) as an implementation-level decision within 08_SEARCH §2 and 05_API §6. No spec behavior changes.

**Context:** `ts_headline` emits highlight markup around user content. Inserting it as HTML would make every result a stored-XSS sink (09_SECURITY T4). Ranked results also have no natural keyset: `ts_rank_cd` returns a `real`, and a float keyset that round-trips through JSON can skip or repeat rows.

**Options Considered:**
- **Snippets:** (a) HTML `<b>` from `ts_headline` rendered with `dangerouslySetInnerHTML`, or HTML-escaped server-side first; (b) sentinel markers split in the client (chosen).
- **Pagination:** (a) a keyset on `(score, updated_at, id)`; (b) an offset cursor (chosen).

**Chosen Solution:**
- **Markers:** no markup crosses the API, and the renderer never parses HTML.
- **Offset:** with a total order, pages are stable for an unchanged corpus (FTS-10). Offset cost is irrelevant at per-user result sizes.

**Tradeoffs:** If notes change between page loads, an offset can shift a result by a position; that is acceptable for search. The snippet is plain markdown text, not rendered markdown.

**Future Revisit:** SEM-04 (hybrid search). RRF merges ranks, not scores, so the cursor may need to encode the merged position.

## ADR-37 — OpenAI calls go through an OpenAI-compatible gateway at `OPENAI_BASE_URL`

**Decision:** The typed OpenAI client (EMB-01) sends every embeddings and chat request to the OpenAI-compatible gateway `https://omni.khaire.dev/v1`, not to `api.openai.com`. The base URL is a server-only environment variable, `OPENAI_BASE_URL`, set per Vercel scope next to `OPENAI_API_KEY`; the key is the one the gateway issues. Feature code never sees either value — only the `shared/lib` client wrapper reads them.

**Status:** Accepted (2026-09-30) — explicit user (product-owner) decision.

**Context:** The product owner provides model access through their own OpenAI-compatible endpoint. The documented architecture named OpenAI directly (03_ARCHITECTURE §2.1) and put the trust boundary at Vercel ↔ OpenAI (09_SECURITY §9).

**Options Considered:** (a) call `api.openai.com` directly, as originally written; (b) call the gateway through a configurable base URL (chosen); (c) hardcode the gateway URL in code (rejected — per-environment configuration belongs in the environment, per ADR-24).

**Chosen Solution:** (b). The wire protocol is unchanged (OpenAI embeddings and Responses/chat endpoints), so 07_AI's model tiers, the 1536-dimension embedding contract and the budgets stand. ADR-24 still holds: Preview and Production keys stay distinct, and EMB-01 still owns provisioning and verifying both scopes.

**Tradeoffs:**
- The gateway is a new party in the data path. Note content (embeddings) and chat context pass through it, so 09_SECURITY §6's "no training on user content" property now depends on the gateway and on the upstream provider behind it.
- The gateway must expose a 1536-dimension embedding model (the small embedding tier, e.g. `text-embedding-3-small`). EMB-01 verifies this against the live endpoint before completing; a different width needs a migration (07_AI §3).
- Outages or rate limits at the gateway surface as upstream failures: the EMB-09 retry/`failed` path and SEM-06 keyword-only degradation already cover them.

**Applied to specs:** 03_ARCHITECTURE §2.1 (AI provider row), 09_SECURITY §6 (inventory, no-training row) and §9 (trust boundary); `.env.example` gains `OPENAI_BASE_URL`.

**Future Revisit:** If the gateway is retired, set `OPENAI_BASE_URL` back to `https://api.openai.com/v1` and issue new keys; no code change.

## ADR-38 — Chunk sizes are estimated at four characters per token; chunks are exact substrings of the note

**Decision:** The chunking module (EMB-02, `src/features/ai/chunking.ts`) measures every size in 07_AI §4 with an estimate of **four characters per token**, not a tokenizer. The §4 values become:

| Rule | Value |
|---|---|
| Target | 500 tokens (2,000 characters); a note at or under it is one chunk. |
| Overlap | 75 tokens (300 characters), reserved inside the target. Long notes pack to 425 tokens before the overlap is added. |
| Floor | 50 tokens (200 characters); a smaller piece merges into its neighbour. |

- **Split order:** heading sections, then blank-line blocks, then lines, sentences and words. A hard character split is used only for a single run longer than a chunk. Adjacent pieces are packed back together up to the budget, so a boundary falls on the coarsest structure that fits.
- **Code fences:** fenced code is never split at a heading or blank line inside the fence.
- **Overlap boundary:** the overlap starts at the first sentence or line start in its window, never mid-word.
- **Substring invariant:** every chunk is a trimmed, exact substring of the (CRLF-normalized) note, in order.

**Status:** Accepted (2026-09-30) as an implementation-level decision within 07_AI §4, whose values are all approximate ("~500 tokens"). No spec behavior changes.

**Context:** 07_AI §4 states sizes in tokens but names no tokenizer. The exact count depends on the configured embedding model (07_AI §2 keeps model IDs as configuration), and ADR-37 routes calls through a gateway whose upstream tokenizer is not ours to pin.

**Options Considered:**
- (a) Bundle a BPE tokenizer (e.g. `gpt-tokenizer`) for exact counts.
- (b) A character-based estimate (chosen).

**Chosen Solution:** (b).
- It is pure and dependency-free, and it is deterministic across model changes.
- Four characters per token is the usual English average for OpenAI tokenizers.
- The embedding endpoint's input limit (about 8k tokens) is more than ten times a chunk, so estimation error cannot make a request fail.
- The substring invariant means `chunk_text` can be shown as a citation or snippet exactly as the user wrote it.

**Tradeoffs:**
- Real token counts vary: code, URLs and non-Latin scripts run denser than four characters per token, so their chunks hold fewer real tokens than the target. This affects retrieval granularity only, not correctness.
- Because the floor merge can exceed the budget, a chunk can reach about 2,200 characters (550 tokens).

**Future Revisit:** If retrieval-quality evaluation (PERF-04 recall checks) shows chunk granularity matters, swap `estimateTokens` for a tokenizer; the rest of the module is unchanged.

## ADR-39 — Slate palette with semantic accent hues; text uses AA-safe shades of each hue

**Decision:** The token values in 10_DESIGN §3.3 move from ADR-8's zinc/blue to the product owner's concept palette: slate neutrals plus one hue per meaning.

| Hue | Meaning |
|---|---|
| Blue | Links, primary actions, focus |
| Purple | Backlinks |
| Green | Done, positive |
| Amber | Highlights, search matches |
| Rose | Mentions |
| Teal | Tags, objects |

- **Non-text uses:** fills, icons, rings, dots and tints use the concept hexes exactly.
- **Text uses:** text uses a darker shade of the same hue wherever the concept value is under 4.5:1. That is every light-theme accent, and secondary text in both themes.
- **Tints:** tinted backgrounds behind text stay at ≤10% opacity. Active and hover states use a ring, not a darker fill.

**Status:** Accepted (2026-10-01) — explicit user (product-owner) decision. Supersedes ADR-8.

**Context:** The UI overhaul (Sprint 12) starts from a concept palette supplied by the product owner. Checked against 10_DESIGN §6 (WCAG 2.1 AA), most light-theme accents fail as text on white (blue 3.7, teal 2.5, green 2.3, amber 2.2), and so do secondary text (2.6 light, 3.5 on dark elevated surfaces). The product owner chose AA-safe text shades over relaxing the rule.

**Options Considered:**
- (a) Concept hexes everywhere, with AA relaxed. Rejected: it breaks 10_DESIGN §6 and the build-time contrast test.
- (b) Concept hexes for non-text, darker same-hue shades for text. Chosen.
- (c) Wait for revised hexes.

**Chosen Solution:** (b).

| Role | Light | Dark |
|---|---|---|
| Background / surface / elevated | `#FFFFFF` / `#F8FAFC` / `#F1F5F9` | `#0B0C0E` / `#111317` / `#1A1D21` |
| Border | `#E2E8F0` | `#262A31` |
| Primary text (`foreground`) | `#475569` | `#E5E7EB` |
| Secondary text (`muted-foreground`) | `#5F6E84` (concept `#94A3B8`) | `#808A99` (concept `#687280`) |
| Muted text (`subtle-foreground`, placeholders/disabled only) | `#CBD5E1` | `#3A3F46` |
| Blue: `ring` / `primary` (links, buttons) | `#3B82F6` / `#2563EB` | `#7CA7FF` / `#7CA7FF` |
| Purple: `backlink` / `backlink-text` | `#8B5CF6` / `#7C3AED` | `#C084FC` |
| Green: `positive` / `positive-text` | `#22C55E` / `#15803D` | `#6EE7B7` |
| Amber: `highlight` / `highlight-text` | `#F59E0B` / `#B45309` | `#FBBF24` |
| Rose: `mention` / `mention-text` | `#EC4899` / `#BE185D` | `#F472B6` |
| Teal: `tag` / `tag-text` | `#14B8A6` / `#0F766E` | `#22D3EE` |
| Destructive | `#DC2626` (unchanged) | `#DC2626` (unchanged) |

Secondary text is slightly darker than the shade first proposed (`#64748B` / `#7A8494`) so it also clears 4.5:1 on the elevated surface, not only on the background.

**Tradeoffs:**
- **Hue roles:** more than one accent hue loosens 10_DESIGN's "one accent" rule. Each hue now carries exactly one meaning, so colour stays informative rather than decorative.
- **Text shades:** light-theme accent text is a shade darker than the concept.

**Enforcement:** `design-tokens.test.ts` checks every text token against all three surfaces in both themes, and the focus ring at 3:1. The axe sweep checks the rendered composites (tints).

**Future Revisit:** Code-block highlighting keeps the single-accent scheme of ADR-34. Revisit if multi-hue syntax colours are wanted.

## ADR-40 — Local Supabase stack in CI

**Decision:** GitHub Actions runs the Supabase CLI local stack (`supabase start`) as the database, Auth and Storage backend for integration tests and, as follow-up steps, for the E2E and accessibility jobs. It replaces the shared Cloud development project (`zkzyfwclvquiargnwgtw`) as the CI test target.

- **Config location:** the CLI config lives in `tools/ci/supabase-local/config.toml`. `tools/ci/start-local-supabase.sh` copies it and `supabase/migrations/` into a throwaway workdir under `$RUNNER_TEMP`. There is deliberately **no `supabase/config.toml`** in the repository.
- **Fidelity:** Postgres is pinned to the same `supabase/postgres` tag as the migration-check job (`17.6.1.136`, ADR-13/ADR-21). Auth settings mirror [supabase/auth-config.md](../supabase/auth-config.md). Services the app does not use (Realtime, Edge Runtime, Studio, analytics, pooler, mail) are off.
- **Checks:** the job applies the full migration history, fails unless every file in `supabase/migrations/` is recorded as applied, then runs `npm run test:integration`.
- **No secrets:** the stack generates its keys on each run, so the job uses no GitHub secret and is fork-safe (GOV-7).
- **Harness:** the integration harness accepts the loopback local stack as well as the development project. This amends ADR-12 (see "What changes for ADR-12" below).

**Status:** Accepted (2026-10-09) — explicit user (product-owner) decision. Amends ADR-10 (CI only) and ADR-12 (test-harness target). ADR-13, ADR-21 and ADR-27 are unchanged.

**Context:**

- The integration suite, `E2E (preview)` and `Accessibility` all depend on the free-tier Cloud development project. That project auto-pauses when idle; on 2026-09-27 a pause turned the required checks red with no code at fault.
- The product owner has decided to self-host Supabase rather than move to Supabase Pro. CI must stop depending on a hosted development project either way.
- ADR-10 ruled out a local Docker stack for *development*, to keep containers off contributor machines. ADR-13 already allowed a CI-only Postgres container on the grounds that a GitHub runner is not a contributor machine. This ADR extends that reasoning from Postgres alone to the full local stack.
- **The `supabase/config.toml` risk (ADR-27, CI-09, ADR-24).** Production is connected to this repository through the Supabase GitHub integration, which deploys from `main` with working directory `.`. Besides migrations, it applies settings declared in `supabase/config.toml`. CI-09 enabled it on the basis that no such file exists, so production Auth, SMTP and OAuth stay dashboard-managed (ADR-24, [supabase/auth-config.md](../supabase/auth-config.md)). A CI config at that path would set `site_url`, redirect URLs, SMTP and Auth settings to localhost values. The next merge to `main` could then push them to production Auth.

**Options Considered:**

- (a) Keep the Cloud development project and add a keep-alive ping. Rejected: it treats the symptom only. It keeps the shared-state contention between runs, and it does not survive the move to self-hosting.
- (b) Supabase Branching (per-PR preview databases). Rejected: Pro plan only, billed per branch-hour, and needs credentials (see ADR-13's option (a)).
- (c) `supabase start` with the config at `supabase/config.toml`, the CLI default. Rejected: it creates the production-config risk above.
- (d) `supabase start` with the config in `tools/ci/`, assembled into a temporary workdir. **Chosen.**
- (e) A self-hosted staging stack as the CI target. Rejected for required checks: it needs a secret, so it is not fork-safe, and it couples CI to a host under maintenance. It remains the planned target for an optional preview smoke test.

**Chosen Solution:** (d).

- **Isolation:** every run gets a fresh, empty stack, so tests stop sharing state and Auth rate limits with other runs and with manual development work.
- **Production safety:** nothing the Supabase GitHub integration reads changes. `supabase/` still holds only `migrations/`, `templates/` and `auth-config.md`.
- **Fidelity:** the same Postgres tag as the migration check, the same migrations, and Auth rules copied from the hosted projects' documented settings.

**What changes for ADR-12:**

| | Before (ADR-12) | After (ADR-40) |
|---|---|---|
| Allowed harness targets | The Cloud development project only (hostname pin `zkzyfwclvquiargnwgtw.supabase.co`) | The Cloud development project, **or** a loopback local stack (`127.0.0.1`, `localhost`) |
| Service-role key in tests | The development project's key | The development project's key, or the local stack's per-run secret key, which is not a secret and protects no real data |

**Still holds, for production and everywhere else:**

- The harness fails closed on any other hostname, including production (`hqzakxpbxqzxismmgnyn.supabase.co`) and any future self-hosted production or staging host. Adding a host needs its own decision.
- The production service-role key and the production database password are never configured in any test environment or in GitHub Actions (ADR-12, ADR-21).
- Harness code stays in test code and is never importable from `src/`. [09_SECURITY.md §5](09_SECURITY.md#5-service-role-key-usage) still lists exactly three service-role contexts.
- The localhost allowance lives in the test harness only. Application code and the Preview and Production deployments are unaffected.

**What stays from ADR-10:** contributors are still not required to run Docker. Day-to-day development keeps using the Cloud development project. The loopback allowance means a contributor *may* run `tools/ci/start-local-supabase.sh` locally to reproduce a CI failure, but nothing depends on it.

**Tradeoffs:**

- **Run time:** `supabase start` pulls and boots several images, adding roughly one to two minutes per run. Mitigated by excluding unused services; image caching is a later option.
- **Drift:** the local stack is a CLI-versioned approximation of the hosted platform. The CLI version (`supabase/setup-cli`) and the Postgres tag are pinned and must be bumped together with the migration-check image and the replay baseline.
- **Auth config is now in two places:** `tools/ci/supabase-local/config.toml` must be kept in step with `supabase/auth-config.md` by review. A mismatch makes tests unrepresentative but cannot affect production.
- **Path discipline:** the safety of this setup depends on `supabase/config.toml` never being committed. A reviewer must reject any PR that adds that file unless it carries its own decision superseding this ADR and CI-09's validation.

**Risks:**

- **Someone runs `supabase init` or `supabase start` at the repository root.** That creates `supabase/config.toml`. Mitigation: the review rule above. A CI guard that fails when the file exists is a cheap follow-up.
- **Loopback allowance misused.** A stray localhost URL in a developer's environment only ever reaches a local stack, never production; the fail-closed check against every other host is unchanged.
- **E2E and accessibility still use the Cloud development project** until they move to the runner (`npm run build && npm run start` against the local stack). Until then, a paused development project can still turn `E2E (preview)` and `Accessibility` red.

**Applied to specs:** ADR-10 and ADR-12 carry an "amended by ADR-40" note. [03_ARCHITECTURE.md §8](03_ARCHITECTURE.md#8-deployment-architecture) (no-local-stack bullet), [09_SECURITY.md §5](09_SECURITY.md#5-service-role-key-usage) (test-harness row), [11_CONTRIBUTING.md](11_CONTRIBUTING.md) (integration test row) and `.ai/ARCHITECTURE_RULES.md` rule 7.

**Future Revisit:** When production moves to the self-hosted stack, ADR-27's GitHub integration is retired and the `supabase/config.toml` constraint can be revisited in that decision. Revisit the run-time cost if `supabase start` regularly exceeds three minutes.

## ADR-41 — New note is ⌥⌘N / Ctrl+Alt+N, because browsers reserve ⌘N

**Decision:** The New note shortcut is `⌥⌘N` on macOS and `Ctrl+Alt+N` elsewhere (10_DESIGN §8), replacing the `⌘N` the design originally specified. It matches the physical key (`event.code === "KeyN"`), requires Alt, and never fires when AltGr is held.

**Status:** Accepted (2026-10-09) — UX-07.

**Context:** The UX audit (Sprint 12) found the palette's New note command disabled and no `⌘N` binding. Binding `⌘N` would not have helped: Chromium, Firefox and Safari open a new window on ⌘N/Ctrl+N before the page's `keydown` handler runs, so `preventDefault()` cannot stop it.

**Options Considered:**
- (a) `⌘N` / `Ctrl+N`. Rejected: reserved by every target browser.
- (b) `⇧⌘N`. Rejected: incognito/private window in Chrome and Edge; reopens a closed window in Firefox.
- (c) `Alt+N` alone. Rejected: on macOS ⌥N is a dead key (`˜`) used to type ñ, so it would break typing.
- (d) `⌥⌘N` / `Ctrl+Alt+N`. Chosen: not reserved by Chrome, Firefox, Safari or Edge for web pages.

**Chosen Solution:** (d). The shortcut manager gains `alt` (exact match only when `true`; otherwise "don't care", so existing bindings are unchanged) and `code` (match `event.code` instead of `event.key`). An `alt: true` binding skips events where `getModifierState("AltGraph")` is true, because on Windows Ctrl+Alt is AltGr and AltGr+N types a character on some layouts (e.g. `ń` in Polish). Only where `getModifierState` is unavailable does it fall back to skipping Ctrl+Alt events whose `key` is a printable character other than `n`; that heuristic is not used otherwise because it would also block a genuine Ctrl+Alt+N on Cyrillic or Greek layouts (where `key` is `т` or `ν`), so we accept that a browser misreporting AltGraph could let AltGr+N create a note. The handler ignores `event.repeat` and in-flight creates, so a held key creates one note.

**Tradeoffs:** a three-key chord is less discoverable than ⌘N, so the hint is shown on the sidebar New note button, the palette, Home and the empty state. The palette and the visible button remain the fallback if a browser or OS later claims the chord.

**Future Revisit:** if a target browser or OS is found to claim ⌥⌘N, record it here and fall back to the palette plus the button.
