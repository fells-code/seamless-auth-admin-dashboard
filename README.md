# Seamless Auth Dashboard

The Seamless Auth Dashboard is a web interface for operating a Seamless Auth deployment. It provides visibility into authentication activity and gives operators direct control over users, sessions, and configuration.

This project is intended to run alongside the Seamless Auth API. Together, they form a self-hosted authentication system that lives inside your infrastructure.

---

## Overview

The dashboard exposes the operational surface of Seamless Auth. It is designed for day-to-day use by engineers and operators who need to inspect activity, respond to issues, and manage access.

Core capabilities include:

- User management
- Session control
- Authentication event inspection
- Security signal visibility
- System configuration editing

The goal is not just to display data, but to support investigation and control in one place.

---

## Features

### Users

- List and search users
- Create new users
- Edit email, phone, and roles
- Delete users

### Sessions

- View active sessions per user
- Revoke individual sessions
- Revoke all sessions for a user

### Events

- Browse authentication events
- Filter by type and time range
- Navigate from charts directly into filtered views

### Security

- Surface suspicious activity
- View related IPs and user agents
- Inspect user-level anomalies
- Risk score per user

### System Configuration

- Manage available and default roles
- Configure token lifetimes
- Adjust rate limiting
- Set WebAuthn configuration (RPID and origins)

---

## Architecture

The dashboard talks directly to the Seamless Auth API. It relies on endpoints such as:

- /internal/\* for metrics and observability
- /admin/\* for management operations
- /system-config/\* for configuration

Authentication is handled by the Seamless Auth system itself. In web mode, this typically uses secure cookies.

---

## Tech Stack

- React (Vite)
- TypeScript
- Tailwind CSS
- TanStack Query
- Recharts

The UI is intentionally lightweight and does not depend on a large component framework.

---

## Development

Install dependencies:

```
npm install
```

Run the dashboard locally:

```
npm run dev
```

The app will be available at:

```
http://localhost:5173
```

---

## Configuration

Create a `.env` file in the project root:

```
VITE_API_URL=http://localhost:5312
```

This should point to your running Seamless Auth API instance.

---

## Docker

The dashboard is designed to run alongside the API in a containerized setup.

For development:

```
docker compose up --build
```

In production, the dashboard is built as static assets and served by nginx.

---

## Project Structure

```
src/
  components/
  pages/
  hooks/
  lib/
```

- components: reusable UI elements
- pages: top-level views
- hooks: data fetching and mutations
- lib: utilities and shared logic

---

## Design Notes

The dashboard follows a few principles:

- Keep state in the URL where possible
- Treat charts as entry points into deeper views
- Prefer simple components over heavy abstractions
- Keep API contracts strict and predictable

These choices make it easier to reason about behavior and debug issues.

---

## Use Case

This dashboard is built for teams that want to run authentication as part of their own stack.

Instead of delegating identity to an external provider, Seamless Auth allows you to:

- own your user data
- control your authentication flows
- integrate directly with your infrastructure

The dashboard provides the interface needed to operate that system effectively.

---

## Status

The project is functional and intended for real use. The current focus is on refinement, consistency, and documentation.

Future improvements will focus on better visualization, alerting, and operator workflows.

---

## License

AGPL-3.0

---

## Notes

This dashboard is one part of a larger system. The API and supporting services form the core of Seamless Auth. The dashboard exists to make that system usable in practice.
