# Field

A labelled native input for Owner forms. Showcase `Field.svelte` over `ui/input`; SearchField and Select share its box.

| Prop | Type | Notes |
|---|---|---|
| label | string | Above, 14px / 500 |
| value | string | Bindable |
| type | `text`, `password`, `number`, `date` | `date` is a text input taking `YYYY` or `YYYY-MM-DD` (native date inputs cannot hold a year only), with a round calendar button |
| required, placeholder | | |
| list | string | id of a `<datalist>` with suggestions |
| error | string or null | "! {error}" under the field in `destructive`, 14px / 700, linked by `aria-describedby` |

44px, `radius-full`, 2px `field-border` on `field`, `shadow-raised`. Focus: 3px `ring`. Invalid: 3px `destructive` outline. In a form Popup, fields sit in two columns from 640px.

Errors say how to fix the field: "! Type the price in euros, like 12,50".
