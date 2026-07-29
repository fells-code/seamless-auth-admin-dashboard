---
'seamless-auth-admin-dashboard': patch
---

Surface the actionable detail from a validation error instead of the generic reason. The auth API
answers `{ error, message? }`, where `error` carries the reason and `message` optional detail, so a
rejected role assignment returns `error: "Invalid roles"` alongside
`message: "Roles not available on this instance: admin:reed"`. Only the second tells an operator
which role to fix, and the toast showed the first.

The detail now wins when both are present, with the reason used when the detail is missing or does
not look like operator-facing prose. The existing safety rules are unchanged: only validation
statuses surface upstream text, machine codes and overlong values are still suppressed, and 5xx
never surfaces.
