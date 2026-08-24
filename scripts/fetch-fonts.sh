#!/usr/bin/env bash
# Fetch the self-hosted web fonts once and drop them into static/fonts/.
#
# The site must never load fonts from a CDN at runtime (see CLAUDE.md,
# "Datenschutz"). This script is the only thing that ever talks to Google's
# font servers, it is run by hand, and its output is committed to the
# repository. Re-run it only to refresh the files.
#
#   ./scripts/fetch-fonts.sh
set -euo pipefail

cd "$(dirname "$0")/.."
out="static/fonts"
mkdir -p "$out"

ua='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

# family spec -> output basename
fetch() {
    local spec="$1" base="$2" css
    css=$(curl -sfSL -A "$ua" "https://fonts.googleapis.com/css2?family=${spec}&display=swap")

    for subset in latin latin-ext; do
        local url
        url=$(printf '%s\n' "$css" \
            | awk -v s="/* $subset */" 'index($0,s){f=1} f && /url\(/{print; exit}' \
            | grep -oE 'https://[^)]+\.woff2')
        [ -n "$url" ] || { echo "no $subset subset for $spec" >&2; exit 1; }
        curl -sfSL -A "$ua" "$url" -o "$out/${base}-${subset}.woff2"
        echo "  $out/${base}-${subset}.woff2"
    done
}

echo "Inter (variable 400..700):"
fetch 'Inter:wght@400..700' inter

echo "JetBrains Mono (variable 400..600):"
fetch 'JetBrains+Mono:wght@400..600' jetbrains-mono

echo "Licenses:"
curl -sfSL https://raw.githubusercontent.com/rsms/inter/master/LICENSE.txt -o "$out/OFL-Inter.txt"
echo "  $out/OFL-Inter.txt"
curl -sfSL https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/OFL.txt -o "$out/OFL-JetBrainsMono.txt"
echo "  $out/OFL-JetBrainsMono.txt"

echo
ls -lh "$out"
