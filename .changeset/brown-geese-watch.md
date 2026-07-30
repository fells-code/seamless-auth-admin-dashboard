---
"seamless-auth-admin-dashboard": minor
---

Correct the monitoring screens' figures and let operators refresh and export
them.

The Overview failure rate shows a neutral no-data state when there were no
authentication attempts in the window, instead of deriving 100% from an absent
success rate and pairing it with "Elevated enough to merit review" on the
landing screen.

Expired sessions are excluded from the active session count and reported
separately. Microsoft Edge sessions are labelled Edge: Edge and most
Chromium-based user agents also contain "Chrome", which was matched first.

The Security screen derives its headline count and its supporting figures from
the same rows, and discloses when the feed returned fewer records than it
reported, rather than letting the two halves of the screen disagree silently. A
flagged signal's user identifier links through to that account, matching the
events table.

Overview, Sessions, and Security have a manual refresh control, revalidate on
an interval and on window focus, and their relative times advance while the
screen stays open. The session and suspicious-activity tables can be exported
as CSV.
