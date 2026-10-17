---
"seamless-auth-admin-dashboard": patch
---

The same-origin console build (`build:console`) no longer requests `/config.js`. Only the standalone build, whose container writes that file, loads it. Served under `/console` by the auth API or an adapter, the console made a request that 404'd on every load, and a host app that served its own `/config.js` would have had it run inside the console.
