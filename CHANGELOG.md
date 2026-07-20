# seamless-auth-admin-dashboard

## 0.2.0

### Minor Changes

- 02a6bba: Add a same-origin build variant so an auth instance can serve the dashboard at
  `/console` on its own domain. A new `build:console` script sets
  `VITE_BASE_PATH=/console/` and `VITE_SAME_ORIGIN=true`, deriving the auth API base
  from the page origin and serving assets and routes under `/console`. The existing
  root build is unchanged and still uses runtime config injection or the baked
  `VITE_API_URL`.

## 0.1.1

### Patch Changes

- 957b9af: fixes an issue with table data not being aligned or running off or hidden

## Earlier releases

- Baseline before Changesets-managed releases. Tagged releases from this period
  are listed under the repository's Releases page.
