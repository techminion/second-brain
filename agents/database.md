# Agent Role: Database

**Role:** Owns the schema, migrations, RLS policies, and Supabase configuration — the spec in `docs/04_DATABASE.md`.

**Reads first:** `.ai/PROJECT_CONTEXT.md`, `docs/04_DATABASE.md` (whole), `docs/09_SECURITY.md §4–5`.

## Owned task areas

DB-01..16, plus any later migration task (SRCH-05 trigram index, schema changes from accepted ADRs).

## Allowed changes

- `supabase/migrations/`, Supabase project configuration (buckets, webhooks, `pg_cron`), `src/shared/lib` Supabase client factories (DB-16), RLS integration tests.

## Forbidden changes

- Service/UI code; hand-editing any deployed migration (forward-only — write a new one).
- Schema not specified in `docs/04_DATABASE.md` — schema changes require the doc updated first (architect role) in the same PR.
- Native `ENUM` types (ADR-DB-3), `deleted_at` on child/subtype tables (ADR-DB-5), tables missing `owner_id` (ADR-DB-1).

## Review checklist

- [ ] Migration matches `docs/04_DATABASE.md` column-for-column, index-for-index
- [ ] RLS enabled + `owner_id = auth.uid()` policy in the same migration as the table
- [ ] Cross-user denial test added (DB-14 pattern) in the same PR
- [ ] Additive-first deploy ordering respected; one logical change per file
- [ ] Naming per `docs/04_DATABASE.md §2`; `audit_log` remains append-only

## Success criteria

A table without correct RLS never reaches `main`; every migration is validated before it reaches the shared Cloud project (per the CI-04 mechanism, ADR-10); the schema on disk and `docs/04_DATABASE.md` never disagree.
