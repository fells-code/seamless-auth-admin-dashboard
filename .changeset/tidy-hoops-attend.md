---
"seamless-auth-admin-dashboard": patch
---

Give the detail tab strip real tab semantics.

`Tabs` rendered plain buttons, so assistive technology had no notion that the
group was a tab strip, which one was selected, or which region each controlled.
A screen reader user reached five unrelated buttons, and the arrow keys that the
ARIA tabs pattern expects did nothing.

The strip is now a `tablist` of `tab` elements carrying `aria-selected` and
`aria-controls`. Focus follows the standard roving tabindex, so the strip is a
single tab stop and Left, Right, Home, and End move between tabs with wrap
around at both ends. On the user detail screen, the panel below the strip is a
`tabpanel` labelled by the active tab.

Tab and panel ids come from a shared helper in `src/lib/tabIds.ts` so the two
sides cannot drift apart.
