---
"seamless-auth-admin-dashboard": patch
---

The Sign-in Policy dry run shows its account limit notice from the API's `capped` flag. Against an older API that does not send `capped`, the page still infers the limit from the account counts. Requires `@seamless-auth/types` 0.33.0 or later.
