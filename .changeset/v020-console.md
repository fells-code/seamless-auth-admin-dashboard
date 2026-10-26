---
"seamless-auth-admin-dashboard": minor
---

Support the v0.20 Seamless Auth API.

- New Sign-in Policy page (`/policy`): compare the draft with the published policy, edit, save and discard the draft, dry run it over the last 1 to 30 days, publish it, and review version history and roll back. Publish and rollback step up first, and a publish that loses to another version reloads and says so.
- System Configuration links to the Sign-in Policy page, says that saving a sign-in setting records a new policy version, and warns when a staged draft would be left behind.
- Every admin write steps up first, including organization create and update and saving your own profile. A `403 step_up_required` answer opens the step-up prompt and retries the write once, instead of reporting a permission error.
- Recovery, account recovery, break-glass, policy and step-up audit events have readable labels and their own event categories. Break-glass sign-ins and enrollments are shown as high severity.
- Requires `@seamless-auth/types` 0.31.0 or later.
