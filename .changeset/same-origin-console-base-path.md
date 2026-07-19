---
"seamless-auth-admin-dashboard": minor
---

Add a same-origin build variant so an auth instance can serve the dashboard at
`/console` on its own domain. A new `build:console` script sets
`VITE_BASE_PATH=/console/` and `VITE_SAME_ORIGIN=true`, deriving the auth API base
from the page origin and serving assets and routes under `/console`. The existing
root build is unchanged and still uses runtime config injection or the baked
`VITE_API_URL`.
