---
"seamless-auth-admin-dashboard": patch
---

Show the credential friendly name on the user detail and profile screens.

Both credential tables rendered only the device type, so a user with several
passkeys registered from the same machine showed identical rows and neither an
operator investigating an account nor the account holder could tell which
credential was which. The Device column on both screens now leads with the
friendly name the user set, with the device type beneath it, and falls back to
the device type alone when no name has been set.

The presentation lives in a shared `CredentialDevice` component rather than
being written once per screen, since the two tables had already drifted apart
in which columns they carry.
