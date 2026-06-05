[![Publish Docker Image](https://github.com/fells-code/seamless-auth-admin-dashboard/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/fells-code/seamless-auth-admin-dashboard/actions/workflows/docker-publish.yml)
[![Coverage](https://img.shields.io/badge/coverage-86.7%25-green)](#testing)

# Seamless Auth Dashboard

The Seamless Auth Dashboard is a React/Vite admin portal for operating a Seamless Auth deployment. It gives operators direct visibility into authentication activity and lets admins manage users, sessions, security signals, and system configuration from one place.

This app is intended to run alongside the Seamless Auth API as part of a self-hosted auth stack.

## What It Does

- browse and manage users
- inspect sessions and revoke them
- filter and investigate authentication events
- review suspicious activity and anomaly signals
- edit system configuration
- sign in with Seamless Auth headless-client flows, including passkeys, magic links, and OTP fallbacks
- manage organizations and organization membership
- configure allowed login methods and OAuth providers
- configure account lockout policy
- run admin-assisted device-replacement recovery
- require step-up authentication before destructive or high-sensitivity actions
- hide write controls from read-only admins
- operate with runtime config injection in containerized environments

## Tech Stack

- React 19
- Vite
- TypeScript
- TanStack Query
- Tailwind CSS v4
- Recharts
- Vitest + Testing Library

## Runtime Model

This dashboard is built as static assets and served by nginx.

Runtime configuration is injected at container startup:

- `index.html` loads `/config.js`
- `entrypoint.sh` writes `window.__SEAMLESS_CONFIG__`
- `src/lib/runtimeConfig.ts` reads runtime config first, then falls back to `import.meta.env`

That runtime-config flow is intentional. The dashboard is designed to be reconfigured per environment without rebuilding the frontend image.

## Features

### Overview

- operator landing page with metrics, charts, and investigation entry points

### Users

- list, search, create, edit, and delete users
- drill into individual user detail
- require fresh step-up authentication before create, edit, delete, session revoke, and device-recovery actions

Admin user deletion follows the Seamless Auth API contract:

```http
DELETE /admin/users
Content-Type: application/json

{ "userId": "user-id" }
```

When the server adapter is mounted at `/auth`, the dashboard sends this as `DELETE /auth/admin/users`.

### Organizations

- list and inspect organizations
- create and update organizations
- add, update, and remove organization members

### Sessions

- inspect active sessions
- revoke individual sessions

### Events

- browse authentication events
- filter by grouped event type and time range
- deep-link into filtered views

### Security

- review anomaly and suspicious activity signals
- navigate from security context into event investigation

### System Configuration

- manage available roles and auth settings
- enable or disable login methods such as passkeys, magic links, OTP, and OAuth
- configure OAuth providers without entering provider client secrets in the browser
- configure lockout policy for repeated failed login attempts

Role management supports scoped role names such as `admin:read` and `admin:write`. Dashboard access
accepts the legacy `admin` role, `admin:read`, or `admin:write`. Read-only admins can inspect
users, sessions, organizations, events, and config, but destructive controls are hidden or disabled.

#### OAuth Provider Configuration

The dashboard edits the Seamless Auth API `oauth_providers` system config. OAuth is enabled by
turning on the `OAuth` login method and adding one or more provider records.

Each provider record includes:

- provider id, such as `google` or `github`
- display name
- client id
- `clientSecretEnv`, the name of the server environment variable holding the client secret
- authorization URL
- token URL
- userinfo URL
- requested scopes
- exact redirect URI allowlist
- JSON paths used to read provider subject, email, email verification, and name from the userinfo response
- account-linking policy
- email verification policy
- signup policy

The dashboard intentionally does **not** collect provider client-secret values. Store those secrets
on the Seamless Auth API host and reference them by environment variable name, for example
`GOOGLE_CLIENT_SECRET`. Provider cards show only that a secret environment variable is configured;
use the edit form when you need to change the configured environment variable name.

Example provider configuration:

```json
{
  "id": "google",
  "name": "Google",
  "enabled": true,
  "clientId": "google-oauth-client-id",
  "clientSecretEnv": "GOOGLE_CLIENT_SECRET",
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth",
  "tokenUrl": "https://oauth2.googleapis.com/token",
  "userInfoUrl": "https://openidconnect.googleapis.com/v1/userinfo",
  "scopes": ["openid", "email", "profile"],
  "redirectUri": "https://app.example.com/oauth/callback",
  "redirectUris": ["https://app.example.com/oauth/callback"],
  "subjectJsonPath": "sub",
  "emailJsonPath": "email",
  "emailVerifiedJsonPath": "email_verified",
  "nameJsonPath": "name",
  "allowSignup": true,
  "accountLinking": "email",
  "requireEmailVerified": true
}
```

After saving config, clients can discover enabled providers with `GET /oauth/providers` and start
login with `POST /oauth/:providerId/start`.

#### Lockout Policy

The dashboard edits the API `lockout_policy` system config. Operators can enable or disable
lockout, set the failed-attempt threshold, set the counting window, and choose how long identified
users remain locked. This complements route-level rate limits; it does not replace destination or
IP-based abuse controls.

#### Device Replacement Recovery

The user detail page includes a device-replacement action for write admins. The API requires a
fresh step-up session before it will revoke sessions, remove passkeys, and disable TOTP for the
target user. The dashboard shows only the resulting counts and never displays credential secrets.

### Appearance

- multiple built-in themes
- light and dark modes
- appearance switching from the user menu

## Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

The app will be available at [http://localhost:5173](http://localhost:5173).

## Scripts

```bash
npm run dev
npm run lint
npm run format
npm run format:check
npm run typecheck
npm test
npm run coverage
npm run build
```

## Release Preparation

Commits to `main` run the release-preparation workflow. That workflow validates the dashboard, runs
Changesets versioning, updates `CHANGELOG.md` and `package.json`, and opens or updates a version PR
for review.

The workflow does not publish packages, create GitHub releases, or push release tags. Releases are
generated manually after the version PR has been reviewed and merged.

## Local Configuration

You can provide config through Vite env vars for local development:

```bash
VITE_API_URL=http://localhost:5312
```

In production-like deployments, prefer the runtime `config.js` injection flow instead.

## Testing

The repo includes a frontend test setup using Vitest, Testing Library, and jsdom.

Useful commands:

```bash
npm test
npm run coverage
```

Coverage is currently focused on shared components and `src/lib` helpers.

## Docker

Build the container image locally:

```bash
npm run docker:build
```

Run it locally:

```bash
npm run docker:run
```

The production image serves the built frontend through nginx and includes a container health check.

## Project Structure

```text
src/
  components/
  hooks/
  lib/
  pages/
  types/
```

- `components`: shared UI primitives and app shell
- `hooks`: data fetching and mutations
- `lib`: helpers, config, and domain utilities
- `pages`: top-level route screens
- `types`: shared frontend types

## Design Notes

The dashboard is intentionally lightweight:

- explicit routes instead of heavy meta-framework conventions
- thin pages and focused hooks
- shared UI primitives over a component framework
- theme-aware styling through shared CSS tokens
- URL-driven filter state where it improves operator workflows

## Current State

The app is functional and meant for real use. The current focus is on consistency, operator ergonomics, and tightening the remaining rough edges.

Known areas still worth attention:

- The dashboard assumes the SeamlessAuth server adapter is mounted at `/auth`
- the Seamless Auth server adapter and upstream API docs should stay aligned with dashboard route contracts, especially destructive admin mutations
- a few query invalidation paths remain narrower than ideal
- chart components have lighter test coverage than the shared shell and utility layers
- page-level end-to-end coverage against a real Seamless Auth deployment is still limited

## License

AGPL-3.0
