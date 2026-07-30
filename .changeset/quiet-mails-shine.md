---
"seamless-auth-admin-dashboard": minor
---

Fix the sign-in and auth recovery paths so failures explain themselves and lead
somewhere.

Completing sign-in no longer announces an admin session before the admin
requirement has been checked, which previously produced a success message
immediately followed by the no-access screen contradicting it. The account is
routed to the no-access screen with a message that matches.

Fallback sign-in methods are no longer re-derived from local email and phone
patterns. An identifier the server accepted but the pattern rejected had every
method filtered out, and the screen then reported that none were returned,
which was untrue.

Magic-link resend and change-identifier controls disable while a request is in
flight, so the resend cannot be pressed repeatedly into a run of duplicate
emails. A failed magic-link verification now offers a way back to sign-in
instead of being a dead end. A failed OAuth redirect start reports why instead
of silently reverting the button. An account without admin access can sign out
and switch accounts from the no-access screen, which previously required
clearing cookies. Sign-in, OAuth, and magic-link errors are marked as alerts so
screen readers announce them.
