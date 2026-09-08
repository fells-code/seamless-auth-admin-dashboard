---
"seamless-auth-admin-dashboard": minor
---

Collect identity proofing before preparing a device replacement.

The API now refuses this recovery unless it records how the operator established
who they were talking to, so the button opens a form rather than a plain
confirmation. It asks how identity was confirmed, for a reference to the
evidence, and for an approver when the operator takes the remote exception
rather than proofing in person.

Also upgrades `@seamless-auth/types` from 0.4.0 to 0.9.0.
