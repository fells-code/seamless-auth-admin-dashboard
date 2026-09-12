---
"seamless-auth-admin-dashboard": minor
---

Show the passwordless funnel on the Overview screen.

A new section between the deployment tiles and the charts reads
`GET /internal/metrics/funnel` and renders four figures for the selected range: time to
registration, time to login, passkey adoption, and time to first passkey. Each is a
median, with the p90 and the number of readings it was computed over beneath it, so a
median of three registrations is not mistaken for one of three thousand. When there was
nothing to measure the tile says so rather than rendering a null as `0.0s` or an empty
cohort as `0%`.

The section follows the range selector and the refresh control like the charts do, and
a failed funnel query is reported in place without taking the rest of the screen down.
The Operator Focus card that counts passkey sign-ins in the last 24 hours is retitled
from "Passkey adoption" to "Passkey sign-ins", since adoption now has its own figure.

Needs a Seamless Auth API that serves the funnel endpoint and a server adapter that
passes it through.
