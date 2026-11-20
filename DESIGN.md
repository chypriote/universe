# Nico to 中国 Design Language

> A personal travel site about China (and nearby Asia: Japan, Vietnam): trip reports, trip plans, photography and a flight price planner.

## 1. Visual Theme

**Theme statement:** warm, quiet, editorial travel journal.

**Character:** A print-style travel journal. Oatmeal paper, charcoal ink and one terracotta accent. Large photographs carry the page; type and thin rules give structure. The planning tools (flight table, price calendar, route map) use the same calm frame as the journals.

**Art direction:**
- Signature move: a sticky side panel (planner, region index, guide navigation) that stays in view while the content scrolls.
- Layout rhythm: wide white space, 12-column splits (7/5, 5/7), thin 1px rules between sections.
- Imagery: own photographs from the trips, natural and warm. No stock photos in the final site.

## 2. Color Palette

All colors are tokens in `src/styles/global.css` (`@theme`). Use the utilities (`bg-surface`, `text-muted-foreground`, …), not raw values.

### Neutrals (light)
| Token | Value | Usage |
|-------|-------|-------|
| `background` | hsl(36 25% 97%) | Page background |
| `surface` | hsl(36 20% 94%) | Alternate section, panels, form fields |
| `border` | hsl(36 12% 88%) | Rules, card and image borders |
| `muted-foreground` | hsl(210 5% 40%) | Secondary text, labels |
| `foreground` | hsl(210 10% 11%) | Primary text |

### Neutrals (dark sections)
Used for the footer and dark feature sections, not for a dark mode.
| Token | Value | Usage |
|-------|-------|-------|
| `dark-background` | hsl(210 10% 11%) | Dark section background |
| `dark-border` | hsl(210 10% 18%) | Rules and inputs on dark |
| `dark-muted-foreground` | hsl(210 5% 70%) | Secondary text on dark |
| `dark-foreground` | hsl(36 25% 97%) | Primary text on dark |

### Brand
| Token | Value | Usage |
|-------|-------|-------|
| `primary` | hsl(17 60% 49%) | Terracotta. Primary button, eyebrow labels, links, map route |
| `primary-hover` | hsl(17 65% 42%) | Primary hover |
| `primary-foreground` | hsl(36 25% 97%) | Text on primary |
| `secondary` | hsl(120 8% 46%) | Sage. Secondary accent |
| `secondary-hover` | hsl(120 10% 40%) | Secondary hover |
| `secondary-foreground` | hsl(36 25% 97%) | Text on secondary |

Favicon: `#c85a32` (≈ `primary`).

### Semantic
| Role | Token | Value |
|------|-------|-------|
| Success | `success` | hsl(142 76% 36%) |
| Warning | `warning` | hsl(38 92% 50%) |
| Error | `error` | hsl(0 72% 51%) |

Photo overlays may use `white` / `black` with opacity (hero, gallery lightbox). No other raw colors.

**Dark mode:** none. Not planned for now.

## 3. Typography

**Font families:**
- Headings (`font-serif`): Cormorant Garamond — high-contrast serif with print proportions.
- Body and UI (`font-sans`): Plus Jakarta Sans — clean geometric sans for reading and data.
- Labels (`font-mono`): monospace, for dates, durations, coordinates and small uppercase labels. Deliberate style.

**Type scale:** ad-hoc below `h3`; fluid tokens for headings.
| Token | Size | Line height | Usage |
|-------|------|-------------|-------|
| `text-h1` | clamp(2.25rem → 5rem) | 1.08 | Page and hero title |
| `text-h2` | clamp(1.75rem → 3rem) | 1.15 | Section title |
| `text-h3` | clamp(1.375rem → 1.875rem) | 1.3 | Sub-section title |
| `text-3xl` / `text-2xl` / `text-xl` | 30 / 24 / 20px | default | Card and list titles (serif) |
| `text-lg` | 18px | relaxed | Section lead paragraph |
| `text-base` / `text-sm` | 16 / 14px | relaxed | Body, card description |
| `text-xs` | 12px | default | Nav links, buttons |
| `text-[10px]` | 10px | default | Eyebrow and meta labels |

**Label style (eyebrow):** uppercase, `font-mono` or bold `font-sans`, wide letter spacing, often `text-primary`.

## 4. Components

| Component | Level | Purpose | Variants |
|-----------|-------|---------|----------|
| Button | Primitive | CTA. Uppercase, bold, `tracking-widest`, `text-xs`, sharp corners, `px-10 py-4` | Primary (terracotta fill), Light (white fill on photo), Ghost (1px border on photo) |
| Text link with arrow | Primitive | "Read more" style link | Primary color; arrow moves right on hover |
| Eyebrow label | Primitive | Small label above a title | Primary, muted |
| Tag | Primitive | Region or city label | 1px `primary/20` border, sharp |
| Segmented switcher | Primitive | Toggle Trip Reports / Trip Plans | Active = primary fill |
| Section header | Component | Eyebrow + `h2` + lead | Left aligned, centered |
| Trip card | Component | Trip preview: photo, meta line, title, text, link | Portrait 3/4 (plans), wide 16/9 alternating split (reports) |
| Navigation | Component | Sticky top bar, logo + 4 links, mobile menu | Translucent background after scroll |
| Footer | Component | Dark, brand + link columns | — |
| Hero | Pattern | Full-height photo with title, subtitle and two buttons | Parallax |
| Region index | Pattern | Dark section, sticky list of regions + image spread | — |
| Trip day section | Pattern | Day title, text, activities, photos, food | — |
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

Hover feedback is a color change, a border change or a slow image zoom (`scale-105`), never a shadow.

## 7. Motion

| Token | Value | Usage |
|-------|-------|-------|
| Reveal | 0.8s ease-out, 30px offset | `.reveal`, `.reveal-left/right/scale` on scroll |
| Stagger | 0.1s steps | `.reveal-delay-1…5` |
| Hero fade-up | 0.6s cubic-bezier(0.22, 1, 0.36, 1) | `.hero-animate` |
| Image zoom | 500–700ms | Card photo `hover:scale-105` |
| Color | default transition | Links, buttons |

All motion stops under `prefers-reduced-motion: reduce`.

## 8. Voice & Tone

**Target:** personal, first person. Nico tells what they saw, ate and paid. Concrete places, dates and prices.

**Avoid:** brand and luxury words ("monograph", "expert curation", "expedition", "modern explorer", "high-fidelity"). These are template text.

**Microcopy:** short uppercase labels; dates and durations in the mono label style ("12 days // Yunnan").

## 9. Do's and Don'ts

### Do
- Use the color tokens; never raw hex in components (map CSS included).
- Use `font-serif` for all titles and `font-sans` for body and UI.
- Keep corners sharp and borders 1px.
- Give photographs space: large images, wide margins.
- Use own trip photos.
- Keep one accent (terracotta) per view as the main call to action.

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
- Titles use `font-serif` + `text-h1/h2/h3`; labels use the eyebrow style.
- Wrap page content in `Container.astro`; sections use `py-24 lg:py-32`.
- Write copy in Nico's first-person voice, not marketing voice.

## 12. Known gaps (code vs. this file)

To fix:
- `trip-route-map.css` repeats color values instead of using the tokens.
- Letter spacing for labels has four values (`widest`, `0.2em`, `0.3em`, `0.4em`); pick one or two.
- Nav links to `/guide` (page is `/guides`); footer links to `/planning`.

Template content to replace:
- Region index (Mediterranean, Nordic, Andean) and stock Pexels photos in the hero and region sections.
- Marketing copy (see Voice & Tone).
- `SITE.socials` and `twitterHandle` placeholders.

To remove:
- Unused: `HeroSplit.astro`, `BlogLayout.astro`, `DocsLayout.astro`, `TableOfContents.astro`, `islands/TripArchive.tsx`.
- Newsletter form in the footer (no backend).

To rebuild:
- Footer "Price Index" and "Flight Matrix" links: point them to real flight price pages.
