# DesireDots

Vinyles: how much a Wishlist Item is wanted, 1 to 5, as dots in `icon-accent`. `apps/vinyles/src/lib/components/DesireDots.svelte`.

| Prop | Type | Notes |
|---|---|---|
| value | 1 to 5 | Read-only: that many 8px dots, 4px apart |
| onPick | `(level) => void` | Owner: five dot Buttons, 20 × 44px each |
| disabled | boolean | While a save runs |

- Read-only: dots `aria-hidden`, the hidden text "Desire {value} of 5".
- Owner: a group labelled "Desire", each Button "Set desire to {n}" with `aria-pressed`. Hovering a dot previews that level (unfilled dots at 25%).
- Dots are non-text: `icon-accent` meets 3:1 on `background`. Never set text in it.
