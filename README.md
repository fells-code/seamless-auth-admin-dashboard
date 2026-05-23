[![Publish Docker Image](https://github.com/fells-code/seamless-auth-admin-dashboard/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/fells-code/seamless-auth-admin-dashboard/actions/workflows/docker-publish.yml)
[![Coverage](https://img.shields.io/badge/coverage-83.9%25-green)](#testing)

# Seamless Auth Dashboard

The Seamless Auth Dashboard is a React/Vite admin portal for operating a Seamless Auth deployment. It gives operators direct visibility into authentication activity and lets admins manage users, sessions, security signals, and system configuration from one place.

This app is intended to run alongside the Seamless Auth API as part of a self-hosted auth stack.

## What It Does

- browse and manage users
- inspect sessions and revoke them
- filter and investigate authentication events
- review suspicious activity and anomaly signals
- edit system configuration
- configure allowed login methods and OAuth providers
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
- JSON paths used to read provider subject, email, and name from the userinfo response
- optional redirect URI
- signup policy

The dashboard intentionally does **not** collect provider client-secret values. Store those secrets
on the Seamless Auth API host and reference them by environment variable name, for example
`GOOGLE_CLIENT_SECRET`.

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
  "subjectJsonPath": "sub",
  "emailJsonPath": "email",
  "nameJsonPath": "name",
  "allowSignup": true
}
```

After saving config, clients can discover enabled providers with `GET /oauth/providers` and start
login with `POST /oauth/:providerId/start`.

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

- `AuthProvider` auth mode wiring is not fully aligned with runtime config support
- the unauthenticated `Sign In` button still has no wired action
- a few query invalidation paths remain narrower than ideal
- chart components have lighter test coverage than the shared shell and utility layers

## License

AGPL-3.0
