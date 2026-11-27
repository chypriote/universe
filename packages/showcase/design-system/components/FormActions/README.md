# FormActions

The footer row of every form, in every app. `packages/showcase/src/components/FormActions.svelte`.

| Prop | Type | Notes |
|---|---|---|
| busy | boolean | Save shows its spinner |
| disabled | boolean | Save is disabled |
| onCancel | `() => void` | Shows a neutral "Cancel" before Save |
| start | snippet | Left of the row: Delete (`danger`), other actions on the thing ("Change cover") |

- Right: "Cancel" then the `success` Button "Save", both at their natural width. Save is the form's submit.
- The row wraps on a narrow screen. A refused delete shows its ErrorMessage on its own line under the row.
- Add forms have no `start`; admin forms often have no Cancel (the Popup's X closes them).
