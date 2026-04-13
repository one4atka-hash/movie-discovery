#!/usr/bin/env sh
# Full regression: movie-discovery (build, lint, test:ci) + server (build, lint, test).
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
