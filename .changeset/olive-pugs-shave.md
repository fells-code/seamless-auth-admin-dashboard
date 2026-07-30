---
"seamless-auth-admin-dashboard": minor
---

Upgrade `@seamless-auth/react` from 0.5.0 to 0.7.0 and adopt the OAuth error
codes it now surfaces.

0.6.0 dropped `RegisterInput.bootstrapToken` along with the admin bootstrap
invite flow, which the dashboard never set. 0.7.0 realigned the SDK's types with
`@seamless-auth/types`, which the dashboard already depends on directly, so the
two now agree on `Credential`, `User`, and `Organization` rather than each
carrying a copy.

The OAuth callback screen previously reported every failure as "We could not
complete sign-in", including the three the operator can actually act on. It now
reads the API's machine-readable code with `getOAuthErrorCode()` and names the
cause: no email address returned, an email the provider has not verified, or a
missing account identifier. An unrecognized code keeps the generic message.
