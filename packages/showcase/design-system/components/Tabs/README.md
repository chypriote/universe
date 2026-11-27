# Tabs

Links between an app's lists (Collection, Wishlist), not an ARIA tab widget. Showcase `Tabs.svelte`.

| Prop | Type | Notes |
|---|---|---|
| current | string | Key of the current list: `aria-current="page"` and the `primary` fill |
| links | `{ key, href, label }[]` | `href` already resolved by the app (`resolve('/wishlist')`) |
| variant | `pills`, `segmented` | Jerseys: one raised pill per tab. Vinyles: the tabs share one raised `card` track |

The label uses the theme's display face (`--display-family`, `--display-transform`), 14px / 700, `--tracking-label`: uppercase Barlow Condensed for Jerseys, Nunito for Vinyles.
