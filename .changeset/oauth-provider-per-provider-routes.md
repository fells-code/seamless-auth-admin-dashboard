---
"seamless-auth-admin-dashboard": minor
---

Manage OAuth providers through the dedicated per-provider API routes instead of
the whole-config patch. Adding, editing, enabling, disabling, and removing a
provider now each call `POST`/`PATCH`/`DELETE /system-config/oauth-providers`
via a new `useOAuthProviders` hook and apply immediately (behind the step-up
guard), rather than staging changes into the shared config draft and replacing
the entire `oauth_providers` array on Save. This removes the last-write-wins
clobber when two admins edit providers at once, and removals now ask for
confirmation. Client secrets stay out of the UI: only the `clientSecretEnv`
variable name is entered, never a raw secret.
