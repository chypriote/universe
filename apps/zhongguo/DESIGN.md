# Journal: the design family of Zhongguo

> A personal travel site about China (and nearby Asia: Japan, Vietnam): trip reports, trip plans, photography and when to go.

Journal is the family for personal journal apps: Zhongguo today, maybe a food review app later. It builds on the Universe layer ([packages/universe/DESIGN.md](../../packages/universe/DESIGN.md)): press and hover timings, reduced motion, Lucide icons, money and date formats and the koala come from there and are not repeated here.

## 1. Theme

**Theme statement:** ink and cinnabar — a quiet photo journal of China, like stepping into an old temple: calligraphy, bamboo, ink-wash hills.

**Character:** Rice-paper background, ink-black type and one seal-red accent, used the way a red chop is used on a scroll: rarely, and where it matters. Large photographs carry the page; type and thin rules give structure. The planning tools (flight table, price calendar, route map) use the same calm frame as the journals.

**Art direction:**
- Signature move: the square cinnabar seal (印章) with 中. It is the logo, the favicon and the main solid red block on a page.
- Temple moves (2026-11-23): vertical brush calligraphy (`font-brush`) beside titles, ink bamboo, an ink-wash landscape (水墨: misty hills, plum branch, birds) behind the home hero and the index page headers. No red or dark bands: ink on paper. The footer is the one exception: it is inverted to ink.
- Floating 汉字 (often): a faint brush (`font-brush`) Chinese word behind or beside the text it translates, in `gold-ink` at 20-25% opacity, `aria-hidden`, `lang="zh"`, large and allowed to overflow its box. Use it often: guide tiles, trip days, group headers, section headers, the title above each guide table. It is decoration only; the English text stays the heading and stays readable over it.
- Second move: a sticky side panel (planner, day meta, guide navigation) that stays in view while the content scrolls.
- Layout rhythm: wide white space, 12-column splits (7/5, 5/7), thin 1px rules between sections.
- Imagery: own photographs from the trips (in R2, see `docs/photos.md`) and hand-drawn ink SVG (hills, bamboo, plum). No stock or AI images.
- Surface: the whole site is rice paper drawn upon. Faint ink mountains (`InkWash`, hills only) are fixed behind every page in `BaseLayout.astro`, so page sections stay transparent: no opaque section backgrounds.
- Surface detail: A faint fibre grain (`--paper-grain` in `global.css`) sits on the body and on every `bg-background` / `bg-surface` panel.

## 2. Colour

All colors are tokens in `src/styles/global.css` (`@theme`). Use the utilities (`bg-surface`, `text-muted-foreground`, …), not raw values. Values are in that file; the table gives the role.

### Neutrals (light)
| Token | Role | Usage |
|-------|------|-------|
| `background` | Rice paper, warm off-white | Page background |
| `surface` | Darker paper | Alternate section, panels, form fields |
| `border` | Paper rule | Rules, panel borders |
| `muted-foreground` | Grey ink | Secondary text, labels |
| `foreground` | Ink, near black | Primary text |

### Neutrals (dark)
Used only for the photo lightbox and the footer, not for other page sections and not for a dark mode.
| Token | Usage |
|-------|-------|
| `dark-background` | Lightbox and footer background |
| `dark-border` | Rules on dark |
| `dark-muted-foreground` | Secondary text on dark |
| `dark-foreground` | Primary text on dark |

### Brand
| Token | Role | Usage |
|-------|------|-------|
| `primary` | Cinnabar (朱砂) | Seal, primary button, eyebrow labels, links, map route. AA on `background`. |
| `primary-hover` | Darker cinnabar | Primary hover |
| `primary-foreground` | Paper | Text on primary |
| `gold` | Gold leaf | Footer link hover and brush watermarks |
| `gold-ink` | Gold on paper | Accent: trip and day numbers, current-page and active-tab underline, hero subtitle, bamboo leaf sprays, footer bamboo. AA on `background`. |
| `secondary` | Jade | Rare data highlight (for example the cheapest fare) |
| `secondary-hover` | Darker jade | Secondary hover |
| `secondary-foreground` | Paper | Text on secondary |

Favicon: `public/favicon.svg`, the seal; `public/apple-touch-icon.png` is the same seal at 180px.

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
- Titles (`font-serif`): Yuji Syuku (OFL), a brush-drawn serif. One weight, no italic: don't use `italic`, `font-semibold` or `font-bold` with it. Self-hosted in `public/fonts/yuji-syuku-latin.woff2`, subset to Latin (`pyftsubset YujiSyuku-Regular.ttf --unicodes="U+0020-007E,U+00A0-00FF,U+0152-0153,U+2010-2027,U+2030-203A,U+20AC,U+2122,U+2190-2193" --layout-features='*' --flavor=woff2`). Base letter spacing -0.03em.
- Body and UI (`font-sans`): Inter.
- Journey titles (`font-script`): Kaushan Script (OFL), self-hosted in `public/fonts/kaushan-script-latin.woff2` (Latin subset from `@fontsource/kaushan-script`). Only for the journey titles on the Journeys page, up to two lines from `lg`. Falls back to `font-serif`.
- Brush calligraphy (`font-brush`): Ma Shan Zheng (OFL), self-hosted in `public/fonts/ma-shan-zheng-subset.woff2`. The file holds only the characters the site writes in it: 中国游记行程山河一路平安指南机票影集 and the Guides page words (出发前旅途中遇险, one word per guide, and the words behind the guide table titles in `src/data/guide-zh.ts`) plus every Chinese Province and City name in the Journal (`provinces` and `cities` tables). A City added later in the admin needs the file subset again, or its 汉字 falls back to the system serif. To add characters, subset again from the Google Fonts source with that text and the new characters, and replace the file:
  `pyftsubset MaShanZheng-Regular.ttf --text="<characters>" --flavor=woff2 --output-file=public/fonts/ma-shan-zheng-subset.woff2`
  Use it for short decorative Chinese only (titles, plaques, province names on maps), with `lang="zh"`; vertical text uses the `vertical` utility.
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
| Seal | Primitive | Square cinnabar mark with 中, thin carved inner line (`seal` utility; size with `w-*` + `text-*`) | 中 (logo, and the chop next to the hero calligraphy), 迷 (404) |
| Button | Primitive | CTA. `btn` utility: uppercase, semibold, sharp corners | `btn-primary` (cinnabar fill), `btn-outline` (current color, fills with ink on hover) |
| Text link with arrow | Primitive | "Read more" style link | Primary color; arrow moves right on hover |
| Eyebrow label | Primitive | Small label above a title (`eyebrow` utility) | Primary, muted |
| Activity row | Component | One Activity of a Plan Day (`ActivityRow.tsx`): square picture with a rating icon top left (filled star do-not-miss, outlined star recommended, cross avoid, none for skippable; tooltip on hover), kind tag top right, serif name, Chinese name with the pinyin as a hover tooltip, description filling the height, then price left and the address right with a language switch and a copy button. Trip reports keep the plain list | — |
| Tabs | Primitive | Toggle Trip reports / Trip plans (`aria-pressed`): large serif labels, each over a faint brush character (游记, 行程) | Active = ink text, darker character, gold-ink brush stroke underneath |
| Section header | Component | Home sections: vertical brush characters, an eyebrow that translates them, `h2`, lead (`home/SectionHeader.astro`). Same top padding in every home section | — |
| Bamboo | Decoration | Bamboo stalks and leaf sprays (`Bamboo.astro`, currentColor) | `flip` |
| Bamboo grove | Decoration | Four gold stalks with leaf sprays on the right edge, from the top of the page through the footer, which adds extra leaf sprays (`leavesOnly`) so it stays full (`BambooGrove.astro`, SVG patterns, in `BaseLayout.astro`). Below 1400px the footer shows its own clump (`Bamboo.astro`) instead. The tops are cut at a node; on the home and index pages they sit in the hero or page header, fading into mist. Only from 1400px, where it fits in the margin | — |
| Panda | Decoration | Waving panda holding a grove stalk with its raised paw (`Panda.astro`, see "Panda drawing"). Two only: "Next on the list" (paw on the left, middle of the section) and the footer (mirrored). From 1400px | `dark`, `mirror` |
| Grove pandas | Decoration | On Guide pages and Trip pages: 3–4 pandas rest on the grove's left-pointing leaves, any pose except the jump, and one smaller hanging panda (70px wide) grips the second stalk, a middle one. Perching pandas sit close to the stalk (30% along the leaf). The browser picks them at random on every visit, at least 480px apart and never in the footer; from top to bottom, no pose twice in a row (`GrovePandas.astro`, leaf positions from `groveGeometry.ts`). From 1400px | — |
| Ink stroke | Decoration | One dry-brush ink stroke with ragged edges (`InkStroke.astro`, currentColor). Stretches to its box | — |
| Ink wash | Decoration | Misty ink hills, plum branch with cinnabar blossoms, birds (`InkWash.astro`) | — |
| Page header | Pattern | A short version of the home hero on every index page (Journeys, Guides, Plan, Photos): ink wash (no plum, no birds), the page name in ink brush with the 中 seal, the English title in gold serif caps, lead. The bamboo grove tops sit in it (`TempleHeader.astro`) | — |
| Trip card (home) | Component | Trip preview on the home page: photo, meta line, title, text | Completed: 3/2 photo in a `bamboo-frame`, alternating 7/5 split, gold-ink number, region line, "Read the journal" arrow link. Suggested: 4/3 photo in a 3-column grid (the seal when there is no photo) |
| Journey card | Pattern | One journey, `TripCard.astro`, on the Journeys page (`TripArchive.astro`): `font-script` title on up to two lines (5rem), gold-ink dates under it with the year shown once, description, an "Explore" link over a faint gold 游记 with a gold-ink `InkStroke` under it, then a photo strip (2 portraits, the landscape, 2 portraits) faded at both ends (`mist-soft`). From `lg` the Trip regions map sits to the right of the text column (`map-fade`); on mobile it comes after the photos. A bamboo divider with the leaf on the left separates journeys. The home Recent journeys section shows a shorter teaser of each report (cover in a shallow mist fade (`mist-soft`), no map, no dates; the text column is as tall as the cover: script title at the top, the description filling the space, Explore at the bottom right). The home Next on the list section shows each plan as three columns of the same parts: cover in a mist fade, script title, three-line description, and the Explore link at the bottom over a faint 行程, with no dates | Report, plan (tabs) |
| Trip regions map | Component | The trip's provinces washed in ink on a faint map of China, with their brush (`font-brush`) and serif caps names, under the cinnabar dotted route, drawn as one smooth curve through every stop, and a dot for each City: large for a Major City, small for a Minor one (`TripRegionsMap.astro`). Labels move off a province's centre only to avoid each other | `compact` (mobile: larger labels, no room kept for title and photos), `centered` (nothing covers the map: the route is framed in the middle, as in the Trip route) |
| Navigation | Component | Sticky top bar: seal + name, 4 links with a gold underline on the current page, mobile menu | — |
| Footer | Component | Inverted: `dark-background` with `dark-foreground` text, gold-ink bamboo, 中国游记 in vertical brush, seal + name + description, one link list, each over its Chinese title (游记, 指南, 机票, 影集) as a faint `gold` brush watermark; labels in tracked `font-serif` caps, gold on hover, the koala before the copyright line | — |
| Hero | Pattern | Ink wash on paper (no plum, no birds), no gate; centered: wide-tracked eyebrow, 中国游记 in ink brush with the 中 seal, English subtitle, ink button + outline button, a thin ink scroll line | — |
| China map | Pattern | Clickable SVG map of China (`ChinaMap.tsx`). Hover or focus shows the name in English and Chinese, a photo if there is one, and a detail line. Labels are hover and click targets too; Hong Kong and Macao labels sit offshore on a leader line. Used on Photos (click filters photos, dots are cities) and on the home Regions section (visited provinces only; click opens a trip). Shapes: Natural Earth, public domain, built by `scripts/build-china-map.mjs` into `src/data/china-map.json`. | Light, dark |
| Trip header | Pattern | Cover photo fading into the paper, centred `font-script` title, description, dates and day count (`trips/[slug].astro`) | — |
| Trip route | Pattern | Trip regions map (`centered`) beside the city list, each stop a link to its day with its day label (`TripRouteSection.astro`). Hovering a stop in the list or its dot on the map lights up the other: the list name turns cinnabar and underlined, the dot grows a little (×1.4) and its name shows on the map. The list shows the first stop, the last stop and the Major Cities only; a City that a Minor City split in two is joined into one line. The map and the list are centred in the section and the list starts at the top of its column | — |
| Trip day | Pattern | A timeline: the city name in caps on the left (the main City of the Day, where most of it was spent, is large; the other Cities of the Day are smaller), over its 汉字 as a faint gold brush backdrop that may overflow to the left (shown when the city changes), a gold-ink line with a cinnabar dot, then gold day number, title, text, Activities (name, hanzi, pinyin), Food and the photo strip. On mobile the city is a line above the title | — |
| Day photo strip | Component | One horizontal scroll-snap strip per Day (`TripDayGallery.tsx`), 520px high on desktop and 352px on mobile, whatever the photo count. Photos have two shapes only, 3:2 landscape and 2:3 portrait (a square counts as landscape), cropped with `object-cover`, 12px apart, never shrunk. Below it: counter ("01 / 14"), a gold-ink line with a short cinnabar thumb, and previous/next square buttons; all three show only when the photos overflow. A lone landscape fills the column width on mobile. A photo opens the lightbox. A Day without photos shows no strip | — |
| Plan page | Pattern | One month axis; one lane per plan: gold runs where a start date fits the Season, cinnabar bars for the 3 cheapest Fare windows once searched. Hover, focus or tap a plan to show its good dates, its cheapest dates and its Trip Cover below, full width and as tall as the Trip page header (30rem, 33rem from `lg`) with the same fade into the paper; hovering a gold run or a bar shows its dates | — |
| Gallery | Pattern | Photo grid grouped by trip, lightbox | — |
| Guide index | Pattern | The Guides page: guides in three groups by when you need them. Each group has a header (horizontal brush 汉字, a larger cinnabar eyebrow that translates it, a serif `text-h3` title; no lead, no numbers) over a grid of 1px-bordered tiles: title, description, "Read" link, and the guide's 汉字 faint at the top right behind the description (`text-gold-ink/[0.13]`, `/25` on hover). At most 3 columns (2×2, then 3, then one tile at one column's width, left-aligned). Guide tiles in `guides/index.astro` | — |
| Guide page | Template | The page header (`TempleHeader`: brush 汉字, gold title, lead), then a sticky sidebar over the text. The sidebar lists all guides, each with its 汉字; the current one opens into its sections and sub-sections, and the section being read is cinnabar with its sub-sections open (mobile: sections only). Text (`.guide-prose` in `global.css`): a short gold bar above each section title, smaller sub-section titles, sharp 1px tables with gold caps headers, a callout with a cinnabar rule, gold hairline bullets; the remark TOC box is hidden. The end: the bamboo rule with the leaf on the left, then one plain "Next guide" link on the right over the next guide's faint 汉字 (no boxes, no Previous link) | — |

### Admin

The admin (`/admin`, owner only) is plain: sharp corners, 1px borders, no brush calligraphy.
- Top bar: seal and "Admin", then the three workspaces as serif tabs (Journal, Atlas, Gallery; the current one has a cinnabar underline), with Log out on the right. A page shows its title as a serif heading unless it has its own.
- Journal (`/admin/trips`, `/admin/plans` and their editors): a 14rem column on the left with + Trip and + Plan (they open the New Trip and New plan forms) and the Trips and Plans, each with a dot (filled = visible, hollow = hidden); the current one has a cinnabar left rule. On the right the title, the switches (Visible; Search flights for a plan; pressed = ink fill), then tabs: Days (an Add a Day box, then the Days) and Cover & highlights. The Day under the pointer or the focus has a cinnabar border.
- Atlas (`/admin/atlas?province=<name>` or `?city=<id>`): a 24rem column on the left with search (Provinces, Cities and Activities by name, hanzi or pinyin), the China map and the tree of the Province: its Cities with Photo and Activity counts, and the Activities of the City shown under it; then an Add a City form, the Province preset. Visited Provinces are darker on the map; a click on a Province or a City opens it. A City zooms the map to its Province and writes the City names. A Minor City is a paper-filled dot with an outline, a Major City a filled one; hovering a dot shows "City, Province" in a bordered box. On the right, tabs: a Province has Overview (Season as 12 month toggles, pressed = ink fill; the home cover with its focal point, for a Visited Province; its Cities with their Airports and 7 weekday toggles) and Activities; a City has Photos (filter by Trip, move, mark On the way, set as home cover), Activities (pictures are managed in the Gallery) and Details (name, Province, position, Major, Delete). An Activities tab (City or Province) has a search field (name, hanzi or pinyin) with "+ Add an Activity" on its right, which opens the form below; then a select-all checkbox with the count, and, once some are checked, a batch bar on the right (Set kind, Set rating or No rating, Clear). Each Activity row: a checkbox, the name and hanzi on the first line, kind and rating under it, the number of Days on the far right; a checked row has a cinnabar border. Stacked under `lg`.
- Gallery (`/admin/gallery?trip=<slug>`, `?plan=<slug>` or `?activities=<Province>`): a 14rem column on the left with the Trips and Plans and their Photo counts, then Activity pictures: one "By Province" row, or, in that view, a map and the list of the Provinces that have Activities (a click opens one). A Trip lists its Photos by date; each date is an accordion (▸/▾, open state saved in the browser per Trip, Expand all and Collapse all) whose closed row shows its Day, count and places. Inside a date, Photos are grouped by Photo time (Morning, Afternoon, Evening, then "No time" in cinnabar). A plan lists its Photos by City, "No City" last. Each Photo is a 64px-high thumbnail (portrait narrower) over a 6px band in the colour of its City (one colour per City of the view, in order, legend above; On the way grey; no City a dashed cinnabar line), the place name under the first of a run. A selected Photo has a 3px cinnabar inset outline. On the right (20rem, sticky from `xl`) the selection: a small map to pick the City (zoomed to the view's Provinces, All China toggle), Place (City or On the way, with a Province), Date and Photo time (4 joined toggles, pressed = ink fill) for a Trip, Title for one Photo, Apply to N (primary) and Delete.
  Activity pictures: the Cities of the Province as accordions (state saved in the browser per Province), each with its Activities as rows (name, kind and rating, then the pictures, the first labelled Main, then a dashed "+ Add" square that uploads). One picture is selected at a time; the panel has Make main, ← →, Move to Activity (another Activity of the Province), Open in Atlas and Delete.
- Photos: the Trip is picked with one button per Trip, "Title · camera icon · Photo count"; the current Trip has a cinnabar border and text.
- Trip and plan editor: a Photo in a Day has an X in its top right corner that takes it off the Day and back to the "On no Day" tray. Above the tray, the route map: the China map zoomed to the Provinces of the route ("All China" shows the whole map), a dashed gold-ink line through the Cities in Day order, the Cities of the Day being edited in cinnabar; a click on a City or a Province opens it in the Atlas in a new tab.

### Panda drawing

The rules for every panda pose. They come from Nico's enamel keychains, redrawn in ink and paper. The waving `Panda.astro` is older and does not follow all of them yet. Measures are in a 200 × 236 box, sitting pose.

Colors
- Panda: ink (`foreground`) and paper (`background`) only. No red, no blush, no gradients.
- Props (bamboo, shoot, hat, cup): `gold-ink` outline with a lighter fill (60% `gold-ink`, 40% `gold`), split into cells by thin paper lines, like enamel. No green.

Head
- A chubby bun, not a circle: wider than tall (≈ 136 × 104), soft top, full cheeks low and wide, flat bottom. Paper with a 4px ink outline.
- About half the height of the figure. It sits right on the body: no neck.
- Ears: two round ink circles (r ≈ 17) behind the top corners.

Face
- The mood is in the shape of the black eye patch: calm = wide, drooping at the outer end; curious = almost round; looking up = tall oval; happy = wide and flat; shy = drooping more.
- Open eyes have one small paper highlight in the patch. Happy eyes have a paper arc (^). Shy or sleepy eyes have a paper lid curve.
- Muzzle, always: a small rounded ink nose, a short stem, and a "w" mouth.

Body
- Chubby, wide sitting body with a 4px ink outline, round at the bottom: a narrow ink chest band under the head, paper belly below. The belly edge is a rounded dome, never straight.
- Legs: two short, almost round ink ovals (≈ 44 × 38) at the bottom, set apart so they do not touch the paws.
- Arms: one short, chubby ink stroke each (≈ 25 wide, round ends), both the same thickness. They start at the sides of the black chest, below the head, and never cover it.
- Arms, paws and legs are plain ink with no paper edge.

Drawing order
- Body, legs, head, props, arms. Arms go over props so the paws hold them. A raised arm goes behind the head.

Standing poses
- Same head and face. The body is taller (box 200 × 270), round at the bottom, the black chest is a narrow band under the head, and the belly line curves.
- Legs: two ink stumps under the body, longer than in the sitting poses and set well apart.
- Arms grow out of the black chest. A pose can show paws only (the backpack paws hold the straps).
- Views: front or three quarters (the face turns to one side: the features shift that way).
- Hanging on a stalk (the site's pose): body against the stalk, head tilted toward it, slanted belly line; the raised paw grips the stalk, the free arm leaves the body just under the head.

New poses
- Keep the head, body and legs. Change only the arms, the head turn or tilt, the eye mood and the prop.
- Existing poses in `src/assets/pandas/`: sitting (sit, hug, drink, shoot, hat) and standing (hang, backpack, jump, binoculars, staff). Colors are token variables with fallbacks; inline the SVG so the theme applies.

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

**Section separation:** a bamboo divider (`bamboo-t` / `bamboo-b` utilities: an ink stalk with nodes and a leaf spray at the right end) between sections and under page headers. Journey photos on the home page sit in a `bamboo-frame` (the same ink stalks on four sides, the leaf spray on the top edge). Thin 1px rules only inside lists and tab bars. No gradients except the ink-wash mist and mask fades into the paper: `map-fade` (map fades in from the left) and `mist-strip` (photo strip fades out at both ends).

**Scroll snap (Trip page):** the page snaps on every section, one step per scroll (`scroll-snap-type: y mandatory`, `scroll-snap-stop: always`): the cover, the route, each Day, then the closing sections. The footer snaps to its end so it stays reachable. Sections use `snap-start`; the page leaves room for the sticky nav (`scroll-padding-top`).

**Breakpoints:** Tailwind defaults. `md` (768px) and `lg` (1024px) are the ones in use.

**Density:** comfortable.

**Responsive:**

- Mobile first. One column under `lg`; 12-column splits from `lg`.
- Nav links collapse into a full-width menu under `md`.
- Plan page: under `lg` each plan name sits above its own full-width lane; from `lg` name and lane share one row. Month letters under `sm`.
- Sticky panels are sticky only from `lg`.
- Admin: the Gallery selection panel (20rem, from `xl`) and the editors' route map and "On no Day" tray (20rem) are sticky side panels on the right from `lg`: `top-4`, at most the viewport height minus 2rem, scrolling inside. Under `lg` they come first in the column.
- Footer: 中国游记 is one horizontal line under `md` and vertical from `md`; top padding `pt-10 md:pt-20`.
- Journey card: the Trip regions map moves after the photos under `lg`, and the photo strip becomes a full-width landscape over a row of four portraits.

## 6. Depth and motion

Flat. No elevation scale.
| Level | Treatment | Usage |
|-------|-----------|-------|
| 0 | None | Everything by default |
| Border | 1px `border` | Cards, images, panels |
| Overlay | `background/90` + `backdrop-blur` | Sticky nav after scroll, map labels |

Hover feedback is a color change, a border change or a slow image zoom (at most `scale-[1.03]`), never a shadow.

| Token | Value | Usage |
|-------|-------|-------|
| Reveal | 0.8s ease-out, 30px offset | `.reveal`, `.reveal-left/right/scale` on scroll |
| Stagger | 0.1s steps | `.reveal-delay-1…5` |
| Hero fade-up | 0.6s cubic-bezier(0.22, 1, 0.36, 1) | `.hero-animate` |
| Image zoom | 700ms | Card photo, at most `scale-[1.03]` |
| Colour | Universe hover timing (the Tailwind default transition) | Links, buttons |

## 7. Voice

**Target:** personal, first person. Nico tells what they saw, ate and paid. Concrete places, dates and prices.

**Avoid:** brand and luxury words ("monograph", "expert curation", "expedition", "modern explorer", "high-fidelity"). These are template text.

**Microcopy:** short uppercase labels; dates and durations in the `eyebrow` style ("12 days · Yunnan").

## 8. Do's and don'ts

### Do
- Use the color tokens; never raw hex in components (map CSS included).
- Use `font-serif` for all titles (except the Journeys page journey titles in `font-script`) and `font-sans` for body and UI.
- Keep corners sharp and borders 1px.
- Give photographs space: large images, wide margins.
- Use own trip photos.
- Keep red rare: one solid cinnabar element (seal or primary button) per view, plus the plum blossoms of the ink wash. No red bands.
- Write calligraphy in `font-brush`, short and vertical beside the English title; the English title stays the heading.
- Show Chinese names next to English ones, with `lang="zh"`.

### Don't
- Don't use shadows (`shadow-*`, `.hover-lift`).
- Don't use rounded pills or rounded cards (`rounded-*`), except round dots in maps and legends.
- Don't use neon colors, color gradients or startup-style illustrations. Mask fades into the paper (`map-fade`, `mist-strip`) are fine.
- Don't use stock or AI images for the temple mood: bamboo and ink wash are hand-made SVG.
- Don't put display headlines in columns narrower than 60% of the container.
- Don't add a dark mode.

## 9. Agent prompt guide

- Read colors, fonts and heading sizes only from `src/styles/global.css` tokens.
- Sharp corners and no shadows, always.
- Titles use `font-serif` + `text-h1/h2/h3` (journey titles on the Journeys page use `font-script`); labels use `eyebrow`; buttons use `btn`.
- Wrap page content in `Container.astro`; sections use `py-24 lg:py-32`.
- Write copy in Nico's first-person voice, not marketing voice.
- Icons are Lucide (`@lucide/astro`, `lucide-react` in islands); maps, bamboo, ink wash and the seal are hand-drawn SVG.

### Known gaps (code vs. this file)

Template content to replace:
- Marketing copy in the guide pages (see Voice).
- `SITE.socials` and `twitterHandle` placeholders.

To rebuild:
- Footer links to flight price pages ("Price Index", "Flight Matrix"), once those pages exist.
