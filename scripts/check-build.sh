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
#
# public/vendor/ is excluded and checked separately below: the Scalar bundle
# carries Scalar's own font URLs as an inert string, so a plain grep over it
# reports a subresource that the page never actually requests.
#
# The one permitted exception is the self-hosted Matomo host from
# hugo.yaml, and only when analytics are configured at all. It is read from the
# config rather than hard-coded, so pointing the site at a different Matomo does
# not quietly widen what this check allows.
# Scoped to the matomo: block. A bare `url:` match would pick up the GitHub
# menu entry instead and quietly allow github.com as a subresource host.
matomo_host=$(awk '/^  matomo:$/{inblock=1; next}
                   inblock && /^  [^ ]/{inblock=0}
                   inblock && /^    url:/{print; exit}' hugo.yaml \
            | sed -n 's|^ *url: *"https\?://\([a-zA-Z0-9.-]*\).*|\1|p')
hits=$(grep -rhoE '(src|srcset)="https?://[^"]+|<link[^>]+href="https?://[^"]+|@import[^;]*https?://[^;"]+|url\(https?://[^)]+' \
        public --exclude-dir=vendor --include='*.html' --include='*.css' --include='*.js' 2>/dev/null \
      | grep -oE 'https?://[a-zA-Z0-9.-]+' | sort -u)
if [ -n "$matomo_host" ]; then
  hits=$(printf '%s\n' "$hits" | grep -v "^https\?://${matomo_host}$" | grep -v '^$')
fi
if [ -z "$hits" ]; then
  if [ -n "$matomo_host" ]; then
    ok "no external subresources apart from the configured Matomo ($matomo_host)"
  else
    ok "no external src=, <link href=, @import or url()"
  fi
else
  bad "external subresources found:"; printf '       %s\n' $hits
fi

note "Legal pages are present and the address is filled in"
for page in impressum datenschutz; do
  f="public/$page/index.html"
  if [ -f "$f" ]; then ok "/$page/ builds"; else bad "/$page/ missing"; continue; fi
  if grep -qF "Die Anschrift fehlt noch" "$f"; then
    bad "/$page/ still shows the address placeholder — create data/imprint.yaml"
    continue
  fi
  # The details are base64-with-the-base64-reversed so they are not in the
  # markup, which means a plain grep can no longer see whether anything real is
  # there. Decode them back and look.
  decoded=$(grep -o 'data-o="[^"]*"' "$f" \
          | sed 's/data-o="//; s/"$//' \
          | while read -r v; do printf '%s' "$v" | rev | base64 -d 2>/dev/null; printf '\n'; done)
  if printf '%s' "$decoded" | grep -qE '[0-9]' && printf '%s' "$decoded" | grep -q '@'; then
    ok "/$page/ carries a postal address and an email, both obfuscated"
  else
    bad "/$page/ obfuscated block does not decode to an address and an email"
  fi
  # And the plaintext must not have leaked in alongside it.
  if grep -qF "$(printf '%s' "$decoded" | grep '@' | head -1)" "$f"; then
    bad "/$page/ leaks the email address in the markup"
  else
    ok "/$page/ keeps the plaintext out of the markup"
  fi
done
for a in impressum.html datenschutz.html; do
  [ -f "public/$a" ] && ok "old /$a still resolves" || bad "/$a alias missing"
done

note "Vendored Scalar bundle carries nothing new"
# standalone.js contains @font-face rules for fonts.scalar.com as a string. They
# are injected only when withDefaultFonts is left on, and assets/js/se-scalar.js
# turns it off — `make test-api` drives a browser and proves no request leaves
# the origin. All this can add is an early warning that an upgrade introduced a
# second one, which that runtime test would then have to be re-read against.
inert=$(grep -rhoE 'url\(https?://[^)]+|src=\\?"https?://[^"\\]+' public/vendor 2>/dev/null \
      | grep -oE 'https?://[a-zA-Z0-9.-]+' | sort -u)
if [ "$inert" = "https://fonts.scalar.com" ]; then
  ok "only the known-inert fonts.scalar.com font-face string"
elif [ -z "$inert" ]; then
  ok "no subresource URLs at all"
else
  bad "unexpected subresource hosts in the vendored bundle:"; printf '       %s\n' $inert
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
         tutorials/install-naemon/index.html tutorials/install-nagios/index.html \
         tutorials/php-composer/index.html \
         tutorials/gearman-to-many-files/index.html \
         tutorials/setup-naemon-development-environment/index.html \
         v3/index.html v3/worker/index.html v3/ui/index.html \
         docs/api/index.html docs/migrating-from-3/index.html; do
  [ -f "public/$p" ] && ok "$p" || bad "$p missing"
done

note "The worker's OpenAPI document is mirrored on this origin"
spec=public/api/statusengine-worker.yaml
if [ -f "$spec" ] && head -1 "$spec" | grep -q '^openapi:'; then
  ok "$spec ($(grep -c '' "$spec") lines)"
else
  bad "$spec missing or not an OpenAPI document — run ./scripts/fetch-openapi.sh"
fi
# The renderer is loaded per page, not site-wide: it is larger than everything
# else the site ships put together.
if grep -q 'vendor/scalar/standalone' public/docs/api/index.html 2>/dev/null; then
  ok "the API page loads the vendored renderer"
else
  bad "public/docs/api/index.html does not reference the Scalar bundle"
fi
leaked=$(grep -rl 'vendor/scalar/standalone' public --include='index.html' 2>/dev/null | grep -v '^public/docs/api/index.html$' || true)
if [ -z "$leaked" ]; then
  ok "and no other page does"
else
  bad "the 3.6 MB renderer is also loaded by:"; printf '       %s\n' $leaked
fi

note "Old statusengine.org URLs still resolve"
for p in worker ui broker getting_started tutorials/install-naemon-focal \
         tutorials/install-naemon-centos8 tutorials/install-nagios4-focal \
         tutorials/install-nagios4-centos8; do
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
