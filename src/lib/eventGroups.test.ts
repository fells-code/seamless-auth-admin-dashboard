/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import { eventGroups } from "./eventGroups";

describe("eventGroups", () => {
  it("includes the expected top-level quick filters", () => {
    expect(eventGroups.map((group) => group.value)).toEqual([
      "",
      "security",
      "login",
      "oauth",
      "webauthn",
      "magicLink",
      "otp",
      "totp",
      "stepUp",
      "registration",
      "token",
      "serviceToken",
      "logout",
      "user",
      "system",
      "bootstrap",
      "jwks",
      "notification",
      "operation",
    ]);
  });

  it("matches login events but excludes suspicious login events", () => {
    const loginGroup = eventGroups.find((group) => group.value === "login");

    expect(loginGroup?.match("login_success")).toBe(true);
    expect(loginGroup?.match("login_suspicious")).toBe(false);
    expect(loginGroup?.match("oauth_login_success")).toBe(false);
  });

  it("matches security-only suspicious activity", () => {
    const securityGroup = eventGroups.find(
      (group) => group.value === "security",
    );

    expect(securityGroup?.match("request_suspicious")).toBe(true);
    expect(securityGroup?.match("login_success")).toBe(false);
  });

  it("matches infrastructure-specific event families", () => {
    const tokenGroup = eventGroups.find((group) => group.value === "token");
    const serviceTokenGroup = eventGroups.find(
      (group) => group.value === "serviceToken",
    );
    const stepUpGroup = eventGroups.find((group) => group.value === "stepUp");

    expect(tokenGroup?.match("refresh_token_failed")).toBe(true);
    expect(serviceTokenGroup?.match("service_token_success")).toBe(true);
    expect(stepUpGroup?.match("step_up_challenge")).toBe(true);
  });
});
