#!/usr/bin/env bash

set -euo pipefail

readonly database_url="${DATABASE_URL:?DATABASE_URL is required}"
readonly baseline="tools/ci/supabase-postgres-17-baseline.sql"
readonly expected_baseline_sha256="89b5d0fd9c0d2457b49602203fb927b9fc5e7d1aef5614f90ce9e2a5cb60623a"

actual_baseline_sha256="$(sha256sum "$baseline" | cut -d ' ' -f 1)"

if [[ "$actual_baseline_sha256" != "$expected_baseline_sha256" ]]; then
  echo "Baseline fixture checksum mismatch." >&2
  exit 1
fi

psql "$database_url" \
  --no-psqlrc \
  --set=ON_ERROR_STOP=on \
  --single-transaction \
  --file="$baseline"

migration_files=(supabase/migrations/*.sql)

if [[ ! -e "${migration_files[0]}" ]]; then
  echo "No Supabase migrations found." >&2
  exit 1
fi

for migration in "${migration_files[@]}"; do
  echo "::group::Replay $(basename "$migration")"
  psql "$database_url" \
    --no-psqlrc \
    --set=ON_ERROR_STOP=on \
    --single-transaction \
    --file="$migration"
  echo "::endgroup::"
done

psql "$database_url" --no-psqlrc --set=ON_ERROR_STOP=on <<'SQL'
do $$
begin
  if (select count(*) from pg_tables where schemaname = 'public') <> 13 then
    raise exception 'Expected all 13 documented public tables after migration replay';
  end if;

  if exists (
    select 1
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relkind = 'r'
      and not pg_class.relrowsecurity
  ) then
    raise exception 'Every public table must have RLS enabled';
  end if;

  if to_regclass('auth.users') is null
    or to_regclass('storage.buckets') is null
    or to_regclass('storage.objects') is null then
    raise exception 'Supabase Auth and Storage baseline is incomplete';
  end if;

  if to_regprocedure('storage.allow_any_operation(text[])') is null
    or to_regprocedure('storage.allow_only_operation(text)') is null then
    raise exception 'Supabase Storage operation helpers are missing';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'attachments' and public is false
  ) then
    raise exception 'Private attachments bucket was not created';
  end if;

  if (
    select count(*)
    from pg_extension
    where extname in ('vector', 'pg_cron', 'pg_net')
  ) <> 3 then
    raise exception 'Required database extensions were not installed';
  end if;

  if not exists (
    select 1
    from cron.job
    where jobname = 'retention-purge-daily'
  ) then
    raise exception 'Retention purge schedule was not created';
  end if;
end
$$;
SQL

echo "Replayed and verified ${#migration_files[@]} migrations."
