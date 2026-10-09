#!/usr/bin/env bash
# Start the CI-only local Supabase stack (ADR-40) and export its connection
# values for later steps.
#
# The stack is assembled in a throwaway workdir so no supabase/config.toml is
# ever committed at the repository root (see tools/ci/supabase-local/config.toml).
# Postgres is pinned to the same supabase/postgres tag as the migration-check
# service container so CI, the replay baseline and prod stay in lockstep.
# Local keys are generated per run and are not secrets; nothing here needs a
# GitHub secret, so the job is fork-safe (GOV-7).

set -euo pipefail

readonly postgres_version="${SUPABASE_POSTGRES_VERSION:?SUPABASE_POSTGRES_VERSION is required}"
readonly workdir="${SUPABASE_LOCAL_WORKDIR:-${RUNNER_TEMP:-/tmp}/supabase-local}"
repo_root="$(git rev-parse --show-toplevel)"
readonly repo_root

if [[ -n "${GITHUB_ENV:-}" ]]; then
  # Exported first so the always() stop step can find the stack even when a
  # later step here fails.
  echo "SUPABASE_LOCAL_WORKDIR=${workdir}" >>"$GITHUB_ENV"
fi

rm -rf "$workdir"
mkdir -p "$workdir/supabase/.temp"
cp "$repo_root/tools/ci/supabase-local/config.toml" "$workdir/supabase/config.toml"
cp -R "$repo_root/supabase/migrations" "$workdir/supabase/migrations"
printf '%s' "$postgres_version" >"$workdir/supabase/.temp/postgres-version"

# Belt and braces: config.toml already disables these services. Excluding
# them here also skips their image pulls. imgproxy and postgres-meta have no
# config toggle that this repo needs.
supabase start \
  --workdir "$workdir" \
  -x realtime,edge-runtime,imgproxy,studio,logflare,vector,supavisor,postgres-meta,mailpit

status_env="$(supabase status --workdir "$workdir" -o env)"

read_status_value() {
  local name="$1" value
  value="$(printf '%s\n' "$status_env" | sed -n "s/^${name}=\"\{0,1\}\([^\"]*\)\"\{0,1\}$/\1/p" | head -n 1)"
  if [[ -z "$value" ]]; then
    echo "supabase status did not report ${name}." >&2
    exit 1
  fi
  printf '%s' "$value"
}

api_url="$(read_status_value API_URL)"
publishable_key="$(read_status_value PUBLISHABLE_KEY)"
secret_key="$(read_status_value SECRET_KEY)"
db_url="$(read_status_value DB_URL)"

# Assert the image actually running, not just the requested version (ADR-40).
db_container="$(docker ps --filter "label=com.supabase.cli.project=second-brain-ci" \
  --filter "name=supabase_db_" --format '{{.Names}}' | head -n 1)"
if [[ -z "$db_container" ]]; then
  echo "Could not find the local Supabase Postgres container." >&2
  exit 1
fi
db_image="$(docker inspect --format '{{.Config.Image}}' "$db_container")"
if [[ "${db_image##*:}" != "$postgres_version" ]]; then
  echo "Local Postgres container ${db_container} runs ${db_image}; expected tag ${postgres_version}." >&2
  exit 1
fi
echo "Local Postgres image: ${db_image}"

running_postgres="$(psql "$db_url" --no-psqlrc --tuples-only --no-align --command 'select version()')"
echo "Local stack Postgres: ${running_postgres}"

applied_migrations="$(psql "$db_url" --no-psqlrc --tuples-only --no-align \
  --command 'select count(*) from supabase_migrations.schema_migrations')"
expected_migrations="$(find "$repo_root/supabase/migrations" -maxdepth 1 -name '*.sql' | wc -l | tr -d ' ')"
if [[ "$applied_migrations" != "$expected_migrations" ]]; then
  echo "Expected ${expected_migrations} applied migrations, found ${applied_migrations}." >&2
  exit 1
fi
echo "Applied ${applied_migrations}/${expected_migrations} migrations."

if [[ -n "${GITHUB_ENV:-}" ]]; then
  {
    echo "NEXT_PUBLIC_SUPABASE_URL=${api_url}"
    echo "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishable_key}"
    echo "SUPABASE_SERVICE_ROLE_KEY=${secret_key}"
    echo "SUPABASE_DB_URL=${db_url}"
  } >>"$GITHUB_ENV"
fi
