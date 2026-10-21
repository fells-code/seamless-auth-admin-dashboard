---
"seamless-auth-admin-dashboard": patch
---

OAuth sign-in to the dashboard sends the state binding that `seamless-auth-api` 0.19.2 requires on `/oauth/:providerId/callback`. The binding returned by `/oauth/:providerId/start` is kept in `sessionStorage` with its state and sent with the matching callback. Without it, signing in with an OAuth provider against API 0.19.2 failed with "We could not complete sign-in". Also moves to `@seamless-auth/react` 0.18.1 and `@seamless-auth/types` 0.29.0.
