# seamless-auth-admin-dashboard

## 0.6.0

### Minor Changes

- 37e229a: Remove organizations, and page and search the list on the server.

  The Organizations screen fetched the whole list with no window and filtered the
  returned rows in memory, so a deployment with more organizations than the
  endpoint returned had no way to reach the rest, and the search box could not
  find an organization that had not already been loaded. There was also no way to
  delete an organization, only to rename it.

  The list now sends `limit`, `offset` and `search` to the API and pages through
  the result with the table's own pager. `total` comes from the server and counts
  every match rather than the rows on screen, so the range in the footer describes
  the whole result set. Typing in the search box is debounced and returns to the
  first page, since a new term describes a different set of matches and the old
  page number would strand the caller on an empty screen.

  A Remove action sits alongside Manage for admins who can write. It asks for
  confirmation naming how many memberships go with the organization, and that the
  member accounts themselves are not deleted, then requires step-up verification
  like the other destructive actions on the dashboard. Deleting the last row on a
  page steps back to the previous one rather than leaving the view past the end of
  the results.

  Requires an auth API that serves `DELETE /admin/organizations/:organizationId`
  and accepts the list query parameters, and an adapter that passes the delete
  through.

- 082c81a: Add a time range to the Overview and Security screens.

  Only the events feed offered a date range, so an operator investigating outside
  the default window could not narrow or shift the period on the screens that
  lead the investigation. Overview's activity chart and event distribution, and
  Security's login statistics, now follow a range control, and the selection is
  carried in the URL so a narrowed view is linkable and survives a reload.

  The range model is shared with the events feed rather than reimplemented: the
  control is extracted from `EventFilters` and both use it. The activity chart
  switches to daily buckets for windows wider than two days, so a week is not 168
  hourly points.

  Two endpoints, `/internal/metrics/dashboard` and `/internal/security/anomalies`,
  take no date range, so the figures they feed are labelled as fixed-window rather
  than appearing to respond to the picker.

- 3d467e7: Add an Authenticator Policy section to System Configuration.

  `authenticator_policy` had no control on the page, and a change upstream made
  that gap operationally significant: `syncedPasskeys` now defaults to `block`,
  which refuses any backup-eligible credential at registration. On a default
  deployment that is most consumer passkeys, including iCloud Keychain and Google
  Password Manager. Allowing them meant a raw PATCH or an env change and a
  restart, neither discoverable from the console.

  All seven fields are now editable, and two behaviours that were previously
  documented only upstream are stated in the UI: the allow list, the deny list,
  and the known-authenticator requirement are inert unless attestation is
  `direct`, and changing attestation needs an API restart. Blocking synced
  passkeys and changing attestation both confirm before saving, alongside the
  existing relying-party and origin warnings.

### Patch Changes

- 7459428: Show the credential friendly name on the user detail and profile screens.

  Both credential tables rendered only the device type, so a user with several
  passkeys registered from the same machine showed identical rows and neither an
  operator investigating an account nor the account holder could tell which
  credential was which. The Device column on both screens now leads with the
  friendly name the user set, with the device type beneath it, and falls back to
  the device type alone when no name has been set.

  The presentation lives in a shared `CredentialDevice` component rather than
  being written once per screen, since the two tables had already drifted apart
  in which columns they carry.

- 5a322b6: Give the detail tab strip real tab semantics.

  `Tabs` rendered plain buttons, so assistive technology had no notion that the
  group was a tab strip, which one was selected, or which region each controlled.
  A screen reader user reached five unrelated buttons, and the arrow keys that the
  ARIA tabs pattern expects did nothing.

  The strip is now a `tablist` of `tab` elements carrying `aria-selected` and
  `aria-controls`. Focus follows the standard roving tabindex, so the strip is a
  single tab stop and Left, Right, Home, and End move between tabs with wrap
  around at both ends. On the user detail screen, the panel below the strip is a
  `tabpanel` labelled by the active tab.

  Tab and panel ids come from a shared helper in `src/lib/tabIds.ts` so the two
  sides cannot drift apart.

- b705858: Page the Sessions screen through the server instead of showing a capped first
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

- 32355dc: Add a Playwright end-to-end harness.

  The unit suite covers components, hooks, and helpers in isolation. It does not
  exercise the built app in a real browser across routing, guarded navigation,
  network calls to `/auth/*`, WebAuthn, and multi-step operator workflows. This
  adds the layer that does.

  Runs are deterministic and need no live API: the built SPA is served by
  `vite preview`, every `/auth/*` call is intercepted, and the app is pointed at
  the mock through the same runtime `config.js` injection the container uses. A
  call with no mock registered answers 501 and fails the test, so a newly added
  request cannot pass as an empty screen. Personas cover unauthenticated,
  read-only admin, and write admin, and a CDP virtual authenticator makes passkey
  sign-in and step-up run headless.

## 0.5.0

### Minor Changes

- c80f182: Show who performed an administrative action in the events table.

  The API now records the acting administrator separately from the subject of an
  action. An administrative event names two people, and showing only the subject
  reads as though they did it to themselves, so the User column now shows the
  target with the administrator beneath it, each linking to their own detail page.

  Administrative events are also labelled as such rather than as ordinary
  user-linked events.

  Also upgrades `@seamless-auth/types` to 0.10.0.

- eb6526a: Collect identity proofing before preparing a device replacement.

  The API now refuses this recovery unless it records how the operator established
  who they were talking to, so the button opens a form rather than a plain
  confirmation. It asks how identity was confirmed, for a reference to the
  evidence, and for an approver when the operator takes the remote exception
  rather than proofing in person.

  Also upgrades `@seamless-auth/types` from 0.4.0 to 0.9.0.

## 0.4.0

### Minor Changes

- 951e402: Add safeguards and inline validation to the system configuration screen.

  OAuth providers gain an explicit Edit action that loads the stored record into
  the form and sends only the fields that actually changed. Previously the only
  way to change a provider was to retype its ID into the add form, which
  submitted the whole template and blanked out the URLs and reset the JSON paths
  and just-in-time signup. Just-in-time signup is now a form control rather than
  a hidden template default, so turning it off sticks.

  Provider submissions are validated before they leave the browser: the
  authorization, token, and user-info URLs are required and must be absolute
  URLs, the provider ID must be kebab-case, and errors render against the field
  that caused them. The provider list shows an explicit Enabled or Disabled
  badge, and its redirect summary counts the single redirect URI as well as the
  allowlist instead of describing a provider configured with only the former as
  falling back to the origin.

  Numeric fields no longer coerce a cleared field to 0, which previously allowed
  a rate limit or lockout threshold of 0. Changing the relying-party ID or the
  allowed origins now warns about the consequences before saving, and the last
  allowed origin cannot be removed. Discarding a dirty draft asks first. For a
  read-only administrator every input is disabled rather than silently ignoring
  what is typed into it, and role toggles expose their pressed state to
  assistive technology.

- a505250: Correct the monitoring screens' figures and let operators refresh and export
  them.

  The Overview failure rate shows a neutral no-data state when there were no
  authentication attempts in the window, instead of deriving 100% from an absent
  success rate and pairing it with "Elevated enough to merit review" on the
  landing screen.

  Expired sessions are excluded from the active session count and reported
  separately. Microsoft Edge sessions are labelled Edge: Edge and most
  Chromium-based user agents also contain "Chrome", which was matched first.

  The Security screen derives its headline count and its supporting figures from
  the same rows, and discloses when the feed returned fewer records than it
  reported, rather than letting the two halves of the screen disagree silently. A
  flagged signal's user identifier links through to that account, matching the
  events table.

  Overview, Sessions, and Security have a manual refresh control, revalidate on
  an interval and on window focus, and their relative times advance while the
  screen stays open. The session and suspicious-activity tables can be exported
  as CSV.

- 2934047: Give step-up a route through for admins with no passkey.

  An account with no passkey cannot satisfy a WebAuthn ceremony: the API answers
  the start call with an empty credential list, so the browser prompt has nothing
  to assert and the action failed with a generic "Step-up verification failed"
  and no way forward. This is routine with OAuth, where an admin may never have
  enrolled a passkey.

  The guard now checks for a usable factor before launching a ceremony that
  cannot succeed, offers a TOTP code prompt where an authenticator is enrolled,
  and names the requirement and the remedy when the account has neither. Using
  the WebAuthn detail the SDK now surfaces, a dismissed prompt is reported as a
  cancellation rather than a failure, and an origin or relying-party mismatch
  says so instead of being indistinguishable from everything else.

- 5967dbc: Handle render errors, expired sessions, and unknown URLs at the app level.

  A render error anywhere in a routed screen used to unmount the whole
  application, leaving an empty page with no message and no way back other than a
  manual reload. The routed area is now wrapped in an error boundary that renders
  a recoverable state, and the boundary clears itself on navigation so a broken
  screen does not pin the console.

  A 401 is now handled once rather than by every panel independently. `apiFetch`
  throws an `ApiError` carrying the status and publishes an expiry signal that a
  single handler acts on: it reconciles the SDK session, clears cached queries,
  records where the operator was, and returns them to sign-in. Repeat 401s from
  concurrent requests collapse into one redirect, and expired queries are no
  longer retried.

  An unrecognised URL renders a not-found screen naming the address that was
  requested, instead of silently replacing history with a redirect to the
  dashboard.

- d8411be: Warn before leaving the system configuration screen with unsaved changes.

  The screen stages every edit into a single draft behind one Save action, so
  navigating away, using the browser back button, or refreshing silently
  discarded all of them. The sticky bar reported unsaved changes but did nothing
  to protect them.

  Leaving now prompts first. Reloads and tab closes are covered by a
  `beforeunload` handler, and in-app navigation and the back button by the
  router's blocker, since neither mechanism sees the other's cases.

  The router moves from `BrowserRouter` to `createBrowserRouter`, because the
  blocker is only available on a data router. The route table, the basename, and
  every guard are unchanged; providers that need to sit inside the router moved
  into a root route element.

- 4221ad0: Let the events screen combine event types, and stop it reporting figures it
  does not have yet.

  Selecting an event type now adds to the selection rather than replacing it, so
  sign-in and security events can be viewed together. The query layer and the URL
  format already accepted several types; only the interface prevented it. "All"
  stays exclusive, and each toggle exposes its pressed state.

  The active filter count treats any non-default time range as one filter.
  Choosing a relative range such as the last 7 days previously reported zero
  active filters while a custom range counted as two.

  A custom range with the start after the end is reported inline instead of
  producing an empty table with only the generic no-results message, and the
  range inputs now say which timezone they are interpreted in.

  The summary tiles and headline figures are held behind the same loading state
  as the table. They previously rendered zeros and placeholders before the
  request resolved, so the screen briefly reported no matched events and no
  suspicious signals, which on a security surface reads as an all-clear.

- f9cac31: Upgrade `@seamless-auth/react` from 0.5.0 to 0.7.0 and adopt the OAuth error
  codes it now surfaces.

  0.6.0 dropped `RegisterInput.bootstrapToken` along with the admin bootstrap
  invite flow, which the dashboard never set. 0.7.0 realigned the SDK's types with
  `@seamless-auth/types`, which the dashboard already depends on directly, so the
  two now agree on `Credential`, `User`, and `Organization` rather than each
  carrying a copy.

  The OAuth callback screen previously reported every failure as "We could not
  complete sign-in", including the three the operator can actually act on. It now
  reads the API's machine-readable code with `getOAuthErrorCode()` and names the
  cause: no email address returned, an email the provider has not verified, or a
  missing account identifier. An unrecognized code keeps the generic message.

- ac3002d: Require a name when editing an organization, and make memberships editable.

  The organization edit form submitted the name without checking it was
  non-empty, so clearing the field and saving wrote an empty name and left the
  organization unidentifiable in every list. The create form already guarded
  this; the edit form now matches and reports the problem inline.

  Member roles are chosen from the roles the instance defines rather than typed
  as free-form comma-separated text, which silently accepted typos. An existing
  membership can now be edited in place, so changing someone's role no longer
  means removing and re-adding them and discarding their membership history. The
  organization list has a search field.

- 759ce32: Fix the sign-in and auth recovery paths so failures explain themselves and lead
  somewhere.

  Completing sign-in no longer announces an admin session before the admin
  requirement has been checked, which previously produced a success message
  immediately followed by the no-access screen contradicting it. The account is
  routed to the no-access screen with a message that matches.

  Fallback sign-in methods are no longer re-derived from local email and phone
  patterns. An identifier the server accepted but the pattern rejected had every
  method filtered out, and the screen then reported that none were returned,
  which was untrue.

  Magic-link resend and change-identifier controls disable while a request is in
  flight, so the resend cannot be pressed repeatedly into a run of duplicate
  emails. A failed magic-link verification now offers a way back to sign-in
  instead of being a dead end. A failed OAuth redirect start reports why instead
  of silently reverting the button. An account without admin access can sign out
  and switch accounts from the no-access screen, which previously required
  clearing cookies. Sign-in, OAuth, and magic-link errors are marked as alerts so
  screen readers announce them.

- 4b3a88f: Make the app shell keyboard and screen-reader operable.

  The account menu now advertises that it opens a menu and whether it is open,
  uses menu semantics, closes on Escape, moves focus into the popup on open, and
  returns it to the trigger on close. It previously closed only on an outside
  pointer press.

  The mobile navigation drawer keeps Tab within its bounds, matching the
  behaviour the shared dialog already had. Both now share one focus-trap helper
  rather than two copies. The persistent navigation rail appears from the `lg`
  breakpoint (1024px) rather than `xl` (1280px), so common laptop and landscape
  tablet widths keep it.

  There is a skip-to-content link targeting the main region, and non-essential
  motion is disabled when the system reports a reduced-motion preference.

  The document title reflects the current screen, so tabs, history entries, and
  bookmarks are distinguishable and screen readers announce the change. The
  developer theme reports a dark colour scheme in both modes, matching the
  palette it actually renders, so native form controls and scrollbars no longer
  appear light against its dark surfaces.

- 2cf2833: Adopt `@seamless-auth/types` 0.4.0 as the single source of truth for API types.

  Removes `src/types/user.ts` and `src/types/authEventTypes.ts` and repoints every
  hook, page, and component at the published schemas, so request and response
  shapes can no longer drift from the API.

  The auth event filter list on the Events page now comes from the package. That
  drops `bootstrap_admin_granted` and `bootstrap_admin_check_skipped`, which the
  API does not emit, and adds `magic_link_failed`, which it does.

- 4d5e6e9: Expose the charts to assistive technology and give the line chart an empty
  state.

  Both charts are now announced as a single image with a summary of what they
  show. The line chart carries a visually hidden data table as its text
  alternative, and the pie chart's categories are rendered as an interactive
  legend, which is both its text alternative and the keyboard route to the
  filtering the segments offer. The segments were previously clickable by mouse
  only, and nothing indicated they were interactive at all.

  With an empty dataset the line chart drew its axes and legend and nothing else,
  so a quiet deployment was indistinguishable from a chart that failed to load.
  It now renders an explicit no-data message, matching the pie chart on the same
  screens.

### Patch Changes

- 4256b5b: Fix the user directory, user detail, and the create and edit dialogs.

  The create and edit dialogs read the available roles list but ignored its
  loading and error states, so a failed roles request left an empty roles area
  and a permanently disabled submit with no explanation and no way out. A load
  failure is now reported with a retry, and "roles could not be loaded" is
  distinguished from "no roles are configured".

  Both dialogs show an in-progress label for the create or update request itself,
  not only for the verification step that precedes it, so the dialog no longer
  looks stalled while saving.

  Revoke-sessions and delete-user on the user detail screen disable and show
  progress while their request is in flight, matching the device replacement
  control alongside them. The suspicious signals tile no longer describes failed
  sign-ins in its supporting text while counting something else.

  Deleting the only row left on a page past the first now steps back a page
  instead of leaving the table on an offset beyond the end of the result set. The
  directory's page-scoped tiles are labelled as describing the current page.

- 1148be2: Remove the dead Bootstrap event category and the misspelled `notication_sent`
  match, and type the category rules against `AuthEventType`.

  The API dropped the `bootstrap_admin_` events, so the Bootstrap quick filter
  could never match anything. An operator could still select it and get an empty
  result with no explanation. `notication_sent` was a typo sitting next to
  `notification_sent`, matching nothing.

  The `exact` matcher now takes `AuthEventType` values rather than plain strings,
  so retiring an event upstream fails the build here. Two tests cover the other
  direction: no category may be unreachable by every known event type, and no
  known event type may fall through to Other.

- 40f9186: Surface the actionable detail from a validation error instead of the generic reason. The auth API
  answers `{ error, message? }`, where `error` carries the reason and `message` optional detail, so a
  rejected role assignment returns `error: "Invalid roles"` alongside
  `message: "Roles not available on this instance: admin:reed"`. Only the second tells an operator
  which role to fix, and the toast showed the first.

  The detail now wins when both are present, with the reason used when the detail is missing or does
  not look like operator-facing prose. The existing safety rules are unchanged: only validation
  statuses surface upstream text, machine codes and overlong values are still suppressed, and 5xx
  never surfaces.

- 9cc237d: Compare table values by type when sorting, and stop the sort indicator implying
  it covers the whole result set.

  Every value was stringified and compared with `localeCompare`, so numeric
  columns ordered 1, 10, 100, 2. Numbers, booleans, dates, and ISO date strings
  are now compared by value, and remaining strings use a numeric-aware collation.
  Empty cells sink in both directions rather than displacing real values.

  Sorting still applies to the rows the table holds, which on a paginated screen
  is one page. The indicator now says so rather than reading as though the
  full set is ordered.

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
