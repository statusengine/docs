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
