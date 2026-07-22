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
