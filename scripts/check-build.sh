#!/usr/bin/env bash
# Verify a finished build in public/. Run via `make check` (which builds first).
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
note() { printf '\n\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '  \033[32mok\033[0m   %s\n' "$1"; }
bad()  { printf '  \033[31mFAIL\033[0m %s\n' "$1"; fail=1; }

[ -d public ] || { echo "public/ missing — run 'make build' first"; exit 1; }

note "No externally loaded subresources (CLAUDE.md: keine CDNs)"
# Only attributes that make the browser fetch something count. Plain <a href>
# links to GitHub are fine: they cost a request only when someone clicks.
hits=$(grep -rhoE '(src|srcset)="https?://[^"]+|<link[^>]+href="https?://[^"]+|@import[^;]*https?://[^;"]+|url\(https?://[^)]+' \
        public --include='*.html' --include='*.css' --include='*.js' 2>/dev/null \
      | grep -oE 'https?://[a-zA-Z0-9.-]+' | sort -u)
if [ -z "$hits" ]; then
  ok "no external src=, <link href=, @import or url()"
else
  bad "external subresources found:"; printf '       %s\n' $hits
fi

note "Known tracker and CDN hosts absent entirely"
for host in fonts.googleapis.com fonts.gstatic.com www.googletagmanager.com \
            cdn.jsdelivr.net unpkg.com giscus.app google-analytics.com; do
  if grep -rqF "$host" public 2>/dev/null; then bad "$host referenced"; else ok "$host"; fi
done

note "Fonts served from this origin"
count=$(ls public/fonts/*.woff2 2>/dev/null | wc -l)
[ "$count" -ge 4 ] && ok "$count woff2 files in public/fonts/" || bad "expected 4 woff2 files, found $count"

note "Syntax highlighting uses Chroma classes, not inline styles"
# Attribute quotes are optional after --minify, hence the ["\']? in every pattern.
for f in public/docs/broker/index.html public/docs/worker/index.html; do
  page=$(basename "$(dirname "$f")")
  [ -f "$f" ] || { bad "$f missing"; continue; }
  grep -qE 'class=["'"'"']?chroma' "$f" && ok "chroma markup in $page" \
    || bad "no chroma markup in $f"
  inline=$(grep -cE 'style=["'"'"']?color:#' "$f")
  [ "$inline" -eq 0 ] && ok "no inline colour styles in $page" \
    || bad "$inline inline colour styles in $f (markup.highlight.noClasses must be false)"
done

note "Every fenced block is actually highlighted"
# One <pre class=chroma> must exist per code block wrapper. A block whose
# language tag Chroma does not know falls through as plain <pre> and shows up
# here as a shortfall.
blocks=$(grep -rohE 'class="hextra-code-block[^"]*"' public --include='*.html' | wc -l)
pres=$(grep -rohE '<pre[^>]*class=["'"'"']?chroma' public --include='*.html' | wc -l)
[ "$blocks" -eq "$pres" ] && ok "$pres/$blocks code blocks highlighted" \
  || bad "only $pres of $blocks code blocks highlighted"

note "Languages present in the output"
langs=$(grep -rohE 'data-lang=["'"'"']?[a-z0-9]+' public --include='*.html' \
        | sed -E 's/.*data-lang=["'"'"']?//' | sort -u | tr '\n' ' ')
ok "${langs:-none}"
for want in toml cpp yaml bash; do
  case " $langs " in *" $want "*) ;; *) bad "no $want block in the output" ;; esac
done

note "Pages built"
for p in index.html docs/index.html docs/broker/index.html docs/worker/index.html tutorials/index.html \
         tutorials/install-naemon/index.html tutorials/php-composer/index.html \
         tutorials/gearman-to-many-files/index.html \
         tutorials/setup-naemon-development-environment/index.html \
         v3/index.html v3/worker/index.html v3/ui/index.html; do
  [ -f "public/$p" ] && ok "$p" || bad "$p missing"
done

note "Old statusengine.org URLs still resolve"
for p in worker ui broker getting_started tutorials/install-naemon-focal tutorials/install-naemon-centos8; do
  if [ -f "public/$p/index.html" ] && grep -qE 'http-equiv="?refresh"?' "public/$p/index.html"; then
    ok "/$p/ redirects"
  else
    bad "/$p/ has no alias"
  fi
done

note "Unwritten sections still marked"
stubs=$(grep -rc 'Section not written yet\|not written yet' public --include='*.html' 2>/dev/null | grep -v ':0$' | wc -l)
printf '  %s page(s) still contain TODO callouts\n' "$stubs"

echo
[ "$fail" -eq 0 ] && echo "All checks passed." || echo "Some checks FAILED."
exit "$fail"
