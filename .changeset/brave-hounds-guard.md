---
"seamless-auth-admin-dashboard": minor
---

Add safeguards and inline validation to the system configuration screen.

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
