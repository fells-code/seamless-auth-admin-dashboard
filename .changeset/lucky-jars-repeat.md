---
"seamless-auth-admin-dashboard": minor
---

Handle render errors, expired sessions, and unknown URLs at the app level.

A render error anywhere in a routed screen used to unmount the whole
application, leaving an empty page with no message and no way back other than a
manual reload. The routed area is now wrapped in an error boundary that renders
a recoverable state, and the boundary clears itself on navigation so a broken
screen does not pin the console.

A 401 is now handled once rather than by every panel independently. `apiFetch`
throws an `ApiError` carrying the status and publishes an expiry signal that a
single handler acts on: it reconciles the SDK session, clears cached queries,
records where the operator was, and returns them to sign-in. Repeat 401s from
concurrent requests collapse into one redirect, and expired queries are no
longer retried.

An unrecognised URL renders a not-found screen naming the address that was
requested, instead of silently replacing history with a redirect to the
dashboard.
