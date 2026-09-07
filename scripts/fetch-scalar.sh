#!/usr/bin/env bash
# Vendor the Scalar API reference renderer into assets/vendor/scalar/.
#
# The site must never pull a renderer from a CDN at runtime (see CLAUDE.md,
# "Datenschutz"). Scalar's own documentation only describes the jsdelivr
# script tag, so this script is the self-hosted equivalent: it downloads the
# npm tarball, lifts out the one file the browser needs and commits it.
#
# Only dist/browser/standalone.js is taken. That build is a self-contained
# IIFE — it loads no chunks, so vendoring a single file really is enough
# (dist/browser/standalone.esm.js, by contrast, code-splits into 90 chunks).
#
#   ./scripts/fetch-scalar.sh              # the pinned version below
#   SCALAR_VERSION=1.69.0 ./scripts/fetch-scalar.sh
set -euo pipefail

SCALAR_VERSION="${SCALAR_VERSION:-1.68.0}"

cd "$(dirname "$0")/.."
out="assets/vendor/scalar"
mkdir -p "$out"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

echo "Fetching @scalar/api-reference@${SCALAR_VERSION} from the npm registry:"
curl -sfSL \
    "https://registry.npmjs.org/@scalar/api-reference/-/api-reference-${SCALAR_VERSION}.tgz" \
    -o "$tmp/scalar.tgz"
tar xzf "$tmp/scalar.tgz" -C "$tmp" package/dist/browser/standalone.js

src="$tmp/package/dist/browser/standalone.js"

# The bundle ends with a //# sourceMappingURL comment. Shipping the map costs
# 29 MB, not shipping it makes every devtools session ask for a file that is
# not there, so drop the pointer instead.
grep -v '^//# sourceMappingURL=' "$src" > "$out/standalone.js"

curl -sfSL https://raw.githubusercontent.com/scalar/scalar/main/LICENSE \
    -o "$out/LICENSE"

# Fail loudly if a future release starts phoning home from somewhere new.
echo
echo "External hosts referenced by the bundle:"
grep -oE 'https?://[a-zA-Z0-9.-]+' "$out/standalone.js" \
    | grep -E 'fonts\.|proxy\.|api\.scalar|posthog|analytics|telemetry' \
    | sort | uniq -c || true
echo
echo "  None of these is contacted with the configuration in assets/js/se-scalar.js"
echo "  (withDefaultFonts: false, proxyUrl: '', telemetry: false). Re-run"
echo "  'make test-api' after an upgrade — it asserts that at runtime."

sed -i -E "s/^(\\*\\*Version:\\*\\* ).*/\\1${SCALAR_VERSION}/" "$out/UPSTREAM.md" 2>/dev/null || true

echo
ls -lh "$out"
