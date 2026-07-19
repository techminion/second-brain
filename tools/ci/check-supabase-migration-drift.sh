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
  --password "$SUPABASE_DB_PASSWORD" \
  --output json >"$migration_list_file"

if ! jq -e '
  (if type == "array"
    then .
    else (.migrations // .data.migrations // .result.migrations // [])
  end) as $migrations
  | ($migrations | length > 0)
    and ($migrations | all(
      ((.local // "") | length > 0)
      and ((.remote // "") | length > 0)
      and (.local == .remote)
    ))
' "$migration_list_file" >/dev/null; then
  echo "Repository and Cloud migration histories differ:" >&2
  jq '.' "$migration_list_file" >&2
  exit 1
fi

echo "Repository and Cloud migration histories match."
