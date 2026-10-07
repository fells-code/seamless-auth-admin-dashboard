---
"seamless-auth-admin-dashboard": patch
---

Support Node 22 and newer. The `engines` field now requires `>=22` instead of `>=24 <25`, and CI runs the unit test job on Node 22, 24, and the latest release (fells-code/seamless-auth-api#339).
