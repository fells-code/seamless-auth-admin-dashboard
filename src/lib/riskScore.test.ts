/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import { calculateRiskScore } from "./riskScore";

describe("calculateRiskScore", () => {
  it("returns low risk for small signal counts", () => {
    expect(
      calculateRiskScore({ suspiciousEvents: 1, failedLogins: 1 }),
    ).toEqual({
      level: "LOW",
      color: "green",
    });
  });

  it("returns medium risk for elevated signal counts", () => {
    expect(
      calculateRiskScore({ suspiciousEvents: 2, failedLogins: 1 }),
    ).toEqual({
      level: "MEDIUM",
      color: "yellow",
    });
  });

  it("returns high risk for severe signal counts", () => {
    expect(
      calculateRiskScore({ suspiciousEvents: 5, failedLogins: 2 }),
    ).toEqual({
      level: "HIGH",
      color: "red",
    });
  });
});
