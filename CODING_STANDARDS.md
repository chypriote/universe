# Coding standards

The reviewer reads this file. The implementer does not need it.

## Showcase change

A PR that changes a Showcase token, theme slot or component passes these before merge:

1. Components use semantic or component tokens only. A new value becomes a token first. `npm run check:tokens -w packages/showcase` catches raw colours and arbitrary type, shadow and radius values; the reviewer checks raw px.
2. Light and dark both checked.
3. The contrast table in `packages/showcase/TOKENS.md` passes for every theme.
4. TOKENS.md, COMPONENTS.md and each changed app's docs say the same as the code.
5. The design-system page files are changed in the same PR, and the page is republished.
