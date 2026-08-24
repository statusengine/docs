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
make clean    # remove public/ and resources/
make help     # list every target
```

## Layout

| Path | What lives there |
|---|---|
| `content/` | All pages. `docs/` and `tutorials/` are the two sections. |
| `assets/css/custom.css` | The whole design layer: brand colour, gradients, fonts, light/dark. |
| `layouts/` | Project overrides of theme templates. Small and deliberate — see the comment at the top of each file. |
| `static/fonts/` | Self-hosted Inter and JetBrains Mono. Refresh with `scripts/fetch-fonts.sh`. |
| `static/images/`, `static/favicon.svg` | The logo mark. |
| `themes/hextra/` | Vendored upstream theme. **Never edit anything in here** — see `themes/hextra/UPSTREAM.md`. |
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
