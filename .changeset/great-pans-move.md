---
"seamless-auth-admin-dashboard": minor
---

Give step-up a route through for admins with no passkey.

An account with no passkey cannot satisfy a WebAuthn ceremony: the API answers
the start call with an empty credential list, so the browser prompt has nothing
to assert and the action failed with a generic "Step-up verification failed"
and no way forward. This is routine with OAuth, where an admin may never have
enrolled a passkey.

The guard now checks for a usable factor before launching a ceremony that
cannot succeed, offers a TOTP code prompt where an authenticator is enrolled,
and names the requirement and the remedy when the account has neither. Using
the WebAuthn detail the SDK now surfaces, a dismissed prompt is reported as a
cancellation rather than a failure, and an origin or relying-party mismatch
says so instead of being indistinguishable from everything else.
