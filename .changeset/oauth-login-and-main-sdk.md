---
"seamless-auth-admin-dashboard": minor
---

Add OAuth sign-in to the admin login screen and move onto the published
`@seamless-auth/react` 0.5.0 SDK. Administrators who are not signed in can now
continue with any configured OAuth provider alongside the existing passkey,
magic-link, and OTP options, with a dedicated `/oauth/callback` route that
completes the authorization-code flow and lands on the originally requested
page. Access stays gated on the admin role, so a non-admin identity is still
turned away. The SDK upgrade migrates every auth call from the old
`Response`/`.ok` shape to the `{ data, error }` result returned by 0.5.0.
