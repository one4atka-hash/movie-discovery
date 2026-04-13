#!/usr/bin/env sh
# Fast regression: movie-discovery (build, lint, test:ci) + server (build, lint, unit tests).
# Does NOT run: server e2e (needs DB) or Playwright — see repo README.md "Further checks".
# Run from repo root: sh scripts/verify-all.sh
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)

run_in() {
  dir="$1"
  shift
  (cd "${root}/${dir}" && "$@")
}

run_in movie-discovery npm run build
run_in movie-discovery npm run lint
run_in movie-discovery npm run test:ci

run_in server npm run build
run_in server npm run lint
run_in server npm test

echo "OK: verify-all completed."
