---
"seamless-auth-admin-dashboard": minor
---

Add an Authenticator Policy section to System Configuration.

`authenticator_policy` had no control on the page, and a change upstream made
that gap operationally significant: `syncedPasskeys` now defaults to `block`,
which refuses any backup-eligible credential at registration. On a default
deployment that is most consumer passkeys, including iCloud Keychain and Google
Password Manager. Allowing them meant a raw PATCH or an env change and a
restart, neither discoverable from the console.

All seven fields are now editable, and two behaviours that were previously
documented only upstream are stated in the UI: the allow list, the deny list,
and the known-authenticator requirement are inert unless attestation is
`direct`, and changing attestation needs an API restart. Blocking synced
passkeys and changing attestation both confirm before saving, alongside the
existing relying-party and origin warnings.
