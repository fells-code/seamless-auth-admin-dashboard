/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { AuthEventType } from "@seamless-auth/types";

const LABELS: Partial<Record<AuthEventType, string>> = {
  account_recovery_cancelled: "Account recovery cancelled",
  account_recovery_completed: "Account recovery completed",
  account_recovery_failed: "Account recovery failed",
  account_recovery_started: "Account recovery started",
  account_recovery_verified: "Account recovery verified",
  admin_last_admin_change_refused: "Last admin change refused",
  break_glass_enrollment: "Break-glass enrollment",
  break_glass_sign_in: "Break-glass sign-in",
  oidc_account_notice_failed: "Application account notice failed",
  oidc_account_notice_sent: "Application account notice sent",
  policy_draft_discarded: "Policy draft discarded",
  policy_draft_saved: "Policy draft saved",
  policy_dry_run: "Policy dry run",
  policy_published: "Policy published",
  policy_rolled_back: "Policy rolled back",
  recovery_code_failed: "Recovery code failed",
  recovery_code_used: "Recovery code used",
  recovery_codes_generated: "Recovery codes generated",
  session_evicted: "Session evicted",
  step_up_challenge: "Step-up challenge",
  step_up_failed: "Step-up failed",
  step_up_success: "Step-up succeeded",
  step_up_suspicious: "Suspicious step-up",
};

const WORDS: Record<string, string> = {
  aaguid: "AAGUID",
  jwks: "JWKS",
  mfa: "MFA",
  oauth: "OAuth",
  oidc: "OIDC",
  otp: "OTP",
  totp: "TOTP",
  webauthn: "WebAuthn",
};

/**
 * A readable name for an event type. Takes a plain string because stored events
 * can carry types this build does not know, which still get a readable name.
 */
export function getEventLabel(type: string): string {
  const known = LABELS[type as AuthEventType];
  if (known) return known;

  const words = type
    .split("_")
    .filter(Boolean)
    .map((word) => WORDS[word] ?? word);

  if (words.length === 0) return type;

  const [first, ...rest] = words;
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" ");
}

const HIGH_SEVERITY_TYPES = new Set<string>([
  "break_glass_enrollment",
  "break_glass_sign_in",
] satisfies AuthEventType[]);

/**
 * The audit model has no severity column, so the API marks high-severity events
 * with `metadata.severity`. Break-glass events count as high even without it,
 * so a row written before the field existed is not understated.
 */
export function isHighSeverityEvent(
  type: string,
  metadata?: Record<string, unknown> | null,
): boolean {
  return HIGH_SEVERITY_TYPES.has(type) || metadata?.severity === "high";
}
