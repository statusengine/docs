# Statusengine documentation site

The source of https://statusengine.org/. Hugo + a vendored copy of the
[Hextra](https://github.com/imfing/hextra) theme, built in Docker.

## Requirements

Docker with Compose. Nothing else — **do not** build this with a locally
installed Hugo: Hextra needs the *extended* edition, and the container in
`docker-compose.yml` is pinned to a known-good one.

## Everyday commands

```bash
make dev      # live server on http://localhost:1313
make build    # production build into public/
make check    # build, then verify no external hosts and working highlighting
make test-ui  # build, then drive a browser over the lightbox
make test-api # build, then drive a browser over the API reference
make shots    # build, then screenshot every page in light and dark
make clean    # remove public/ and resources/
make help     # list every target
```

`make check` reads the finished HTML. The two `test-*` targets exist for the
things it cannot see: state that only appears after a click, and — for the API
reference — requests that only happen once 3.6 MB of vendored JavaScript runs.

## Layout

| Path | What lives there |
|---|---|
| `content/` | All pages. `docs/` and `tutorials/` are the two sections. |
| `assets/css/custom.css` | The whole design layer: brand colour, gradients, fonts, light/dark. |
| `layouts/` | Project overrides of theme templates. Small and deliberate — see the comment at the top of each file. |
| `static/fonts/` | Self-hosted Inter and JetBrains Mono. Refresh with `scripts/fetch-fonts.sh`. |
| `static/images/`, `static/favicon.svg` | The logo mark. |
| `themes/hextra/` | Vendored upstream theme. **Never edit anything in here** — see `themes/hextra/UPSTREAM.md`. |
| `assets/vendor/scalar/` | Vendored Scalar API reference renderer. **Never edit** — see its `UPSTREAM.md`. |
| `static/api/` | The worker's OpenAPI document, mirrored from the worker repository. Refresh with `scripts/fetch-openapi.sh`. |
| `scripts/check-build.sh` | What `make check` runs. |

## House rules

- **No CDNs.** Every font, script and stylesheet is served from this origin.
  `make check` fails the build if anything external creeps in, so run it before
  pushing.
- **Every code fence carries a language tag** (` ```toml `, ` ```cpp `, ` ```go `,
  ` ```yaml `, ` ```bash `). `make check` counts highlighted blocks against total
  blocks and fails on a mismatch.
- **Every page needs `title`, `description`, `date` and `weight`** in its front
  matter. `weight` drives sidebar order.
- **Do not invent configuration parameters.** Broker options come from
  `/home/nook24/git/broker/`, worker options from
  `/home/nook24/git/statusengine-worker/`.

## Updating the theme

```bash
make upgrade-theme THEME_TAG=v0.9.8
```

Then update `themes/hextra/UPSTREAM.md`, re-run `make check`, and review the diff
against the overrides in `layouts/`.

## The API reference

`/docs/api/` renders the worker's OpenAPI document with
[Scalar](https://github.com/scalar/scalar). Both halves are self-hosted, and
each is refreshed by its own script:

```bash
./scripts/fetch-openapi.sh                    # the document, from the worker repo's main
OPENAPI_REF=v1.4.0 ./scripts/fetch-openapi.sh # or from a tag
make upgrade-scalar SCALAR_VERSION=1.69.0     # the renderer
```

The document is a plain mirror — the worker repository is the source of truth,
so fix a wrong description there and re-run the script, never here.

Scalar's defaults would fetch fonts from `fonts.scalar.com`, route the "Test
Request" button through `proxy.scalar.com` and query `api.scalar.com` for its
AI feature. All of that is turned off in `assets/js/se-scalar.js` rather than
in the bundle, so after an upgrade run `make test-api`: it loads the page in a
real browser and fails if a single request leaves this origin.

Any other page can carry a reference too:

```
{{< openapi spec="/api/something-else.yaml" >}}
```

The renderer is then loaded on that page alone — it is bigger than the rest of
the site put together, so it is deliberately not part of the site-wide bundle.
