---
"seamless-auth-admin-dashboard": minor
---

Show sign-in outcomes on the Overview screen.

A "Sign-in Outcomes" section sits under the passwordless funnel and reads
`GET /internal/metrics/sign-ins` (fells-code/seamless-auth-api#306) for the selected range: the
success rate with the counts behind it, how many attempts started, how many gave up before
presenting a factor, and how many presented one and never got in. Beneath those, three
breakdowns (by method, by device, by mail provider) each list the success rate and the count
per value, busiest first.

The API counts per attempt rather than per event, so a code mistyped and then entered
correctly is one success, and the section says so. A row whose device class or mail provider
is unknown (written before the columns existed, or with no known subject) is listed as
"Unknown" rather than dropped, since it still holds attempts. When no factor was presented in
the range the section says that instead of rendering a 0% rate.

The section follows the range selector and the refresh control, and answers "Sign-in metrics
unavailable" in place against a deployment that does not serve the route, with the rest of the
screen unaffected. Depends on the adapter passthrough in fells-code/seamless-auth-server#161.
