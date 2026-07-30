---
"seamless-auth-admin-dashboard": minor
---

Warn before leaving the system configuration screen with unsaved changes.

The screen stages every edit into a single draft behind one Save action, so
navigating away, using the browser back button, or refreshing silently
discarded all of them. The sticky bar reported unsaved changes but did nothing
to protect them.

Leaving now prompts first. Reloads and tab closes are covered by a
`beforeunload` handler, and in-app navigation and the back button by the
router's blocker, since neither mechanism sees the other's cases.

The router moves from `BrowserRouter` to `createBrowserRouter`, because the
blocker is only available on a data router. The route table, the basename, and
every guard are unchanged; providers that need to sit inside the router moved
into a root route element.
