# Vendored theme

This directory is a vendored copy of the [Hextra](https://github.com/imfing/hextra) Hugo theme.
It is committed to this repository on purpose: the site must build without fetching anything
from the network at build time.

| | |
|---|---|
| Upstream | https://github.com/imfing/hextra |
| Tag | `v0.9.7` |
| Commit | `38c8ee1168927a2b7552a2c24b087d50173f9642` |
| License | MIT (see `LICENSE`) |

## Removed from the upstream tree

`.git/`, `.github/`, `exampleSite/`, `images/`, `netlify.toml`, `build.sh`, `dev.toml`,
`taskfile.yaml` — upstream development scaffolding that the site does not need.

## Updating

    make upgrade-theme TAG=v0.9.8

Then re-run `make build` and review the diff. Local overrides live in `assets/css/custom.css`
and `layouts/`, never inside this directory — do not edit files here.

## Removed from the vendored copy

`make upgrade-theme` strips these after cloning, so this directory is not a
verbatim v0.9.7 checkout:

- `.git`, `.github`, `exampleSite`, `images`, `netlify.toml`, `build.sh`,
  `dev.toml`, `taskfile.yaml` — upstream's own repository furniture.
- `package.json`, `package-lock.json`, `postcss.config.js`,
  `tailwind.config.js`, `go.mod` — upstream's build toolchain. It produces
  `assets/css/compiled/main.css`, which upstream ships already compiled and
  which is the only stylesheet this site loads; the `postCSS` branch in
  `layouts/partials/head-css.html` runs only under `--environment=theme`,
  which no build here uses. Leaving the manifests in place published a
  dependency tree that is never installed, and Dependabot opened pull requests
  against it.

Nothing that Hugo reads at build time is removed. `make check` and
`make test-ui` cover it.
