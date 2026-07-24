---
"seamless-auth-admin-dashboard": patch
---

Fix user updates failing for anyone without a phone number. The edit forms model
an empty phone field as `""` and sent it on every save, but the API accepts a
phone number or `null` and rejects `""`, so the whole request failed with a 400.
Editing a user who had no phone was impossible, including changes that only
touched roles. An empty or whitespace-only phone is now sent as `null`, which is
how the API clears the field. This covers both the admin Edit User dialog and the
Profile page, which share the same update hook.
