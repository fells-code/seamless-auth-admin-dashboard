/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import { AUTH_EVENT_TYPES } from "@seamless-auth/types";
import { getEventLabel, isHighSeverityEvent } from "./eventLabels";

describe("getEventLabel", () => {
  it("names the v0.20 event types", () => {
    expect(getEventLabel("break_glass_sign_in")).toBe("Break-glass sign-in");
    expect(getEventLabel("break_glass_enrollment")).toBe(
      "Break-glass enrollment",
    );
    expect(getEventLabel("policy_rolled_back")).toBe("Policy rolled back");
    expect(getEventLabel("account_recovery_verified")).toBe(
      "Account recovery verified",
    );
    expect(getEventLabel("step_up_success")).toBe("Step-up succeeded");
  });

  it("names the account notices an application sends", () => {
    expect(getEventLabel("oidc_account_notice_sent")).toBe(
      "Application account notice sent",
    );
    expect(getEventLabel("oidc_account_notice_failed")).toBe(
      "Application account notice failed",
    );
  });

  it("derives a readable name for other types, keeping acronyms", () => {
    expect(getEventLabel("oidc_token_issued")).toBe("OIDC token issued");
    expect(getEventLabel("login_success")).toBe("Login success");
    expect(getEventLabel("mfa_otp_failed")).toBe("MFA OTP failed");
    expect(getEventLabel("oauth_login_started")).toBe("OAuth login started");
    expect(getEventLabel("webauthn_registration_challenge")).toBe(
      "WebAuthn registration challenge",
    );
  });

  it("names a type this build has never heard of", () => {
    expect(getEventLabel("future_thing_happened")).toBe(
      "Future thing happened",
    );
  });

  it("gives every known type a label without underscores", () => {
    for (const type of AUTH_EVENT_TYPES) {
      expect(getEventLabel(type)).not.toContain("_");
    }
  });
});

describe("isHighSeverityEvent", () => {
  it("treats break-glass sign-ins and enrollments as high severity", () => {
    expect(isHighSeverityEvent("break_glass_sign_in")).toBe(true);
    expect(isHighSeverityEvent("break_glass_enrollment", null)).toBe(true);
  });

  it("honours the severity the API records in metadata", () => {
    expect(isHighSeverityEvent("informational", { severity: "high" })).toBe(
      true,
    );
  });

  it("leaves ordinary events alone", () => {
    expect(isHighSeverityEvent("login_success", {})).toBe(false);
    expect(isHighSeverityEvent("policy_published")).toBe(false);
  });
});
