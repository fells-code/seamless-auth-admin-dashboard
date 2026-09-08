---
"seamless-auth-admin-dashboard": minor
---

Add a time range to the Overview and Security screens.

Only the events feed offered a date range, so an operator investigating outside
the default window could not narrow or shift the period on the screens that
lead the investigation. Overview's activity chart and event distribution, and
Security's login statistics, now follow a range control, and the selection is
carried in the URL so a narrowed view is linkable and survives a reload.

The range model is shared with the events feed rather than reimplemented: the
control is extracted from `EventFilters` and both use it. The activity chart
switches to daily buckets for windows wider than two days, so a week is not 168
hourly points.

Two endpoints, `/internal/metrics/dashboard` and `/internal/security/anomalies`,
take no date range, so the figures they feed are labelled as fixed-window rather
than appearing to respond to the picker.
