/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import { getActiveEventFilterCount } from "./eventFilters";

describe("getActiveEventFilterCount", () => {
  it("does not count the default range as an active filter", () => {
    expect(
      getActiveEventFilterCount({
        type: [],
        range: "24h",
      }),
    ).toBe(0);
  });

  it("counts non-default relative ranges as one active filter", () => {
    expect(
      getActiveEventFilterCount({
        type: [],
        range: "7d",
      }),
    ).toBe(1);
  });

  it("counts a custom range as one active filter instead of two bounds", () => {
    expect(
      getActiveEventFilterCount({
        type: [],
        range: "custom",
        from: "2026-07-01T00:00",
        to: "2026-07-08T00:00",
      }),
    ).toBe(1);
  });

  it("counts explicit URL bounds as one active filter", () => {
    expect(
      getActiveEventFilterCount({
        type: ["login_failed", "session_created"],
        range: "24h",
        from: "2026-07-01T00:00",
      }),
    ).toBe(3);
  });
});
