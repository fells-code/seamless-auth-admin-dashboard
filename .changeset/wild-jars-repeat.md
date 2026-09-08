---
"seamless-auth-admin-dashboard": patch
---

Add a Playwright end-to-end harness.

The unit suite covers components, hooks, and helpers in isolation. It does not
exercise the built app in a real browser across routing, guarded navigation,
network calls to `/auth/*`, WebAuthn, and multi-step operator workflows. This
adds the layer that does.

Runs are deterministic and need no live API: the built SPA is served by
`vite preview`, every `/auth/*` call is intercepted, and the app is pointed at
the mock through the same runtime `config.js` injection the container uses. A
call with no mock registered answers 501 and fails the test, so a newly added
request cannot pass as an empty screen. Personas cover unauthenticated,
read-only admin, and write admin, and a CDP virtual authenticator makes passkey
sign-in and step-up run headless.
