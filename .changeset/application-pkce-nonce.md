---
"seamless-auth-admin-dashboard": minor
---

The application page shows whether an application requires PKCE and the nonce, and the edit dialog changes them on a confidential client. The nonce setting appears only once PKCE is off, and turning PKCE back on restores the nonce requirement, matching the API's rules. An application with both off relies only on `state` and client authentication against authorization code injection, so it is marked in the list and warned about on its page and in the dialog. Saving goes through step-up like every application write. Pins `@seamless-auth/types` 0.34.0.
