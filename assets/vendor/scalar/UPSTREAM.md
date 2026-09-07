# Vendored API reference renderer

`standalone.js` is a vendored copy of the browser build of
[Scalar](https://github.com/scalar/scalar)'s API reference. It is committed to this
repository on purpose: Scalar's own documentation only ever shows the jsdelivr script
tag, and the site must load nothing from a CDN at runtime (CLAUDE.md, "Datenschutz").

| | |
|---|---|
| Upstream | https://github.com/scalar/scalar |
| Package | `@scalar/api-reference` |
| **Version:** | 1.68.0 |
| File taken | `dist/browser/standalone.js` |
| License | MIT (see `LICENSE`) |

## Why only one file

The npm package unpacks to 40 MB. `dist/browser/standalone.js` is the self-contained
IIFE build: it contains no `chunks/` references and no dynamic imports other than the
opt-in `pluginUrls` feature, so this single file is the whole renderer. The sibling
`standalone.esm.js` is *not* usable on its own — it code-splits into 90 chunk files.

The trailing `//# sourceMappingURL=` comment is stripped by the fetch script. The map
is 29 MB; without the comment devtools simply shows the minified source instead of
requesting a file that is not published.

## What the bundle would otherwise contact

Three things in it point at Scalar's own infrastructure. All three are switched off in
`assets/js/se-scalar.js`, and `make test-api` asserts at runtime that no request leaves
the origin:

| | Default | What we set |
|---|---|---|
| Web fonts | injects `@font-face` rules for `fonts.scalar.com` | `withDefaultFonts: false` — the site already self-hosts the same two families, Inter and JetBrains Mono |
| Request proxy | `proxyUrl: 'https://proxy.scalar.com'`, used by "Test Request" | `proxyUrl: ''`, plus the test client is hidden entirely |
| Telemetry | `telemetry: true` | `telemetry: false` — the flag is declared but never read in this build (there is no PostHog code in it), set anyway so an upgrade cannot quietly turn it on |
| "Ask AI" agent | enabled | `agent: { disabled: true }` — otherwise it queries Scalar's document registry over `api.scalar.com` as soon as the reference mounts, before anyone clicks anything |

One more default is not about privacy but about what readers see: Scalar shows
its "Configure / Share / Deploy" toolbar whenever it thinks it is running on a
development host, which includes every local preview of this site. It is pinned
off with `showDeveloperTools: "never"` so screenshots match production.

`data-spec`, `data-spec-url` and `data-proxy-url` are reserved: the bundle still
supports its own deprecated HTML API and runs `querySelector("[data-spec]")` on
load. The shortcode therefore namespaces its attributes as `data-se-*`.

## Updating

    make upgrade-scalar SCALAR_VERSION=1.69.0

Then run `make check` and `make test-api`. Do not edit `standalone.js`.
