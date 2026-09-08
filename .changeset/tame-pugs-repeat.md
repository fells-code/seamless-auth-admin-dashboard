---
"seamless-auth-admin-dashboard": patch
---

Show the credential friendly name in the user detail credential inventory.

The Credentials tab rendered only the device type, browser, platform, and
creation time, so a user with three passkeys registered from the same machine
showed three identical rows and an operator had no way to say which credential
they were asking about. The Device column now leads with the friendly name the
user set, with the device type beneath it, and falls back to the device type
alone when no name has been set.
