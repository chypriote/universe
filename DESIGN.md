# Nico to 中国 Design Language

> A personal travel site about China (and nearby Asia: Japan, Vietnam): trip reports, trip plans, photography and a flight price planner.

## 1. Visual Theme

**Theme statement:** ink and cinnabar — a quiet photo journal of China.

**Character:** Rice-paper background, ink-black type and one seal-red accent, used the way a red chop is used on a scroll: rarely, and where it matters. Large photographs carry the page; type and thin rules give structure. The planning tools (flight table, price calendar, route map) use the same calm frame as the journals.

**Art direction:**
- Signature move: the square cinnabar seal (印章) with 中. It is the logo, the favicon and the main solid red block on a page.
- Second move: a sticky side panel (planner, day meta, guide navigation) that stays in view while the content scrolls.
- Layout rhythm: wide white space, 12-column splits (7/5, 5/7), thin 1px rules between sections.
- Imagery: own photographs from the trips (`src/assets/trips`). No stock photos.

## 2. Color Palette

All colors are tokens in `src/styles/global.css` (`@theme`). Use the utilities (`bg-surface`, `text-muted-foreground`, …), not raw values. Values are in that file; the table gives the role.

### Neutrals (light)
| Token | Role | Usage |
|-------|------|-------|
| `background` | Rice paper, warm off-white | Page background |
| `surface` | Darker paper | Alternate section, panels, form fields |
| `border` | Paper rule | Rules, panel borders |
| `muted-foreground` | Grey ink | Secondary text, labels |
| `foreground` | Ink, near black | Primary text |

### Neutrals (dark sections)
Used for the footer and dark feature sections, not for a dark mode.
| Token | Usage |
|-------|-------|
| `dark-background` | Ink-wash section background |
| `dark-border` | Rules on dark |
| `dark-muted-foreground` | Secondary text on dark |
| `dark-foreground` | Primary text on dark |

### Brand
| Token | Role | Usage |
|-------|------|-------|
| `primary` | Cinnabar (朱砂) | Seal, primary button, eyebrow labels, links, map route. AA on `background`. |
| `primary-hover` | Darker cinnabar | Primary hover |
| `primary-foreground` | Paper | Text on primary |
| `secondary` | Jade | Rare data highlight (for example the cheapest fare) |
| `secondary-hover` | Darker jade | Secondary hover |
| `secondary-foreground` | Paper | Text on secondary |

Favicon: `public/favicon.svg`, the seal.

### Semantic
| Role | Token |
|------|-------|
| Success | `success` |
| Warning | `warning` |
| Error | `error` |

Photo overlays may use `white` / `black` with opacity (hero, gallery lightbox). No other raw colors.

**Dark mode:** none. Not planned for now.

## 3. Typography

**Font families** (loaded in `astro.config.mjs` → `fonts`):
- Headings (`font-serif`): Fraunces, variable with optical sizes. Light to medium weights; italic only for quotes and emphasis.
- Body and UI (`font-sans`): Inter.
- Chinese (`font-cjk`): system serif (Noto Serif SC, Songti SC, SimSun). No webfont: a CJK font costs several MB. Mark Chinese text with `lang="zh"`; the base styles apply the font.

**Type scale:** ad-hoc below `h3`; fluid tokens for headings (values in `global.css`).
| Token | Usage |
|-------|-------|
| `text-h1` | Page and hero title |
| `text-h2` | Section title |
| `text-h3` | Sub-section title |
| `text-3xl` / `text-2xl` / `text-xl` | Card and list titles (serif) |
| `text-lg` | Section lead paragraph |
| `text-base` / `text-sm` | Body, card description |
| `eyebrow` | Labels |

**Label style:** the `eyebrow` utility — 11px Inter semibold, uppercase, 0.24em tracking, cinnabar. Use `text-muted-foreground` on it for neutral meta lines (dates, durations). One letter spacing for all labels.

## 4. Components

| Component | Level | Purpose | Variants |
|-----------|-------|---------|----------|
| Seal | Primitive | Square cinnabar mark with 中 (`seal` utility; size with `w-*` + `text-*`) | — |
| Button | Primitive | CTA. `btn` utility: uppercase, semibold, sharp corners | `btn-primary` (cinnabar fill), `btn-outline` (current color, fills with ink on hover) |
| Text link with arrow | Primitive | "Read more" style link | Primary color; arrow moves right on hover |
| Eyebrow label | Primitive | Small label above a title (`eyebrow` utility) | Primary, muted |
| Tag | Primitive | Region or city label | 1px border, sharp |
| Tabs | Primitive | Toggle Trip reports / Trip plans (`aria-pressed`) | Active = ink text + 2px cinnabar underline |
| Section header | Component | Eyebrow + `h2` + lead | Left aligned, centered |
| Trip card | Component | Trip preview: photo, meta line, title, text, link | Portrait 3/4 (plans), wide 16/9 alternating split (reports) |
| Navigation | Component | Sticky top bar: seal + name, 4 links with a cinnabar underline on the current page, mobile menu | — |
| Footer | Component | Dark, seal + name + description, one link list | — |
| Hero | Pattern | Full-height trip photo, title bottom-left, vertical 中国游记 on the right (desktop), two buttons | — |
| Region index | Pattern | Dark section, sticky list of regions from the trips + staggered trip covers | — |
| Trip day section | Pattern | Large cinnabar day number, title, sticky activities and food (Chinese + pinyin), text, photos | — |
| Route map | Pattern | Leaflet map of the trip route | — |
| Flight planner | Pattern | Flight table (1/3) + price calendar (2/3) | — |
| Gallery | Pattern | Photo grid grouped by trip, lightbox | — |
| Guide page | Template | Long text with sticky side navigation | — |

## 5. Layout

**Container:** `max-w-screen-xl`, `px-4 md:px-8` (`Container.astro`).

**Grid:** 12 columns on `lg`. Common splits 7/5, 5/7, 4/2/2/4 (footer). Gaps `gap-12 lg:gap-20`.

**Spacing base unit:** 4px (Tailwind scale).
| Use | Value |
|-----|-------|
| Section padding | `py-24 lg:py-32` (or `py-20 lg:py-32`) |
| Section header to content | `mb-16` |
| Inside a card | `gap-3` to `gap-6` |
| Between list items | `gap-12 lg:gap-24` |

**Section separation:** 1px horizontal rules or an alternate `surface` / `dark-background` band. No gradients except the hero fade.

**Breakpoints:** Tailwind defaults. `md` (768px) and `lg` (1024px) are the ones in use.

**Density:** comfortable.

## 6. Depth

Flat. No elevation scale.
| Level | Treatment | Usage |
|-------|-----------|-------|
| 0 | None | Everything by default |
| Border | 1px `border` | Cards, images, panels |
| Overlay | `background/90` + `backdrop-blur` | Sticky nav after scroll, map labels |

Hover feedback is a color change, a border change or a slow image zoom (at most `scale-[1.03]`), never a shadow.

## 7. Motion

| Token | Value | Usage |
|-------|-------|-------|
| Reveal | 0.8s ease-out, 30px offset | `.reveal`, `.reveal-left/right/scale` on scroll |
| Stagger | 0.1s steps | `.reveal-delay-1…5` |
| Hero fade-up | 0.6s cubic-bezier(0.22, 1, 0.36, 1) | `.hero-animate` |
| Image zoom | 700ms | Card photo, at most `scale-[1.03]` |
| Color | default transition | Links, buttons |

All motion stops under `prefers-reduced-motion: reduce`.

## 8. Voice & Tone

**Target:** personal, first person. Nico tells what they saw, ate and paid. Concrete places, dates and prices.

**Avoid:** brand and luxury words ("monograph", "expert curation", "expedition", "modern explorer", "high-fidelity"). These are template text.

**Microcopy:** short uppercase labels; dates and durations in the `eyebrow` style ("12 days · Yunnan").

## 9. Do's and Don'ts

### Do
- Use the color tokens; never raw hex in components (map CSS included).
- Use `font-serif` for all titles and `font-sans` for body and UI.
- Keep corners sharp and borders 1px.
- Give photographs space: large images, wide margins.
- Use own trip photos.
- Keep red rare: one solid cinnabar element (seal or primary button) per view.
- Show Chinese names next to English ones, with `lang="zh"`.

### Don't
- Don't use shadows (`shadow-*`, `.hover-lift`).
- Don't use rounded pills or rounded cards (`rounded-*`), except round dots in maps and legends.
- Don't use neon colors, gradients or startup-style illustrations.
- Don't put display headlines in columns narrower than 60% of the container.
- Don't add a dark mode.

## 10. Responsive

- Mobile first. One column under `lg`; 12-column splits from `lg`.
- Nav links collapse into a full-width menu under `md`.
- Planner: table and calendar stack on mobile; side by side (1/3 + 2/3) from `lg`.
- Sticky panels are sticky only from `lg`.

## 11. Agent Prompt Guide

- Read colors, fonts and heading sizes only from `src/styles/global.css` tokens.
- Sharp corners and no shadows, always.
- Titles use `font-serif` + `text-h1/h2/h3`; labels use `eyebrow`; buttons use `btn`.
- Wrap page content in `Container.astro`; sections use `py-24 lg:py-32`.
- Write copy in Nico's first-person voice, not marketing voice.

## 12. Known gaps (code vs. this file)

To fix:
- `trip-route-map.css` repeats color values instead of using the tokens.
- Pages still use `font-mono` and several letter spacings for labels; move them to `eyebrow`.

Template content to replace:
- Stock Pexels photos in the guide sections.
- Marketing copy (see Voice & Tone).
- `SITE.socials` and `twitterHandle` placeholders.

To remove:
- Unused: `BlogLayout.astro`, `DocsLayout.astro`, `TableOfContents.astro`, `islands/TripArchive.tsx`.

To rebuild:
- Footer links to flight price pages ("Price Index", "Flight Matrix"), once those pages exist.
