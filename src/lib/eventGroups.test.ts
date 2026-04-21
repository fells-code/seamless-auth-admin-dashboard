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
      "login",
      "webauthn",
      "otp",
      "token",
      "security",
    ]);
  });

  it("matches login events but excludes suspicious login events", () => {
    const loginGroup = eventGroups.find((group) => group.value === "login");

    expect(loginGroup?.match("login_success")).toBe(true);
    expect(loginGroup?.match("login_suspicious")).toBe(false);
  });

  it("matches security-only suspicious activity", () => {
    const securityGroup = eventGroups.find(
      (group) => group.value === "security",
    );

    expect(securityGroup?.match("request_suspicious")).toBe(true);
    expect(securityGroup?.match("login_success")).toBe(false);
  });
});
