---
"seamless-auth-admin-dashboard": patch
---

Remove the dead Bootstrap event category and the misspelled `notication_sent`
match, and type the category rules against `AuthEventType`.

The API dropped the `bootstrap_admin_` events, so the Bootstrap quick filter
could never match anything. An operator could still select it and get an empty
result with no explanation. `notication_sent` was a typo sitting next to
`notification_sent`, matching nothing.

The `exact` matcher now takes `AuthEventType` values rather than plain strings,
so retiring an event upstream fails the build here. Two tests cover the other
direction: no category may be unreachable by every known event type, and no
known event type may fall through to Other.
