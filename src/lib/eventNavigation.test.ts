/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import { buildEventQuery } from "./eventNavigation";

describe("buildEventQuery", () => {
  it("builds an event link with all supported filters", () => {
    expect(
      buildEventQuery({
        type: "login_failed",
        from: "2026-04-20T10:00:00.000Z",
        to: "2026-04-21T10:00:00.000Z",
      }),
    ).toBe(
      "/events?type=login_failed&from=2026-04-20T10%3A00%3A00.000Z&to=2026-04-21T10%3A00%3A00.000Z",
    );
  });

  it("returns the base events path when no filters are provided", () => {
    expect(buildEventQuery({})).toBe("/events?");
  });
});
