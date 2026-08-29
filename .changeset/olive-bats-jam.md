---
"seamless-auth-admin-dashboard": minor
---

Show who performed an administrative action in the events table.

The API now records the acting administrator separately from the subject of an
action. An administrative event names two people, and showing only the subject
reads as though they did it to themselves, so the User column now shows the
target with the administrator beneath it, each linking to their own detail page.

Administrative events are also labelled as such rather than as ordinary
user-linked events.

Also upgrades `@seamless-auth/types` to 0.10.0.
