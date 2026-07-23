---
"seamless-auth-admin-dashboard": patch
---

Fix system configuration saves failing with an "invalid payload" error. The page
now sends only the fields you changed, instead of echoing the full configuration
back to the API. The full object included read-only keys (such as frontend_url)
that the strict update endpoint rejects, which caused every save to fail after
step-up verification.
