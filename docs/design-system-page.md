# Showcase design-system page

The page is a rendering of the files in `packages/showcase/design-system/`. The files are the source: edit them in the same PR as the token, theme slot or component they describe.

| File | Holds |
|---|---|
| `tokens.json` | Colours (one value per theme), type, spacing, radius, shadow, layers, breakpoints, timing. `meta.paths` lists the code it mirrors. |
| `README.md` | The brand book. |
| `components/bundle.css` | The `sc-*` styles of the previews, and each theme's non-colour slots. |
| `components/<Name>/README.md`, `preview.html` | One card per component. |
| `assets/<Group>/` | Each app's mark and the Jerseys shirt outline. |
| `design-system.json` | The index: title, asset records, last change. |

Rules:

- Each app is two themes in `tokens.json` (`<app>-light`, `<app>-dark`) and a block in `bundle.css`. Every token with a value per theme gets both.
- Use code names only: invented data like "Bird One", never real words or links.
- The page holds at most 8 themes.

## Republish

Publish the folder to the existing artifact `https://claude.ai/artifact/Fdnc2AfpFDeiV5cE7gEVuo` with the Artifact tool: `url` that link, `root` the folder, `file_path` the absolute path of `tokens.json`, and `files` mapping each changed file to its `project/` path (for example `"project/tokens.json": "tokens.json"`). Send `design-system.json` once, last. Upload a new mark under `assets/` as an asset, then add its record (`name`, `blob`, `size`, `type`) to `assetGroups` in `design-system.json`.
