/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

export type EventCategory = {
  label: string;
  value: string;
  match: (type: string) => boolean;
};

export type EventCount = {
  type: string;
  count: number;
};

export type EventCategoryCount = {
  type: string;
  label: string;
  count: number;
};

const exact = (types: string[]) => {
  const values = new Set(types);

  return (type: string) => values.has(type);
};

const startsWithAny = (prefixes: string[]) => (type: string) =>
  prefixes.some((prefix) => type.startsWith(prefix));

const isSuspicious = (type: string) => type.includes("suspicious");

export const eventCategories: EventCategory[] = [
  {
    label: "Security",
    value: "security",
    match: (type) => isSuspicious(type) || type === "request_suspicious",
  },
  {
    label: "Login",
    value: "login",
    match: exact(["login_challenge", "login_failed", "login_success"]),
  },
  {
    label: "OAuth",
    value: "oauth",
    match: startsWithAny(["oauth_"]),
  },
  {
    label: "Passkeys",
    value: "webauthn",
    match: startsWithAny(["webauthn_"]),
  },
  {
    label: "Magic Links",
    value: "magicLink",
    match: startsWithAny(["magic_link_"]),
  },
  {
    label: "OTP",
    value: "otp",
    match: startsWithAny(["otp_", "recovery_otp_", "verify_otp_"]),
  },
  {
    label: "TOTP / MFA",
    value: "totp",
    match: startsWithAny(["mfa_otp_", "totp_"]),
  },
  {
    label: "Step-Up",
    value: "stepUp",
    match: startsWithAny(["step_up_"]),
  },
  {
    label: "Registration",
    value: "registration",
    match: startsWithAny(["registration_"]),
  },
  {
    label: "Session Tokens",
    value: "token",
    match: startsWithAny(["bearer_token_", "refresh_token_"]),
  },
  {
    label: "Service Tokens",
    value: "serviceToken",
    match: startsWithAny(["service_token_"]),
  },
  {
    label: "Logout",
    value: "logout",
    match: startsWithAny(["logout_"]),
  },
  {
    label: "User Admin",
    value: "user",
    match: exact([
      "credentials_deleted",
      "internal_user_updated_by_owner",
      "user_created",
      "user_data_failed",
      "user_data_success",
      "user_deleted",
    ]),
  },
  {
    label: "System Config",
    value: "system",
    match: startsWithAny(["system_config_"]),
  },
  {
    label: "Bootstrap",
    value: "bootstrap",
    match: startsWithAny(["bootstrap_admin_"]),
  },
  {
    label: "JWKS",
    value: "jwks",
    match: startsWithAny(["jwks_"]),
  },
  {
    label: "Notifications",
    value: "notification",
    match: exact(["notification_sent", "notication_sent"]),
  },
  {
    label: "Operations",
    value: "operation",
    match: exact(["auth_action_incremented", "informational"]),
  },
];

export const otherEventCategory: EventCategory = {
  label: "Other",
  value: "other",
  match: () => false,
};

export function getEventCategory(type: string) {
  return (
    eventCategories.find((category) => category.match(type)) ??
    otherEventCategory
  );
}

export function categorizeEventSummary(
  summary: EventCount[],
): EventCategoryCount[] {
  const counts = new Map<string, number>();

  for (const category of [...eventCategories, otherEventCategory]) {
    counts.set(category.value, 0);
  }

  for (const item of summary) {
    const category = getEventCategory(item.type);
    counts.set(category.value, (counts.get(category.value) ?? 0) + item.count);
  }

  return [...eventCategories, otherEventCategory]
    .map((category) => ({
      type: category.value,
      label: category.label,
      count: counts.get(category.value) ?? 0,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
}
