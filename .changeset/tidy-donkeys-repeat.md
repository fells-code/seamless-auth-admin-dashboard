---
"seamless-auth-admin-dashboard": minor
---

Adopt `@seamless-auth/types` 0.4.0 as the single source of truth for API types.

Removes `src/types/user.ts` and `src/types/authEventTypes.ts` and repoints every
hook, page, and component at the published schemas, so request and response
shapes can no longer drift from the API.

The auth event filter list on the Events page now comes from the package. That
drops `bootstrap_admin_granted` and `bootstrap_admin_check_skipped`, which the
API does not emit, and adds `magic_link_failed`, which it does.
