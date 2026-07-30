---
"seamless-auth-admin-dashboard": minor
---

Let the events screen combine event types, and stop it reporting figures it
does not have yet.

Selecting an event type now adds to the selection rather than replacing it, so
sign-in and security events can be viewed together. The query layer and the URL
format already accepted several types; only the interface prevented it. "All"
stays exclusive, and each toggle exposes its pressed state.

The active filter count treats any non-default time range as one filter.
Choosing a relative range such as the last 7 days previously reported zero
active filters while a custom range counted as two.

A custom range with the start after the end is reported inline instead of
producing an empty table with only the generic no-results message, and the
range inputs now say which timezone they are interpreted in.

The summary tiles and headline figures are held behind the same loading state
as the table. They previously rendered zeros and placeholders before the
request resolved, so the screen briefly reported no matched events and no
suspicious signals, which on a security surface reads as an all-clear.
