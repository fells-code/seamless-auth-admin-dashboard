---
"seamless-auth-admin-dashboard": minor
---

Add an OpenID Provider section to System Configuration that shows and edits `oidc_provider_enabled`, `oidc_issuer`, `allow_client_secrets`, and `third_party_clients_enabled`. They save with the rest of the page through `PATCH /system-config/admin` after step-up. A cleared issuer is sent as `null`, and an issuer that is not a URL is refused before saving. When the API refuses the change, for example enabling the provider before the issuer is set or while its host is outside the relying-party ID, the problems it lists in `details` are now shown after its reason, here and on every other refusal that carries them. Needs `@seamless-auth/types` 0.34.0 and Seamless Auth API 0.21.0 or later.
