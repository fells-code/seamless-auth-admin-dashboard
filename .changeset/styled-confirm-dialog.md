---
"seamless-auth-admin-dashboard": minor
---

Replace the browser's native confirmation popups with a styled, accessible
in-app dialog. Destructive actions (deleting a user, revoking sessions, removing
an available role or an organization member, and preparing a device
replacement) now open a themed confirmation that matches the rest of the console
and traps focus, closes on Escape, and returns focus to the trigger. A new
useConfirm hook exposes this as a promise, so callers await the operator's
choice instead of calling window.confirm.
