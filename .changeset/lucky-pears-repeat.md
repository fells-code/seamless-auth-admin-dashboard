---
"seamless-auth-admin-dashboard": minor
---

Remove organizations, and page and search the list on the server.

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
