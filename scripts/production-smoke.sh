#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repository_root"

compose=(docker compose -f docker-compose.production-smoke.yml)
smoke_database_url='postgresql://adventure_omakase:local_development_only@127.0.0.1:55432/adventure_omakase'

finish() {
  status=$?
  trap - EXIT INT TERM

  if [[ $status -ne 0 ]]; then
    "${compose[@]}" ps || true
    "${compose[@]}" logs --no-color || true
  fi

  "${compose[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
  exit "$status"
}
trap finish EXIT INT TERM

"${compose[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
"${compose[@]}" up --detach --wait db

DATABASE_URL="$smoke_database_url" \
  pnpm --filter @adventure-omakase/db migrate

"${compose[@]}" up --detach --build --wait api studio

PLAYWRIGHT_BASE_URL='http://127.0.0.1:3300' \
  pnpm exec playwright test --config=playwright.production.config.ts
