---
"seamless-auth-admin-dashboard": minor
---

Make the app shell keyboard and screen-reader operable.

The account menu now advertises that it opens a menu and whether it is open,
uses menu semantics, closes on Escape, moves focus into the popup on open, and
returns it to the trigger on close. It previously closed only on an outside
pointer press.

The mobile navigation drawer keeps Tab within its bounds, matching the
behaviour the shared dialog already had. Both now share one focus-trap helper
rather than two copies. The persistent navigation rail appears from the `lg`
breakpoint (1024px) rather than `xl` (1280px), so common laptop and landscape
tablet widths keep it.

There is a skip-to-content link targeting the main region, and non-essential
motion is disabled when the system reports a reduced-motion preference.

The document title reflects the current screen, so tabs, history entries, and
bookmarks are distinguishable and screen readers announce the change. The
developer theme reports a dark colour scheme in both modes, matching the
palette it actually renders, so native form controls and scrollbars no longer
appear light against its dark surfaces.
