/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { AuthenticatorPolicy, LoginMethod } from "@seamless-auth/types";

export const LOGIN_METHOD_OPTIONS: {
  value: LoginMethod;
  label: string;
  description: string;
}[] = [
  {
    value: "passkey",
    label: "Passkeys",
    description:
      "WebAuthn passkey login for users with registered credentials.",
  },
  {
    value: "magic_link",
    label: "Magic Links",
    description: "Email sign-in links for passwordless login fallback.",
  },
  {
    value: "email_otp",
    label: "Email OTP",
    description: "One-time email codes after login initiation.",
  },
  {
    value: "phone_otp",
    label: "SMS OTP",
    description: "One-time SMS codes after login initiation.",
  },
  {
    value: "oauth",
    label: "OAuth",
    description: "External identity providers such as Google or GitHub.",
  },
];

/**
 * Mirrors `DefaultAuthenticatorPolicy` from `@seamless-auth/types`.
 *
 * Restated rather than imported so the bundle keeps only the type, and used
 * solely so a deployment whose API predates one of these fields still renders
 * controlled inputs instead of switching them to uncontrolled.
 */
export const AUTHENTICATOR_POLICY_FALLBACK: AuthenticatorPolicy = {
  attachment: "any",
  userVerification: "required",
  attestation: "none",
  requireKnownAuthenticator: false,
  syncedPasskeys: "allow",
  aaguidAllowList: [],
  aaguidDenyList: [],
};

export const SYNCED_PASSKEY_OPTIONS: {
  value: "allow" | "block";
  label: string;
}[] = [
  { value: "allow", label: "Allow (default)" },
  { value: "block", label: "Block" },
];

export const ATTACHMENT_OPTIONS: {
  value: AuthenticatorPolicy["attachment"];
  label: string;
}[] = [
  { value: "any", label: "Any (default)" },
  { value: "platform", label: "Platform, built into the device" },
  { value: "cross-platform", label: "Cross-platform, roaming security keys" },
];

export const USER_VERIFICATION_OPTIONS: {
  value: AuthenticatorPolicy["userVerification"];
  label: string;
}[] = [
  { value: "required", label: "Required (default)" },
  { value: "preferred", label: "Preferred" },
  { value: "discouraged", label: "Discouraged" },
];

export const ATTESTATION_OPTIONS: {
  value: AuthenticatorPolicy["attestation"];
  label: string;
}[] = [
  { value: "none", label: "None (default)" },
  {
    value: "direct",
    label: "Direct, ask the authenticator to identify itself",
  },
];

// An AAGUID is a UUID. A mistyped one is not rejected anywhere, it simply never
// matches an authenticator, so the shape is checked before it can be staged.
export const AAGUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const controlClassName =
  "w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60";
