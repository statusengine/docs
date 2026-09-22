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
make test-ui  # build, then drive a browser over the lightbox and the scroll spy
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

## Relation to the 3.x documentation

This is a new site, not an evolution of the old one — different generator,
different content, its own history. The documentation for Statusengine 3 lives
on in the same GitHub repository on the **`3.x-master`** branch, and at tag
`3.8.0`. It is a PHP/Parsedown site and is licensed **CC BY-SA 4.0**, so text
taken from it carries that licence's share-alike condition with it.

The 3.x pages that are still useful are summarised under `/v3/` here, written
from the source rather than copied.

## Licensing

Two licences, because this repository holds two different kinds of work.

| What                                                            | Licence                                        |
|-----------------------------------------------------------------|------------------------------------------------|
| Code — `layouts/`, `assets/js/`, `assets/css/`, `scripts/`, build files | [MIT](LICENSE)                          |
| Content — the prose in `content/`, the screenshots in `assets/images/` | [CC BY 4.0](LICENSE-CONTENT)  |

MIT on its own would have been simpler, but its wording is about "the
Software"; read strictly it asks anyone quoting a paragraph to carry the
copyright notice along. CC BY is built for text, and says plainly what
attribution means and that translations and adaptations are allowed.

### Not covered by either

- **The Statusengine mark** — `static/images/logo-mark.svg`, `static/favicon.svg`
  and `brand/`. It identifies the project, so it is not yours to reuse as a mark
  for something else. Illustrating or linking to Statusengine is fine.
- **The EU label for AI-generated content** in the footer. It comes from the
  European Commission's icon set and is used under
  [its own terms](https://digital-strategy.ec.europa.eu/en/policies/eu-icons-labelling-ai-generated-content).
- **Bundled third-party code**, which keeps its own licence and ships the text
  alongside it:

  | Path                    | Licence                            |
  |-------------------------|------------------------------------|
  | `themes/hextra/`        | MIT — see `themes/hextra/LICENSE`  |
  | `assets/vendor/scalar/` | MIT — see that directory's LICENSE |
  | `static/fonts/`         | SIL OFL 1.1 — see the OFL files    |

`static/api/statusengine-worker.yaml` is a mirror of the OpenAPI document in
the [worker repository](https://github.com/statusengine/statusengine-worker)
and carries that project's licence, which is also MIT. Note that the broker is
**GPLv2**, not MIT — the two Statusengine components differ.
