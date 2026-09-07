#!/usr/bin/env bash
# Refresh the worker's OpenAPI document from the statusengine-worker repository.
#
# The spec is the worker's own source of truth (docs/openapi.yaml there); this
# site only mirrors it so that /api/statusengine-worker.yaml is served from our
# own origin. Re-run whenever the worker's API changes, then rebuild.
#
#   ./scripts/fetch-openapi.sh
#   OPENAPI_REF=v1.4.0 ./scripts/fetch-openapi.sh   # a tag instead of main
set -euo pipefail

OPENAPI_REF="${OPENAPI_REF:-main}"
src="https://raw.githubusercontent.com/statusengine/statusengine-worker/${OPENAPI_REF}/docs/openapi.yaml"

cd "$(dirname "$0")/.."
out="static/api/statusengine-worker.yaml"
mkdir -p "$(dirname "$out")"

echo "Fetching ${src}"
curl -sfSL "$src" -o "$out.tmp"

# A truncated download or a GitHub error page would otherwise be committed and
# only show up as an empty reference in the browser.
head -1 "$out.tmp" | grep -q '^openapi:' \
    || { echo "not an OpenAPI document — refusing to overwrite $out" >&2; rm -f "$out.tmp"; exit 1; }

mv "$out.tmp" "$out"
printf '  %s (%s lines, %s)\n' "$out" "$(wc -l < "$out")" "$(du -h "$out" | cut -f1)"
