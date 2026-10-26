/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  POLICY_KEYS,
  type PolicyDocument,
  type PolicyDryRunReason,
  type PolicyKey,
  type PolicyVersionSource,
  type SystemConfig,
} from "@seamless-auth/types";

export const POLICY_KEY_LABELS: Record<PolicyKey, string> = {
  login_methods: "Login methods",
  passkey_login_fallback_enabled: "Passkey fallback",
  phishing_resistant_only: "Phishing-resistant only",
  prompt_passkey_enrollment: "Prompt passkey enrollment",
  authenticator_policy: "Authenticator policy",
  lockout_policy: "Lockout policy",
  recovery_codes: "Recovery codes",
  account_recovery: "Account recovery",
};

export const POLICY_SOURCE_LABELS: Record<PolicyVersionSource, string> = {
  publish: "Published draft",
  rollback: "Rollback",
  config_patch: "System Configuration save",
  bootstrap: "Initial policy",
};

export const DRY_RUN_REASON_LABELS: Record<PolicyDryRunReason, string> = {
  method_disabled: "Method no longer enabled",
  phishing_resistant_required: "Not phishing-resistant",
  fallback_disabled: "Passkey fallback disabled",
  synced_passkey_blocked: "Synced passkey blocked",
  authenticator_not_allowed: "Authenticator not allowed",
  user_verification_required: "User verification required",
};

export type PolicyChange = {
  key: PolicyKey;
  /** The field inside an object-valued key, such as `maxFailures`. */
  field?: string;
  label: string;
  before: string;
  after: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function formatPolicyValue(value: unknown): string {
  if (value === undefined || value === null) return "Not set";
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (Array.isArray(value)) {
    return value.length === 0 ? "None" : value.map(String).join(", ");
  }
  if (isPlainObject(value)) return JSON.stringify(value);
  return String(value);
}

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The changes from `before` to `after`, one row per changed setting. Object
 * valued keys are compared field by field, so a lockout threshold change reads
 * as that one field rather than as two blobs of JSON.
 */
export function diffPolicy(
  before: Partial<PolicyDocument>,
  after: Partial<PolicyDocument>,
): PolicyChange[] {
  const changes: PolicyChange[] = [];

  for (const key of POLICY_KEYS) {
    const a: unknown = before[key];
    const b: unknown = after[key];

    if (same(a, b)) continue;

    if (isPlainObject(a) && isPlainObject(b)) {
      const fields = new Set([...Object.keys(a), ...Object.keys(b)]);

      for (const field of [...fields].sort()) {
        if (same(a[field], b[field])) continue;

        changes.push({
          key,
          field,
          label: POLICY_KEY_LABELS[key],
          before: formatPolicyValue(a[field]),
          after: formatPolicyValue(b[field]),
        });
      }
      continue;
    }

    changes.push({
      key,
      label: POLICY_KEY_LABELS[key],
      before: formatPolicyValue(a),
      after: formatPolicyValue(b),
    });
  }

  return changes;
}

export function touchesPolicy(config: Partial<SystemConfig>): boolean {
  return POLICY_KEYS.some((key) => key in config);
}
