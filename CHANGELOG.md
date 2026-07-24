# seamless-auth-admin-dashboard

## 0.3.0

### Minor Changes

- c84a18d: Add OAuth sign-in to the admin login screen and move onto the published
  `@seamless-auth/react` 0.5.0 SDK. Administrators who are not signed in can now
  continue with any configured OAuth provider alongside the existing passkey,
  magic-link, and OTP options, with a dedicated `/oauth/callback` route that
  completes the authorization-code flow and lands on the originally requested
  page. Access stays gated on the admin role, so a non-admin identity is still
  turned away. The SDK upgrade migrates every auth call from the old
  `Response`/`.ok` shape to the `{ data, error }` result returned by 0.5.0.
- 9bad7b5: Manage OAuth providers through the dedicated per-provider API routes instead of
  the whole-config patch. Adding, editing, enabling, disabling, and removing a
  provider now each call `POST`/`PATCH`/`DELETE /system-config/oauth-providers`
  via a new `useOAuthProviders` hook and apply immediately (behind the step-up
  guard), rather than staging changes into the shared config draft and replacing
  the entire `oauth_providers` array on Save. This removes the last-write-wins
  clobber when two admins edit providers at once, and removals now ask for
  confirmation. Client secrets stay out of the UI: only the `clientSecretEnv`
  variable name is entered, never a raw secret.
- f726eac: Replace the browser's native confirmation popups with a styled, accessible
  in-app dialog. Destructive actions (deleting a user, revoking sessions, removing
  an available role or an organization member, and preparing a device
  replacement) now open a themed confirmation that matches the rest of the console
  and traps focus, closes on Escape, and returns focus to the trigger. A new
  useConfirm hook exposes this as a promise, so callers await the operator's
  choice instead of calling window.confirm.

### Patch Changes

- 39bb044: Fix user updates failing for anyone without a phone number. The edit forms model
  an empty phone field as `""` and sent it on every save, but the API accepts a
  phone number or `null` and rejects `""`, so the whole request failed with a 400.
  Editing a user who had no phone was impossible, including changes that only
  touched roles. An empty or whitespace-only phone is now sent as `null`, which is
  how the API clears the field. This covers both the admin Edit User dialog and the
  Profile page, which share the same update hook.
- 8deda5a: Fix system configuration saves failing with an "invalid payload" error. The page
  now sends only the fields you changed, instead of echoing the full configuration
  back to the API. The full object included read-only keys (such as frontend_url)
  that the strict update endpoint rejects, which caused every save to fail after
  step-up verification.

## 0.2.0

### Minor Changes

- 02a6bba: Add a same-origin build variant so an auth instance can serve the dashboard at
  `/console` on its own domain. A new `build:console` script sets
  `VITE_BASE_PATH=/console/` and `VITE_SAME_ORIGIN=true`, deriving the auth API base
  from the page origin and serving assets and routes under `/console`. The existing
  root build is unchanged and still uses runtime config injection or the baked
  `VITE_API_URL`.

## 0.1.1

### Patch Changes

- 957b9af: fixes an issue with table data not being aligned or running off or hidden

## Earlier releases

- Baseline before Changesets-managed releases. Tagged releases from this period
  are listed under the repository's Releases page.
