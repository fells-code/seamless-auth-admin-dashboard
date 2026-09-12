/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type {
  ApiUser,
  AuthEvent,
  CredentialResponse,
  MeUser,
  Organization,
  OrganizationMembership,
  PartialAuthEvent,
  Session,
  StepUpStatus,
  SystemConfig,
} from "@seamless-auth/types";

/**
 * Deterministic builders for every entity the dashboard reads.
 *
 * Fixed timestamps rather than `Date.now()`: a relative clock makes "2h ago"
 * assertions flake at bucket boundaries, and the app's own time formatting is
 * covered by unit tests. `NOW` is frozen in each test's page clock so relative
 * copy stays stable.
 */
export const NOW = new Date("2026-06-15T12:00:00.000Z");

export function isoOffset(ms: number): string {
  return new Date(NOW.getTime() + ms).toISOString();
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

let sequence = 0;

/** Stable within a test, unique across calls, so ids never collide by accident. */
function nextId(prefix: string) {
  sequence += 1;
  return `${prefix}_${sequence}`;
}

export function resetFactorySequence() {
  sequence = 0;
}

export function makeUser(overrides: Partial<ApiUser> = {}): ApiUser {
  return {
    id: nextId("user"),
    email: "ada@example.com",
    phone: "+15550000000",
    roles: ["user"],
    emailVerified: true,
    phoneVerified: true,
    verified: true,
    lastLogin: isoOffset(-2 * HOUR),
    createdAt: isoOffset(-30 * DAY),
    updatedAt: isoOffset(-2 * HOUR),
    ...overrides,
  };
}

export function makeMeUser(overrides: Partial<MeUser> = {}): MeUser {
  return {
    id: "user_admin",
    email: "admin@example.com",
    phone: null,
    roles: ["admin:write"],
    lastLogin: isoOffset(-1 * HOUR),
    activeOrganizationId: null,
    ...overrides,
  };
}

export function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: nextId("session"),
    deviceName: "MacBook Pro",
    ipAddress: "203.0.113.10",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    lastUsedAt: isoOffset(-10 * MINUTE),
    expiresAt: isoOffset(7 * DAY),
    current: false,
    ...overrides,
  };
}

export function makeSessions(count: number, overrides: Partial<Session> = {}) {
  return Array.from({ length: count }, (_, index) =>
    makeSession({
      ipAddress: `203.0.113.${index + 1}`,
      ...overrides,
    }),
  );
}

export function makeEvent(overrides: Partial<AuthEvent> = {}): AuthEvent {
  return {
    id: nextId("event"),
    user_id: "user_1",
    actor_user_id: null,
    session_id: null,
    type: "login_success",
    ip_address: "203.0.113.10",
    user_agent: "Mozilla/5.0 Chrome/124.0.0.0",
    metadata: null,
    created_at: isoOffset(-30 * MINUTE),
    updated_at: isoOffset(-30 * MINUTE),
    ...overrides,
  };
}

export function makeAnomaly(
  overrides: Partial<PartialAuthEvent> = {},
): PartialAuthEvent {
  return {
    id: nextId("anomaly"),
    user_id: "user_1",
    type: "login_failed",
    ip_address: "198.51.100.7",
    user_agent: "curl/8.4.0",
    created_at: isoOffset(-15 * MINUTE),
    ...overrides,
  };
}

export function makeCredential(
  overrides: Partial<CredentialResponse> = {},
): CredentialResponse {
  return {
    id: nextId("credential"),
    aaguid: "adce0002-35bc-c60a-648b-0b25f1f05503",
    transports: ["internal"],
    deviceType: "singleDevice",
    backedUp: false,
    backedup: false,
    counter: 4,
    friendlyName: "MacBook Touch ID",
    lastUsedAt: isoOffset(-1 * HOUR),
    platform: "macOS",
    browser: "Chrome",
    deviceInfo: "MacBook Pro",
    createdAt: isoOffset(-20 * DAY),
    ...overrides,
  };
}

export function makeOrganization(
  overrides: Partial<Organization> = {},
): Organization {
  return {
    id: nextId("org"),
    name: "Acme Corp",
    slug: "acme-corp",
    createdByUserId: "user_admin",
    metadata: null,
    createdAt: isoOffset(-90 * DAY),
    updatedAt: isoOffset(-1 * DAY),
    memberCount: 2,
    ...overrides,
  };
}

export function makeMembership(
  overrides: Partial<OrganizationMembership> = {},
): OrganizationMembership {
  return {
    id: nextId("membership"),
    organizationId: "org_1",
    userId: "user_1",
    roles: ["member"],
    scopes: [],
    createdAt: isoOffset(-30 * DAY),
    updatedAt: isoOffset(-1 * DAY),
    user: {
      id: "user_1",
      email: "ada@example.com",
      phone: null,
      roles: ["user"],
    },
    ...overrides,
  };
}

export function makeStepUpStatus(
  overrides: Partial<StepUpStatus> = {},
): StepUpStatus {
  return {
    fresh: true,
    method: "webauthn",
    verifiedAt: isoOffset(-1 * MINUTE),
    expiresAt: isoOffset(10 * MINUTE),
    maxAgeSeconds: 600,
    ...overrides,
  };
}

export function makeDashboardMetrics(overrides: Record<string, number> = {}) {
  return {
    totalUsers: 128,
    activeSessions: 42,
    newUsers24h: 7,
    loginSuccess24h: 900,
    loginFailed24h: 100,
    successRate24h: 0.9,
    otpUsage24h: 30,
    passkeyUsage24h: 640,
    databaseSize: 5_242_880,
    ...overrides,
  };
}

/** Hourly buckets ending at NOW, so the line chart always has a real shape. */
export function makeTimeseries(points = 6) {
  return {
    timeseries: Array.from({ length: points }, (_, index) => ({
      bucket: isoOffset(-(points - index) * HOUR),
      success: 40 + index * 5,
      failed: 4 + (index % 3),
    })),
  };
}

export function makeEventSummary(
  summary: { type: string; count: number }[] = [
    { type: "login_success", count: 900 },
    { type: "login_failed", count: 100 },
    { type: "passkey_registered", count: 40 },
  ],
) {
  return { summary };
}

export function makeLoginStats(
  overrides: Partial<Record<string, number>> = {},
) {
  return { success: 900, failed: 100, successRate: 0.9, ...overrides };
}

export function makeFunnelMetrics() {
  return {
    timeToRegistration: { count: 412, medianSeconds: 84.2, p90Seconds: 260.5 },
    timeToLogin: { count: 3188, medianSeconds: 6.4, p90Seconds: 41 },
    passkeyAdoption: { users: 512, withPasskey: 301, rate: 0.588 },
    timeToFirstPasskey: { count: 301, medianSeconds: 118, p90Seconds: 86400 },
  };
}

export function makeSystemConfig(
  overrides: Partial<SystemConfig> = {},
): SystemConfig {
  return {
    app_name: "Seamless Auth",
    default_roles: ["user"],
    available_roles: ["user", "admin:read", "admin:write"],
    login_methods: ["passkey", "magic_link", "email_otp"],
    passkey_login_fallback_enabled: true,
    oauth_providers: [],
    lockout_policy: {
      enabled: true,
      maxFailures: 10,
      windowSeconds: 900,
      lockoutSeconds: 900,
    },
    authenticator_policy: {
      attachment: "any",
      userVerification: "required",
      attestation: "none",
      requireKnownAuthenticator: false,
      syncedPasskeys: "allow",
      aaguidAllowList: [],
      aaguidDenyList: [],
    },
    access_token_ttl: "15m",
    refresh_token_ttl: "30d",
    rate_limit: 100,
    delay_after: 10,
    rpid: "localhost",
    origins: ["http://localhost:4287"],
    ...overrides,
  } as SystemConfig;
}
