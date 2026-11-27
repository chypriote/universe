# ErrorMessage

A form or action error, the same in every app. `packages/showcase/src/components/ErrorMessage.svelte`.

| Prop | Type | Notes |
|---|---|---|
| message | string | Without the "!": the component adds it |
| class | string | Placement only (a grid span, `order-last basis-full`) |

- 14px / 700 in `destructive`, `role="alert"`, so a screen reader reads it when it appears.
- The words say how to fix it: "! Type the price in euros, like 12,50", "! Wrong password".
- Field shows its own error the same way, linked with `aria-describedby`.
