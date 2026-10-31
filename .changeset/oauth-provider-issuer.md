---
"seamless-auth-admin-dashboard": minor
---

Add OAuth providers from their issuer. The provider form gains a "Discover from issuer" option: enter the issuer URL and leave the authorization, token, and user info URLs blank to have the API read them from the issuer's `/.well-known/openid-configuration` when the provider is used, or fill any of them to override the discovered value. Providers with an issuer get a Refresh discovery action (step-up required) that re-reads the discovery document and shows the endpoints sign-in will use, or the reason the document was refused. The `oidc_account_notice_sent` and `oidc_account_notice_failed` events are labelled and grouped under OpenID Provider, and other OIDC event names now read "OIDC". Needs `@seamless-auth/types` 0.34.0-next.3 and an adapter in front of Seamless Auth API 0.21.0 or later for the discovery route.
