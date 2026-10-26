/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { PolicyDocument, PolicyVersion } from "@seamless-auth/types";

export function makePolicy(
  overrides: Partial<PolicyDocument> = {},
): PolicyDocument {
  return {
    login_methods: ["passkey", "magic_link"],
    passkey_login_fallback_enabled: true,
    phishing_resistant_only: false,
    prompt_passkey_enrollment: false,
    authenticator_policy: {
      attachment: "any",
      userVerification: "required",
      attestation: "none",
      requireKnownAuthenticator: false,
      syncedPasskeys: "allow",
      aaguidAllowList: [],
      aaguidDenyList: [],
    },
    lockout_policy: {
      enabled: true,
      maxFailures: 10,
      windowSeconds: 900,
      lockoutSeconds: 900,
    },
    recovery_codes: { enabled: true, requireAtEnrollment: false },
    account_recovery: { enabled: false, delay: "24h" },
    ...overrides,
  };
}

export function makePolicyVersion(
  overrides: Partial<PolicyVersion> = {},
): PolicyVersion {
  return {
    version: 1,
    policy: makePolicy(),
    source: "bootstrap",
    publishedAt: "2026-10-01T12:00:00.000Z",
    publishedBy: null,
    ...overrides,
  };
}
