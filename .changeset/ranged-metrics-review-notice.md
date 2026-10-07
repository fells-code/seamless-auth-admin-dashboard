---
"seamless-auth-admin-dashboard": minor
---

- Overview's headline tiles and Security's suspicious-activity feed now follow the range selector, which finishes #148 (fells-code/seamless-auth-api#132). Each tile names the window it shows. Against an API that predates ranges, the tiles keep their fixed 24-hour figures and their "fixed window" labels, so a tile never claims to follow the selector while showing something else. The Sessions tile's hint now says "Currently active sessions", which is what it always counted.
- Overview shows a warning while store review accounts are enabled. It lists the addresses, how often the fixed code was used to sign in in the last 30 days, and any wrong codes entered, and says to clear `REVIEW_ACCOUNT_EMAILS` once review is over (fells-code/seamless-auth-api#331). It shows nothing against an API or adapter without the route.

Requires `@seamless-auth/types` 0.28.0, an auth API with both changes, and a `@seamless-auth/server` that forwards the range and passes the review accounts route through (fells-code/seamless-auth-server#194).
