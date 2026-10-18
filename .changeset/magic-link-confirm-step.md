---
"seamless-auth-admin-dashboard": minor
---

The console's magic link page handles the auth server's confirmation step (seamless-auth-api 0.19.0). When an admin opens a sign-in link on a different device from the one that requested it, the page shows which kind of device asked and when, and offers "Yes, sign in that device" or "No, this wasn't me", instead of a verification error. Approving signs the requesting device in and tells the admin to return to it. The console moves to `@seamless-auth/react` 0.17, which provides `confirmMagicLink`.
