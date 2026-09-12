---
"seamless-auth-admin-dashboard": patch
---

Stop telling operators that blocking synced passkeys is the shipped default.

The Authenticator Policy section said so in the banner shown when the policy is
`block`, labelled that option as the default, and fell back to `block` for a
deployment that had not yet persisted the policy. All three were written against
`@seamless-auth/types` 0.18.0, which did default to `block`. The API reversed that
in 0.19.0 and seeds `syncedPasskeys: "allow"`, so a stock install accepts iCloud
Keychain and Google Password Manager credentials, and an operator who wanted them
refused could read the page as saying the work was already done.

The banner no longer claims a default, `Allow` is labelled as the default, and the
fallback policy matches the API seed. The `@seamless-auth/types` floor is raised to
0.20.0 so the schema default and the API agree, which removes the underlying cause.
The v0.6.0 entry below that describes the default as `block` was accurate for 0.18.0
and is superseded by this note.
