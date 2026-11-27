# ConfirmDialog

Asks before a delete. Showcase `ConfirmDialog.svelte` over `ui/alert-dialog`, over the Popup.

| Prop | Type | Notes |
|---|---|---|
| open | boolean | Bindable |
| title | string | Names the thing: "Delete Blue Train?" |
| text | string | What goes: "This deletes the jersey from the collection. Its Kit stays." |
| actionLabel | string | "Delete" |
| onConfirm | `() => void` | The action closes the dialog, then runs this |
| actionDisabled | boolean | |
| children | snippet | Between the text and the buttons |

"Cancel" and Esc change nothing. A refused delete shows its error under the buttons in `destructive`.
