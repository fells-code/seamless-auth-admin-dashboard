---
"seamless-auth-admin-dashboard": patch
---

Compare table values by type when sorting, and stop the sort indicator implying
it covers the whole result set.

Every value was stringified and compared with `localeCompare`, so numeric
columns ordered 1, 10, 100, 2. Numbers, booleans, dates, and ISO date strings
are now compared by value, and remaining strings use a numeric-aware collation.
Empty cells sink in both directions rather than displacing real values.

Sorting still applies to the rows the table holds, which on a paginated screen
is one page. The indicator now says so rather than reading as though the
full set is ordered.
