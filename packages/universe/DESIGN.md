# Universe layer

What every Universe app shares, whatever its design family. A family (Showcase for the collection apps, Ink for Zhongguo) sets everything else: fonts, colours, shapes, focus ring, effects. Decision: [docs/adr/0001-design-families.md](../../docs/adr/0001-design-families.md). Components: [COMPONENTS.md](COMPONENTS.md).

## 1. Shared

| Part      | Rule                                                                                                                                                                                      | Where                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Motion    | One easing curve; 80ms for a press, 150ms for a colour or hover change. Nothing moves under `prefers-reduced-motion: reduce`.                                                             | `src/universe.css` (`--universe-easing`, `--universe-duration-*`) |
| Icons     | Lucide, stroke 2, in `currentColor`. Maps, logos and seals are pictures, not icons.                                                                                                       | `@lucide/svelte`, `@lucide/astro`, `lucide-react`                 |
| Formats   | Euros and numbers the French way ("1 604,20 €", "12 345"), dates the English way ("12 May 2024"), never American. Tabular figures.                                                        | `src/format.ts`                                                   |
| The koala | Nico's mark: one flat SVG in fixed greys, never recoloured or redrawn. Only in a footer or signature line; each app keeps its own logo and favicon. The one emoji-like image in Universe. | `src/koala.svg`, `Koala` wrappers                                 |

A family's own effects (Showcase's tile lift and tilt, Ink's scroll reveals) use the shared timings where they are short and stay in the family.

## 2. Not shared

Fonts, colours, radii, shadows, the focus ring, dark mode and every effect belong to the family. No bar or link ties the apps together.

## 3. An app's DESIGN.md

Every app's DESIGN.md (or its family's) uses these sections, in this order, and leaves out what this file already says:

1. Theme: one-line theme statement and character.
2. Colour: tokens and their roles; dark mode or not.
3. Typography: families, scale, label style.
4. Components: the family's and the app's own.
5. Layout: container, grid, spacing.
6. Depth and motion: the family's effects.
7. Voice: words and microcopy.
8. Do's and don'ts.
9. Agent prompt guide.

## 4. Agent prompt guide

- Import `universe.css` before the family's CSS. Take press and hover timings from it.
- Format money, numbers and dates with `@universe/universe/format`, never with a local `Intl` call.
- A component every family uses has one spec in COMPONENTS.md and a thin wrapper per framework, added when an app needs it.
