# Button

A pill with the raised shadow and no border, for every action in every app. Showcase `Button.svelte` over `ui/button`.

## Intents

| Intent | Fill and text | Use for |
|---|---|---|
| default | `primary`, `primary-foreground` | An open sticky-bar toggle |
| `success` | `success`, `on-chip` | The one positive action: Got it, Save, Log in, every submit |
| `neutral` | `card`, `foreground` | Everything else: Cancel, Drop, Edit, sort, theme. Inside a Popup it takes `background` so it does not vanish on the card |
| `danger` | `destructive`, `destructive-foreground` | Delete, and the confirm action of a deletion |

## Sizes

- `default`: 44px tall, 20px sides. `sm`: 32px, for dense Owner rows only.
- `icon`: a 44px round pill, icon 20px. `icon-sm`: a 28px pill with an invisible 8px halo (44px tap area), icon 16px, for packed bars like the Vinyles StickyBar.
- An icon Button always has a visually hidden label.

## What the consumer supplies

`intent`, `size`, `type` (`button` or `submit`), `disabled`, `loading`, `onclick`, `class` and the label. `ui/button` also takes `href` and renders a link.

## States

Hover: an 8% `currentColor` layer. Pressed: drops the shadow and moves down 3px in `duration-fast`. Focus: 3px `ring`. Disabled: 50% opacity, no shadow. Loading keeps the width and sets `aria-busy`. An icon Button may carry a 10px `icon-accent` dot when a search or filter is set behind a closed toggle.
