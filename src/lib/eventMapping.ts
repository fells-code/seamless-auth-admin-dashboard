/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/lib/eventTypeMapping.ts

export function collapseTypes(types: string[]): string {
  if (!types || types.length === 0) return "";

  if (types.includes("login_success") || types.includes("login_failed")) {
    return "login";
  }

  if (types.includes("otp_success") || types.includes("otp_failed")) {
    return "otp";
  }

  if (
    types.includes("webauthn_login_success") ||
    types.includes("webauthn_login_failed")
  ) {
    return "webauthn";
  }

  if (
    types.includes("magic_link_success") ||
    types.includes("magic_link_requested")
  ) {
    return "magicLink";
  }

  if (types.some((t) => t.includes("suspicious"))) {
    return "suspicious";
  }

  return types[0]; // fallback
}
