---
"seamless-auth-admin-dashboard": minor
---

Add a Webhooks page. Create, edit, turn off and on, and delete endpoints for the v0.23 webhook event types, with the reason the API turned one off. Rotate a signing secret, shown once, with the old one signing beside it for 24 hours. Send a test event and see the status code or failure reason. The delivery log shows status, attempts, last status code and failure and the event body, with a dead letter view, cursor paging and redeliver. Every write asks for step-up first, and an API older than v0.23 gets an upgrade message.
