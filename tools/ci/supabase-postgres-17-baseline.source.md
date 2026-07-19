# Supabase Postgres 17 baseline fixture

The adjacent SQL file is vendored unchanged from Supabase's official Postgres 17 full-stack
initialization fixture. It supplies the managed Auth and Storage baseline that the bare
`supabase/postgres` image does not create by itself.

- Repository: `supabase/pg-toolbelt`
- Source commit: `f2420d9e0f6f5b399386b5f77bd581af55a7a141`
- Source path: `packages/pg-delta/tests/integration/fixtures/supabase-base-init/17_fullstack_container_init.sql`
- Git blob: `fea882cb1562a1087e27dc1e1a67512ad86406aa`
- SHA-256: `89b5d0fd9c0d2457b49602203fb927b9fc5e7d1aef5614f90ce9e2a5cb60623a`
- Replay image: `supabase/postgres:17.6.1.136`

When updating the fixture, pin a new upstream commit, replace the SQL file without editing it,
update every identifier above, and verify the complete project migration history in CI.
