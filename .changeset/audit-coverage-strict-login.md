---
"seamless-auth-admin-dashboard": minor
---

Surface the auth API's assessment and audit features.

- A new Coverage page at `/coverage` shows the authentication coverage report (fells-code/seamless-auth-api#178). It covers users holding a phishing-resistant credential overall and by organization, a trend by month or week, the authenticator mix, the sign-in mix, and the login policy the deployment enforces. "Download CSV" saves the API's own CSV for pasting into an assessment.
- The Security page gains an Audit Trail panel. "Verify integrity" runs the hash chain check on demand (fells-code/seamless-auth-api#174) and shows the chain head to record elsewhere, or where the trail breaks. "Export events" downloads a period as NDJSON after a fresh step-up (fells-code/seamless-auth-api#173).
- The System page gains a "Phishing-resistant only" setting (fells-code/seamless-auth-api#177). Turning it on asks for confirmation, because users without a passkey can no longer sign in. While it is on, the login method list and passkey fallback are shown as overridden. The save confirmation is now titled "Confirm sign-in changes".

Requires `@seamless-auth/types` 0.27.0, an auth API that serves these routes, and a `@seamless-auth/server` adapter that passes them through, including its raw mode for the downloads (fells-code/seamless-auth-server#191).
