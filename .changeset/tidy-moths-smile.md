---
"seamless-auth-admin-dashboard": patch
---

Page the Sessions screen through the server instead of showing a capped first
page as the whole deployment.

`GET /admin/sessions` applies a limit of 50 when none is sent, and the screen
called it bare, so every figure and row described at most the first 50 sessions
and the rest were unreachable. `useSessions` now takes a window, the table pages
through `total`, and the header reports the deployment total.

The endpoint accepts no search or filter parameter, so the search box and the
activity filter narrow the loaded page. Both are now labelled as page-scoped,
along with every count derived from them, and a search that matches nothing on
the page says so rather than reading as an address that does not exist. The CSV
export covers the loaded page and names the rows it wrote.
