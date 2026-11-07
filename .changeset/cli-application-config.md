---
"seamless-auth-admin-dashboard": minor
---

Name the application the Seamless CLI signs in with (`oidc_cli_client_id`) under OpenID Provider on the System page. The API advertises it while the provider is on, so the CLI can offer provider sign-in, and it refuses an application without session exchange turned on. An API older than v0.23 gets a note instead of the field.
