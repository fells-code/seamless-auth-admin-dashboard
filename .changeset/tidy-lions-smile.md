---
"seamless-auth-admin-dashboard": minor
---

Expose the charts to assistive technology and give the line chart an empty
state.

Both charts are now announced as a single image with a summary of what they
show. The line chart carries a visually hidden data table as its text
alternative, and the pie chart's categories are rendered as an interactive
legend, which is both its text alternative and the keyboard route to the
filtering the segments offer. The segments were previously clickable by mouse
only, and nothing indicated they were interactive at all.

With an empty dataset the line chart drew its axes and legend and nothing else,
so a quiet deployment was indistinguishable from a chart that failed to load.
It now renders an explicit no-data message, matching the pie chart on the same
screens.
