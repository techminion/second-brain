#!/usr/bin/env bash

set -euo pipefail

: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN is required}"
: "${SUPABASE_DB_PASSWORD:?SUPABASE_DB_PASSWORD is required}"
: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF is required}"

readonly migration_list_file="$(mktemp)"
trap 'rm -f "$migration_list_file"' EXIT

if [[ ! -f supabase/config.toml ]]; then
  supabase init
fi

supabase link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
supabase migration list \
  --linked \
  --password "$SUPABASE_DB_PASSWORD" >"$migration_list_file"

migration_files=(supabase/migrations/*.sql)

if [[ ! -e "${migration_files[0]}" ]]; then
  echo "No Supabase migrations found." >&2
  exit 1
fi

if ! awk -v expected_rows="${#migration_files[@]}" '
  {
    line = $0
    version_count = 0
    delete versions

    while (match(line, /[0-9]{14}/)) {
      version_count++
      versions[version_count] = substr(line, RSTART, RLENGTH)
      line = substr(line, RSTART + RLENGTH)
    }

    if (version_count == 0) {
      next
    }

    migration_rows++
    if (version_count != 2 || versions[1] != versions[2]) {
      histories_differ = 1
    }
  }

  END {
    if (migration_rows != expected_rows || histories_differ) {
      exit 1
    }
  }
' "$migration_list_file"; then
  echo "Repository and Cloud migration histories differ:" >&2
  cat "$migration_list_file" >&2
  exit 1
fi

echo "Repository and Cloud migration histories match."
