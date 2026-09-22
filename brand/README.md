# Brand assets

The Statusengine mark as standalone files, for places outside this site — the
GitHub organisation, READMEs, slides.

| File                         | Use                                                      |
|------------------------------|----------------------------------------------------------|
| `statusengine-mark.svg`      | READMEs, the org profile page, anything that takes vector |
| `statusengine-mark-512.png`  | GitHub organisation avatar                                |
| `statusengine-mark-1024.png` | Anywhere that wants more pixels                           |

GitHub does not accept SVG for avatars, only PNG, JPG or GIF — hence the raster
exports. Both PNGs are transparent outside the rounded corners.

The SVG is the same artwork as `static/images/logo-mark.svg`, scaled 16x to a
512 canvas so the path numbers stay whole. **If one changes, change both**:
nothing in the build keeps them in step.

Colours: `#c9503d` → `#8c2f24` (the brand gradient). The site's flat brand
colour is `#b03b2d`.
