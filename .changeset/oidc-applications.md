---
"seamless-auth-admin-dashboard": minor
---

Add Applications and Resources pages for the OpenID Provider. Admins can register public and confidential clients, see redirect URIs checked as they type them (https, loopback and private-use schemes), rotate a client secret that is shown once, register a public key set or JWKS URI, define resources and their scopes, and choose which resources and scopes each application may use. Shared-secret clients are marked as weaker, every write asks for step-up first, and read-only admins see no write controls. Auth events from the OpenID Provider get their own category. Needs `@seamless-auth/types` 0.34.0 and an adapter that serves the `/admin/applications` and `/admin/resources` routes.
