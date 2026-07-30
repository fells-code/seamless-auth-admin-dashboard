---
"seamless-auth-admin-dashboard": patch
---

Fix the user directory, user detail, and the create and edit dialogs.

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
