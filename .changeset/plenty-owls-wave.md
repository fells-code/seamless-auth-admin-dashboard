---
"seamless-auth-admin-dashboard": minor
---

Require a name when editing an organization, and make memberships editable.

The organization edit form submitted the name without checking it was
non-empty, so clearing the field and saving wrote an empty name and left the
organization unidentifiable in every list. The create form already guarded
this; the edit form now matches and reports the problem inline.

Member roles are chosen from the roles the instance defines rather than typed
as free-form comma-separated text, which silently accepted typos. An existing
membership can now be edited in place, so changing someone's role no longer
means removing and re-adding them and discarding their membership history. The
organization list has a search field.
