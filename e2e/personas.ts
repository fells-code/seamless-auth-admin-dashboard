/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { MeUser } from "@seamless-auth/types";
import type { MockApi } from "./mockApi";
import {
  makeAnomaly,
  makeCredential,
  makeDashboardMetrics,
  makeEvent,
  makeEventSummary,
  makeFunnelMetrics,
  makeSignInMetrics,
  makeLoginStats,
  makeMembership,
  makeMeUser,
  makeOrganization,
  makeSession,
  makeStepUpStatus,
  makeSystemConfig,
  makeTimeseries,
  makeUser,
} from "./factories";

export type PersonaName = "unauthenticated" | "readAdmin" | "writeAdmin";

export const PERSONA_ROLES: Record<
  Exclude<PersonaName, "unauthenticated">,
  string[]
> = {
  readAdmin: ["admin:read"],
  writeAdmin: ["admin:write"],
};

/**
 * A working deployment behind every endpoint the dashboard reads.
 *
 * Seeded before each test so a feature spec only declares the responses it is
 * actually about. Registrations are matched last-first, so any of these can be
 * replaced by re-registering the same method and path.
 */
export function seedDeployment(api: MockApi) {
  const users = [
    makeUser({ id: "user_1", email: "ada@example.com", roles: ["user"] }),
    makeUser({
      id: "user_2",
      email: "grace@example.com",
      roles: ["admin:read"],
      phone: null,
    }),
  ];
  const sessions = [
    makeSession({ id: "session_1", ipAddress: "203.0.113.10" }),
    makeSession({ id: "session_2", ipAddress: "203.0.113.11" }),
  ];
  const events = [
    makeEvent({ id: "event_1", type: "login_success", user_id: "user_1" }),
    makeEvent({ id: "event_2", type: "login_failed", user_id: "user_1" }),
  ];
  const organizations = [
    makeOrganization({ id: "org_1", name: "Acme Corp", slug: "acme-corp" }),
  ];

  // Users
  api.get("/admin/users", { json: { users, total: users.length } });
  api.post("/admin/users", ({ payload }) =>
    makeUser(payload as Record<string, never>),
  );
  api.get("/admin/users/:userId", ({ params }) => ({
    user: users.find((user) => user.id === params.userId) ?? users[0],
    sessions,
    credentials: [makeCredential()],
    events,
  }));
  api.patch("/admin/users/:userId", ({ params, payload }) =>
    makeUser({ id: params.userId, ...(payload as object) }),
  );
  api.delete("/admin/users", { json: { message: "User deleted" } });
  api.get("/admin/users/:userId/anomalies", {
    json: { suspiciousEvents: [], relatedIps: [], relatedAgents: [] },
  });
  api.post(
    "/admin/users/:userId/recovery/device-replacement",
    ({ params }) => ({
      userId: params.userId,
      revokedSessions: 2,
      removedCredentials: 1,
      disabledTotpCredentials: 0,
    }),
  );

  // Sessions
  api.get("/admin/sessions", { json: { sessions, total: sessions.length } });
  api.delete("/admin/sessions/by-id/:id", { json: { message: "Revoked" } });
  api.delete("/admin/sessions/:userId/revoke-all", { json: { revoked: 2 } });

  // Organizations
  api.get("/admin/organizations", {
    json: { organizations, total: organizations.length },
  });
  api.post("/admin/organizations", ({ payload }) => ({
    organization: makeOrganization(payload as object),
  }));
  api.get("/admin/organizations/:organizationId", ({ params }) => ({
    organization:
      organizations.find((org) => org.id === params.organizationId) ??
      organizations[0],
  }));
  api.patch("/admin/organizations/:organizationId", ({ params, payload }) => ({
    organization: makeOrganization({
      id: params.organizationId,
      ...(payload as object),
    }),
  }));
  api.get("/admin/organizations/:organizationId/members", {
    json: { members: [makeMembership({ id: "membership_1" })], total: 1 },
  });
  api.post("/admin/organizations/:organizationId/members", ({ payload }) => ({
    membership: makeMembership(payload as object),
  }));
  api.patch(
    "/admin/organizations/:organizationId/members/:userId",
    ({ params, payload }) => ({
      membership: makeMembership({
        userId: params.userId,
        ...(payload as object),
      }),
    }),
  );
  api.delete("/admin/organizations/:organizationId/members/:userId", {
    json: { message: "Member removed" },
  });

  // Events and metrics
  api.get("/admin/auth-events", { json: { events, total: events.length } });
  api.get("/internal/metrics/dashboard", { json: makeDashboardMetrics() });
  api.get("/internal/auth-events/timeseries", { json: makeTimeseries() });
  api.get("/internal/auth-events/summary", { json: makeEventSummary() });
  api.get("/internal/auth-events/login-stats", { json: makeLoginStats() });
  api.get("/internal/metrics/funnel", { json: makeFunnelMetrics() });
  api.get("/internal/metrics/sign-ins", { json: makeSignInMetrics() });
  api.get("/internal/security/anomalies", {
    json: { suspiciousEvents: [makeAnomaly({ id: "anomaly_1" })], total: 1 },
  });

  // System configuration
  api.get("/system-config/admin", { json: makeSystemConfig() });
  api.patch("/system-config/admin", ({ payload }) => ({
    config: makeSystemConfig(payload as object),
  }));
  api.get("/system-config/roles", {
    json: { roles: ["user", "admin:read", "admin:write"] },
  });
  api.post("/system-config/oauth-providers", ({ payload }) => ({
    provider: payload,
  }));
  api.patch("/system-config/oauth-providers/:id", ({ payload }) => ({
    provider: payload,
  }));
  api.delete("/system-config/oauth-providers/:id", ({ params }) => ({
    id: params.id,
  }));
  api.get("/system-config/public", {
    json: {
      login_methods: ["passkey", "magic_link", "email_otp", "phone_otp"],
      passkey_login_fallback_enabled: true,
    },
  });

  // SDK surface the shell touches on load
  api.get("/oauth/providers", { json: { providers: [] } });
  api.get("/totp/status", { json: { enabled: false } });
  api.post("/logout", { json: { message: "Signed out" } });
  api.delete("/logout", { json: { message: "Signed out" } });
}

/**
 * Seeds the session state the dashboard reads on load.
 *
 * `GET /auth/users/me` is what the SDK bootstraps from, so answering it is what
 * makes a protected route render without driving a sign-in each time. Step-up
 * is reported fresh so a write persona's mutations are not gated behind a
 * WebAuthn ceremony; the specs that are about step-up override it.
 */
export function seedPersona(
  api: MockApi,
  persona: PersonaName,
  overrides: Partial<MeUser> = {},
) {
  if (persona === "unauthenticated") {
    api.get("/users/me", { status: 401, json: { error: "Unauthorized" } });
    api.get("/step-up/status", {
      status: 401,
      json: { error: "Unauthorized" },
    });
    return;
  }

  api.get("/users/me", {
    json: {
      user: makeMeUser({ roles: PERSONA_ROLES[persona], ...overrides }),
      credentials: [makeCredential({ id: "credential_admin" })],
      organizations: [],
      activeOrganization: null,
    },
  });

  api.get("/step-up/status", { json: makeStepUpStatus() });
}
