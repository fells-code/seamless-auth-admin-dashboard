/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import { getActiveSessionCount, isSessionActive } from "./sessionActivity";

describe("isSessionActive", () => {
  const referenceNow = new Date("2026-07-29T06:00:00.000Z").getTime();

  it("returns true for a session whose expiry is still in the future", () => {
    expect(
      isSessionActive({ expiresAt: "2026-07-29T06:00:01.000Z" }, referenceNow),
    ).toBe(true);
  });

  it("returns false for an expired session", () => {
    expect(
      isSessionActive({ expiresAt: "2026-07-29T05:59:59.000Z" }, referenceNow),
    ).toBe(false);
  });

  it("returns false for an invalid expiry", () => {
    expect(isSessionActive({ expiresAt: "not-a-date" }, referenceNow)).toBe(
      false,
    );
  });
});

describe("getActiveSessionCount", () => {
  it("excludes expired sessions from the active count", () => {
    const referenceNow = new Date("2026-07-29T06:00:00.000Z").getTime();

    expect(
      getActiveSessionCount(
        [
          { expiresAt: "2026-07-29T06:05:00.000Z" },
          { expiresAt: "2026-07-29T06:10:00.000Z" },
          { expiresAt: "2026-07-29T05:55:00.000Z" },
        ],
        referenceNow,
      ),
    ).toBe(2);
  });
});
