---
"seamless-auth-admin-dashboard": minor
---

Add a Passkey enrollment view at `/enrollment` (fells-code/seamless-auth-api#338). It shows how many users have no passkey, one authenticator, or two or more, with coverage across the deployment, and lists users filtered by organization, enrollment status, imported users, and email. Admins with write access can invite selected users, or every member of an organization who has not enrolled, to sign in and add a passkey. The System page gains a "Prompt for passkey enrollment" setting. Requires a Seamless Auth API that serves `GET /admin/enrollment` and `POST /admin/enrollment/invites`.
