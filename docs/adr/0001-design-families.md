# 1. A shared Universe layer and one design system per family

Date: 2026-11-23. Decided by Nico.

## Context

Universe held only collection apps, all on the Showcase design system (SvelteKit, round, packed, dark mode). Zhongguo, a travel journal and flight planner, joins it with a different look (ink and cinnabar: sharp, flat, no dark mode) and a different stack (static Astro with React islands). More apps unlike Showcase will follow, yet every app should be recognisable as part of Universe.

## Decision

- Universe means Nico's apps. The collection apps (Jerseys, Vinyles) are one family.
- Design is layered:
  - **Universe layer**, `packages/universe`, no framework dependency, shared by every app: easing curve and short durations (80ms press, 150ms colour/hover), nothing moves under `prefers-reduced-motion: reduce`, Lucide icons at stroke 2, formats (euros in French format, dates `en-GB` and never `en-US`, tabular figures), the koala, and the DESIGN.md structure every app follows.
  - **Families**: Showcase for the collection apps; Journal for personal journal apps (Zhongguo). A family sets its own fonts, colours, shapes, focus ring and effects. Journal stays in `apps/zhongguo` until a second app uses it.
  - A family is named for what its apps are used for, not for how they look.
- Not shared: focus ring, fonts, accents, family effects. Tile lift and tilt stay in Showcase.
- The koala is Nico's mark: one flat SVG in fixed greys, never recoloured, shown only in a footer or signature line (collection apps: below the wall). Apps keep their own logo and favicon. It is the one exception to Showcase's "no emoji".
- A component shared across frameworks has one spec and one CSS file in `packages/universe`, and a thin wrapper per framework written on demand (`.svelte`, `.astro`, React for islands only). No web components.
- An app keeps its framework: Zhongguo stays on Astro and React.
- Nothing visible links the apps for now (no shared bar or app switcher).

## Consequences

- UI shared across families goes in `packages/universe`; UI shared by the collection apps goes in `packages/showcase`.
- `packages/owner` depends on SvelteKit, so Zhongguo has no Owner login until it is made framework-agnostic.
