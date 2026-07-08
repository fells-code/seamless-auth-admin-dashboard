# AGENTS.md

This file is for coding agents working in the Seamless Auth Admin Dashboard repository.

It describes the codebase as it exists today. Use it to preserve the strongest current patterns, avoid known traps, and make changes that fit the repo instead of fighting it.

## Working Standards (fells-code baseline)

These rules apply to every repository in the fells-code org. Repo-specific
guidance may extend them but must not contradict them.

### Attribution

- Commit and open PRs solely under the repository owner's identity. Never
  commit under an agent or assistant identity.
- Never attribute work to an AI assistant: no `Co-Authored-By: Claude` (or any
  assistant) trailers, no "Generated with" / "Created with Claude" notes, and no
  assistant branding or emoji anywhere in commit messages, PR or issue titles
  and descriptions, changesets, code comments, or docs.

### Comments

- Comment only when the code genuinely needs explaining: a non-obvious reason, a
  gotcha, or an invariant. Never narrate what the code plainly does.

### TODOs

- Every `TODO`/`FIXME` must reference a ticket, e.g. `// TODO(#123): ...`.
  Do not leave a bare TODO. If no ticket exists, create one first.

### Commits & branches

- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `ci:`, `test:`).
- Descriptive branch names (`feat/...`, `fix/...`); never a `claude/` or other
  tool-generated prefix.

### Public-facing text

- No em dashes in commit messages, code comments, PR or issue text, changesets,
  or docs. Use a comma, parentheses, or a separate sentence.

### Before declaring work done

- All code quality checks must pass before you open a PR or call the work done:
  tests, linting, type checks, and formatting. Run them and report the real
  output; do not open a PR while any check is failing.
- Typical commands: `npm run typecheck`, `npm run lint`, `npm run format:check`
  (or `npm run format`), and `npm test`. Never claim a change works without
  running them.
- Match the surrounding code's style, naming, and comment density.

## Purpose

This project is a React/Vite admin dashboard for operating a Seamless Auth deployment.

It is an operator console, not a marketing site and not a design-system-heavy frontend. The dashboard is meant to:

- expose operational visibility into auth activity
- let admins manage users, sessions, security posture, and system configuration
- run as a static frontend served by nginx
- read runtime config at container startup
- talk directly to the Seamless Auth API

## Runtime Model

The app is built as static assets and served from nginx in production.

Important runtime details:

- `index.html` loads `/config.js` before the app bundle
- `entrypoint.sh` writes `window.__SEAMLESS_CONFIG__`
- `src/lib/runtimeConfig.ts` reads runtime config first, then falls back to `import.meta.env`
- `src/lib/api.ts` builds requests from `API_URL` and the fixed `/auth` server-adapter path
- `public/favicon.ico` is the primary favicon and is linked directly from `index.html`

Treat runtime config injection as a real product requirement. Do not replace it with build-time-only config unless explicitly asked.

## High-Level Architecture

The current architecture is straightforward and mostly healthy:

- `src/pages`: top-level route screens and page-specific UI state
- `src/hooks`: server reads/writes via TanStack Query
- `src/components`: reusable UI building blocks and app shell pieces
- `src/lib`: shared helpers and light domain utilities
- `src/types`: shared frontend types

The strongest existing pattern is:

1. page component owns local UI state
2. dedicated hook owns data fetching or mutation
3. shared component renders repeated UI patterns

Prefer extending that pattern over introducing new abstraction layers.

## App Shell And Routing

The app is bootstrapped in `src/main.tsx` with:

- `QueryClientProvider`
- `BrowserRouter`
- `ThemeProvider`
- `App`

Routing lives in `src/App.tsx`.

Current route model:

- `/unauthenticated`
- `/login`
- `/verify-magiclink`
- `/`
- `/users`
- `/users/:id`
- `/organizations`
- `/sessions`
- `/events`
- `/security`
- `/system`
- `/profile`

Public auth routes are wrapped in `PublicAuthRoute`. Authenticated dashboard routes are wrapped in
`RequireAuth`, which requires `admin:read` access. The legacy `admin` role and `admin:write` satisfy
that read check through `hasScopedRole`.

## Auth Model

Auth is handled through `@seamless-auth/react`.

Current behavior:

- `AuthProvider` wraps the app
- `RequireAuth` blocks rendering until auth state resolves
- `PublicAuthRoute` keeps `/login` and `/verify-magiclink` available to unauthenticated users, but redirects already-authenticated admins back to the protected dashboard destination
- `SignIn.tsx` uses the Seamless Auth headless client for passkey-first sign-in with magic-link, email OTP, and phone OTP fallbacks
- protected route refreshes preserve the last visited route
- public auth routes are excluded from last-protected-route storage
- non-admin or unauthenticated users trying to access dashboard routes are redirected to `/unauthenticated`
- API requests are sent with `credentials: "include"`

Important current-state note:

- `src/lib/runtimeConfig.ts` supports runtime API URL injection
- `src/lib/api.ts` always targets the server-adapter `/auth` path
- `src/App.tsx` passes the API URL to `AuthProvider`

If you change auth behavior, inspect all three files together.

## Appearance And Theme System

The app now has a real appearance system.

Current behavior:

- `ThemeProvider` owns the appearance context
- appearance is persisted in local storage
- theme selection lives in the username dropdown via `UserMenu`
- light and dark modes are supported for each theme
- current themes are `autumn`, `winter`, `summer`, `spring`, and `developer`

When touching styling:

- prefer CSS variable driven colors from `src/index.css`
- preserve the theme token model rather than hardcoding one palette
- reuse shared primitives like `Table`, `Section`, `Skeleton`, `StatCard`, `Tabs`
- use existing utility classes like `btn`, `btn-primary`, `btn-secondary`, `btn-danger`

The old “single earthy palette” assumption is no longer true. The UI should stay coherent across multiple themes.

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

Important current API contract:

- `apiFetch` prepends the fixed `/auth` server-adapter path.
- Admin user deletion calls `DELETE /admin/users` with `{ "userId": "..." }` in the JSON body, which becomes `DELETE /auth/admin/users` at the dashboard boundary.
- Do not change user deletion back to `DELETE /admin/users/:userId`; that route is not part of the current Seamless Auth API contract.

Prefer adding a new dedicated hook over inlining `fetch` inside a page.

## Page Responsibilities

Current page intent:

- `SignIn.tsx`: custom Seamless Auth headless-client sign-in flow for admins
- `MagicLinkVerification.tsx`: magic-link callback verification and session refresh
- `Overview.tsx`: operator landing page with stats, charts, and investigation entry points
- `Users.tsx`: searchable user directory with create, edit, and delete actions
- `UserDetail.tsx`: single-user overview, sessions, credentials, events, and anomalies
- `Organizations.tsx`: organization directory, details, and membership management
- `Sessions.tsx`: global session inventory and revoke actions
- `Events.tsx`: auth event browsing and filtering, including grouped quick filters
- `Security.tsx`: anomaly and login-stat visibility with drill-down links
- `SystemConfig.tsx`: editable system settings and roles
- `Profile.tsx`: current user profile, sessions, and credentials
- `Unauthenticated.tsx`: access-required state and redirect handling

When adding new behavior, keep the page focused on composition and UI state. Put server interaction into hooks.

## Testing And Tooling

The repo now has a real frontend testing setup.

Current scripts:

- `npm run lint`
- `npm run format`
- `npm run format:check`
- `npm run typecheck`
- `npm test`
- `npm run coverage`
- `npm run build`

Release workflow:

- `.github/workflows/release.yml` prepares a Changesets version PR when changes land on `main`
- it should run `npm run version-packages` through `changesets/action`
- it should not run `changeset publish`, create GitHub releases, or push release tags
- release generation is intentionally manual after the version PR is reviewed and merged

Current test stack:

- Vitest
- Testing Library
- jsdom

Coverage is configured in `vite.config.ts` and currently focuses on shared components and `src/lib` helpers.

When changing shared behavior, add or update tests. This repo is now in a state where test coverage is expected, not optional.

## Preferred Coding Conventions

For future work, prefer these conventions already visible in the better parts of the repo:

- thin pages, focused hooks
- one hook per backend resource or mutation
- reuse shared components before creating page-specific copies
- preserve runtime config support
- keep types close to the frontend boundary
- prefer small helpers in `src/lib` over large utility layers
- keep routing explicit in `App.tsx`
- keep URL-driven filter state where it already exists, especially in `Events`

For styling:

- extend `src/index.css` tokens and utilities when needed
- prefer current token names and button classes over ad hoc colors
- preserve existing section/card/table patterns
- keep new UI theme-aware

## Rough Edges To Know Before Editing

These are current-state issues. Do not ignore them when working nearby.

### Runtime and UX inconsistencies

- The dashboard assumes the SeamlessAuth server adapter is mounted at `/auth`
- The unauthenticated access-required screen now routes to `/login`; keep that behavior intact when changing auth routes
- `src/components/Sidebar.tsx` reads the footer version from `package.json`; avoid hardcoding versions there
- `index.html` includes `/config.js`, which produces a Vite build warning, but is intentional for runtime config injection

### API and adapter alignment

- The dashboard talks to the Seamless Auth server adapter at `/auth/*`, while the upstream API routes are defined without that prefix
- Destructive admin mutations should be checked against the upstream Seamless Auth API and the server adapter together before changing dashboard paths
- `DELETE /auth/admin/users` expects a JSON body containing `userId`; the upstream API route is `DELETE /admin/users`

### Query invalidation and data flow

- `src/hooks/useRevokeSession.ts` invalidates `["sessions"]`, but related user detail/profile data should be checked when working on session flows
- mutation invalidation is better than before, but still not uniformly comprehensive across every screen

### Data-shape inconsistencies

- some pages and hooks still mix backend-style fields and frontend-style fields, for example `ip_address` vs `ipAddress`
- a few local ad hoc types still exist where shared types could be reused

### Testing gaps

- chart components are still largely untested
- `Table.tsx` has decent coverage but still leaves some interaction branches untested
- page-level integration coverage is lighter than shared component coverage

When touching these areas, prefer nudging the code toward consistency rather than copying the inconsistency forward.

## Patterns To Strengthen

When making changes, bias toward these improvements:

- share types instead of redefining them per page when practical
- keep mutation invalidation comprehensive for every affected screen
- keep filter state and deep-link behavior consistent with the URL
- add tests for shared behavior and non-trivial hooks/components
- keep auth/runtime wiring consistent across provider setup, config helpers, and API calls

## Patterns To Avoid

Avoid introducing more of the weaker patterns already present:

- inline network requests in page components
- new one-off styling systems or hardcoded random colors
- duplicate local types without reason
- visible UI actions that do nothing
- broad refactors that rewrite page structure without a clear product reason
- tests that only snapshot markup without validating behavior

## Safe Change Workflow For Agents

When making a change:

1. identify the page and user-facing behavior involved
2. find the hook that owns the relevant backend interaction
3. inspect shared components before creating new UI primitives
4. preserve runtime config and auth assumptions
5. verify query invalidation for every impacted screen
6. add or update tests when shared behavior changes
7. run `npm run lint`
8. run `npm run typecheck`
9. run `npm test`
10. if changing Docker or runtime behavior, also inspect `Dockerfile`, `nginx.conf`, `entrypoint.sh`, and `index.html`

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

For shared UI or theme changes:

- inspect `ThemeProvider`, `UserMenu`, `ThemeToggle`, and `src/index.css`
- verify the result in both light and dark mode
- avoid color choices that only work in a single theme

## Verification Checklist

Before finishing work, check:

- does the change match the thin-page / hook-driven pattern?
- does it preserve runtime config behavior?
- does it fit the existing UI language across themes?
- are query keys and invalidations correct?
- did you avoid copying a known rough edge into a new place?
- did you update tests where shared behavior changed?
- do `npm run lint`, `npm run typecheck`, and `npm test` still pass?

## Bottom Line

This repo is strongest when it stays simple and explicit:

- explicit routes
- focused hooks
- shared primitives
- runtime-configurable deployment
- theme-aware operator UI
- test-backed shared behavior

Agents should preserve those strengths, document rough edges honestly, and improve consistency incrementally rather than by force-fitting a new architecture.
