---
"seamless-auth-admin-dashboard": minor
---

Add a Roles page to manage the permission catalogue, the organization role catalogue, and what each instance and organization role grants. Every write asks for step-up, read-only admins see the model without the controls, and a refused delete or mapping names what stood in the way. The page states that a change reaches a user with their next access token, and that an instance `admin` and an organization `admin` never share a grant. Against an API older than v0.23 it says the API needs upgrading instead of retrying an error.

Organization member roles are now picked from the organization role catalogue. A legacy role a member already holds stays visible and is kept, and a refused grant names the roles. The audit events for permissions, roles, members and session exchange have categories and labels in the Events view. `@seamless-auth/types` moves to 0.38.
