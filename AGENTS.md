# AGENTS.md

This file is for coding agents working in the Seamless Auth Admin Dashboard repository.

It describes the codebase as it exists today, not as an idealized target state. Use it to make changes that fit the strongest existing conventions while avoiding the rough edges already present.

## Purpose

This project is a React/Vite admin dashboard for operating a Seamless Auth deployment.

The dashboard is meant to:

- expose operational visibility into auth activity
- let admins manage users, sessions, and system configuration
- run as a static frontend served by nginx
- talk directly to the Seamless Auth API

This is not a general marketing site and not a design-system-heavy frontend. It is an operator console.

## Runtime Model

The app is built as static assets and served from nginx in production.

Important runtime details:

- `index.html` loads `/config.js` before the Vite bundle
- `entrypoint.sh` writes `window.__SEAMLESS_CONFIG__`
- `src/lib/runtimeConfig.ts` reads runtime config first, then falls back to `import.meta.env`
- `src/lib/api.ts` builds requests from `API_URL` and current auth mode

Treat runtime config injection as a real product requirement. Do not replace it with build-time-only config unless explicitly asked.

## High-Level Architecture

The current architecture is straightforward and mostly healthy:

- `src/pages`: top-level route screens and page-specific UI state
- `src/hooks`: server reads/writes via TanStack Query
- `src/components`: reusable UI building blocks
- `src/lib`: shared helpers and light domain utilities
- `src/types`: shared frontend types

The best pattern already in place is:

1. page component owns local UI state
2. dedicated hook owns data fetching or mutation
3. shared component renders repeated UI patterns

Prefer extending that pattern over introducing new abstraction layers.

## App Shell And Routing

The app is bootstrapped in `src/main.tsx` with:

- `QueryClientProvider`
- `BrowserRouter`
- `App`

Routing lives in `src/App.tsx`.

Current route model:

- `/unauthenticated`
- `/`
- `/users`
- `/users/:id`
- `/sessions`
- `/events`
- `/security`
- `/system`
- `/profile`

Authenticated routes are wrapped in `RequireAuth`, which currently requires the user to have the `admin` role.

## Auth Model

Auth is handled through `@seamless-auth/react`.

Current behavior:

- `AuthProvider` wraps the app
- `RequireAuth` blocks rendering until auth state resolves
- non-admin or unauthenticated users are redirected to `/unauthenticated`
- API requests are sent with `credentials: "include"`

Important current-state note:

- `src/lib/runtimeConfig.ts` supports runtime auth mode
- `src/lib/api.ts` uses that auth mode
- `src/App.tsx` currently hardcodes `mode="server"` in `AuthProvider`

Do not assume auth mode plumbing is fully consistent everywhere. If you change auth behavior, inspect all three files together.

## API Conventions

The frontend assumes a backend split roughly like this:

- `/admin/*`: admin operations and admin-facing entity reads
- `/internal/*`: metrics, observability, analytics, anomalies
- `/system-config/*`: system settings and roles

Existing hook style is simple and should remain simple:

- keep fetch logic in `src/hooks`
- call `apiFetch(...)` directly from hooks
- use stable `queryKey`s
- invalidate affected queries in mutation `onSuccess`

Prefer adding a new dedicated hook over inlining `fetch` inside a page.

## Page Responsibilities

Current page intent:

- `Overview.tsx`: metrics cards plus charts
- `Users.tsx`: paginated searchable user list and create-user entrypoint
- `UserDetail.tsx`: single-user overview, sessions, credentials, events, anomalies
- `Sessions.tsx`: global session list and revoke actions
- `Events.tsx`: auth event browsing and filtering
- `Security.tsx`: anomaly and login-stat visibility
- `SystemConfig.tsx`: editable system settings
- `Profile.tsx`: current user profile, sessions, credentials
- `Unauthenticated.tsx`: access-required state

When adding new behavior, keep the page focused on composition and UI state. Put server interaction into hooks.

## Shared UI Conventions

The strongest existing UI conventions are:

- use shared primitives like `Table`, `Section`, `Skeleton`, `StatCard`, `Tabs`
- keep layouts simple and page-oriented
- prefer CSS variable driven colors from `src/index.css`
- use existing utility classes like `btn`, `btn-primary`, `btn-secondary`, `btn-danger`

Preserve the current visual language:

- warm neutral background
- earthy accent palette
- minimal chrome
- lightweight operator-focused presentation

Do not introduce a component framework or an unrelated visual system.

## Preferred Coding Conventions

For future work, prefer these conventions already visible in the better parts of the repo:

- thin pages, focused hooks
- one hook per backend resource or mutation
- reuse shared components before creating page-specific copies
- preserve runtime config support
- keep types close to the frontend boundary
- prefer small helpers in `src/lib` over large utility layers
- keep routing explicit in `App.tsx`

For styling:

- extend `src/index.css` tokens and utilities when needed
- prefer current token names and button classes over ad hoc colors
- preserve existing spacing and card/table patterns

## Rough Edges To Know Before Editing

These are current-state issues. Do not ignore them when working nearby.

### Tooling mismatches

- `.github/workflows/ci.yml` references `format`, `coverage`, and `typecheck` scripts that are not present in `package.json`
- lint exists and currently passes
- there are no visible repo tests today

### Runtime and UX inconsistencies

- `AuthProvider` is hardcoded to `mode="server"` even though runtime auth mode helpers exist
- the sidebar footer version does not match `package.json`
- `index.html` includes `/config.js`, which produces a Vite build warning, but is intentional for runtime config injection

### Incomplete or uneven app behavior

- `Users.tsx` shows a delete row action with a TODO instead of the real mutation flow used elsewhere
- `Unauthenticated.tsx` renders a Sign In button that currently has no behavior
- query invalidation is not fully consistent across screens
- some pages initialize local state during render instead of inside effects or derived state patterns

### Data-shape inconsistencies

- some pages/hooks use local ad hoc types even where shared types already exist
- naming conventions differ between backend-style fields and frontend-style fields, for example `ip_address` vs `ipAddress`

When touching these areas, prefer nudging the code toward consistency rather than copying the inconsistency forward.

## Conventions To Strengthen

When making changes, bias toward these improvements:

- share types instead of redefining them per page when practical
- keep mutation invalidation comprehensive for every screen affected
- move incomplete placeholder actions to real behavior or remove them
- avoid render-time state initialization patterns in new code
- keep auth/runtime wiring consistent across provider setup, config helpers, and API calls

## Patterns To Avoid

Avoid introducing more of the weaker patterns already present:

- inline network requests in page components
- new one-off styling systems or hardcoded random colors
- duplicate local types without reason
- TODO actions in visible production UI
- partial state sync patterns that depend on setting state during render
- broad refactors that rewrite page structure without a clear product reason

## Safe Change Workflow For Agents

When making a change:

1. identify the page and user-facing behavior involved
2. find the hook that owns the relevant backend interaction
3. inspect shared components before creating new UI primitives
4. preserve runtime config and auth assumptions
5. verify query invalidation for every impacted screen
6. run `npm run lint`
7. if changing Docker or runtime behavior, also inspect `Dockerfile`, `nginx.conf`, `entrypoint.sh`, and `index.html`

## Where To Start For Common Tasks

For a new page:

- add the route in `src/App.tsx`
- create the page in `src/pages`
- create dedicated hooks in `src/hooks` if the page talks to the backend
- reuse `Layout`, `Section`, `Table`, `Skeleton`, and related shared components

For a new backend read:

- add a hook in `src/hooks`
- type the response close to the hook or promote to `src/types` if reused
- use `apiFetch`

For a new mutation:

- add a mutation hook
- invalidate all affected queries, not just the most obvious one
- wire UI actions through the mutation hook instead of inline fetch calls

For auth or deployment changes:

- inspect `src/App.tsx`
- inspect `src/lib/runtimeConfig.ts`
- inspect `src/lib/api.ts`
- inspect `index.html`
- inspect `entrypoint.sh`
- inspect nginx/Docker files if production behavior is involved

## Verification Checklist

Before finishing work, check:

- does the change match the thin-page / hook-driven pattern?
- does it preserve runtime config behavior?
- does it fit the existing UI language?
- are query keys and invalidations correct?
- did you avoid copying a known rough edge into a new place?
- does `npm run lint` still pass?

## Bottom Line

This repo is already strongest when it stays simple:

- explicit routes
- focused hooks
- shared primitives
- runtime-configurable deployment
- practical operator UI

Agents should preserve those strengths, document rough edges honestly, and improve consistency incrementally rather than by force-fitting a new architecture.
