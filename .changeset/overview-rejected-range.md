---
"seamless-auth-admin-dashboard": patch
---

Overview no longer shows zeros for a custom range the API refuses. A range longer than the API's 366 day maximum is caught before it is sent, and the page says how long the range is and what the limit is. A range the API rejects anyway is reported as an error, with the range picker still in place to fix it. The fixed 24 hour copy now appears only when the API answers without range support, not while a request is pending or has failed. Queries no longer retry a 400 or 422, which fails the same way every time.
