/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import { dashboardFigures } from "./dashboardFigures";

const fixed = {
  totalUsers: 40,
  activeSessions: 12,
  databaseSize: 1024,
  newUsers24h: 3,
  loginSuccess24h: 90,
  loginFailed24h: 10,
  successRate24h: 0.9,
  otpUsage24h: 5,
  passkeyUsage24h: 55,
};

describe("dashboardFigures", () => {
  it("uses the ranged figures when the API reports a window", () => {
    expect(
      dashboardFigures({
        ...fixed,
        window: { from: "a", to: "b" },
        newUsers: 21,
        loginSuccess: 700,
        loginFailed: 300,
        successRate: 0.7,
        otpUsage: 40,
        passkeyUsage: 410,
      }),
    ).toEqual({
      ranged: true,
      newUsers: 21,
      loginSuccess: 700,
      loginFailed: 300,
      successRate: 0.7,
      passkeyUsage: 410,
    });
  });

  it("falls back to the fixed 24 hours for an API without ranges", () => {
    expect(dashboardFigures(fixed)).toEqual({
      ranged: false,
      newUsers: 3,
      loginSuccess: 90,
      loginFailed: 10,
      successRate: 0.9,
      passkeyUsage: 55,
    });
  });

  it("reports zeros while nothing has loaded", () => {
    expect(dashboardFigures(undefined)).toEqual(
      expect.objectContaining({ ranged: false, loginSuccess: 0 }),
    );
  });
});
