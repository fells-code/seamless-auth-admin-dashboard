/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/lib/eventGroups.ts

const isSuspicious = (t: string) => t.includes("suspicious");

export const eventGroups = [
  {
    label: "All",
    value: "",
    match: () => true,
  },

  {
    label: "Login",
    value: "login",
    match: (t: string) => t.startsWith("login") && !isSuspicious(t),
  },

  {
    label: "WebAuthn",
    value: "webauthn",
    match: (t: string) => t.startsWith("webauthn") && !isSuspicious(t),
  },

  {
    label: "OTP",
    value: "otp",
    match: (t: string) => t.includes("otp") && !isSuspicious(t),
  },

  {
    label: "Tokens",
    value: "token",
    match: (t: string) => t.includes("token") && !isSuspicious(t),
  },

  {
    label: "Security",
    value: "security",
    match: (t: string) => isSuspicious(t) || t === "request_suspicious",
  },
];
