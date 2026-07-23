#!/usr/bin/env bash

# CI-06: resolve the Vercel preview URL for a commit by polling the GitHub
# Deployments API. The Vercel Git integration creates a "Preview" deployment
# per pushed commit and marks it successful when the build finishes; the
# deployment status carries the preview URL as target_url/environment_url.
#
# Outputs `url=<preview url>` to $GITHUB_OUTPUT.

set -euo pipefail

: "${GITHUB_TOKEN:?GITHUB_TOKEN is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${PREVIEW_SHA:?PREVIEW_SHA is required}"
: "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"

readonly poll_interval_seconds=15
readonly max_attempts=40 # 10 minutes

api() {
  curl --silent --show-error --fail \
    --header "Authorization: Bearer ${GITHUB_TOKEN}" \
    --header "Accept: application/vnd.github+json" \
    "$1"
}

for attempt in $(seq 1 "$max_attempts"); do
  deployment_id="$(
    api "https://api.github.com/repos/${GITHUB_REPOSITORY}/deployments?sha=${PREVIEW_SHA}&environment=Preview&per_page=1" |
      jq -r '.[0].id // empty'
  )"

  if [[ -n "$deployment_id" ]]; then
    status_line="$(
      api "https://api.github.com/repos/${GITHUB_REPOSITORY}/deployments/${deployment_id}/statuses?per_page=1" |
        jq -r '.[0] | if . == null then empty else "\(.state) \(.environment_url // .target_url // "")" end'
    )"

    state="${status_line%% *}"
    url="${status_line#* }"

    case "$state" in
      success)
        if [[ -z "$url" || "$url" == "$state" ]]; then
          echo "Deployment succeeded but exposed no URL." >&2
          exit 1
        fi
        echo "Preview ready: $url"
        echo "url=$url" >>"$GITHUB_OUTPUT"
        exit 0
        ;;
      error | failure)
        echo "Vercel preview deployment reported state '$state'." >&2
        exit 1
        ;;
    esac
  fi

  echo "Attempt ${attempt}/${max_attempts}: preview not ready yet."
  sleep "$poll_interval_seconds"
done

echo "Timed out waiting for the Vercel preview deployment." >&2
exit 1
