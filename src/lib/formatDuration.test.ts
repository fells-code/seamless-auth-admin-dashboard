/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import { formatDuration } from "./formatDuration";

describe("formatDuration", () => {
  it("keeps a decimal under ten seconds, where passkey sign-ins live", () => {
    expect(formatDuration(0.84)).toBe("0.8s");
    expect(formatDuration(6.4)).toBe("6.4s");
  });

  it("rounds to whole seconds under a minute", () => {
    expect(formatDuration(41.6)).toBe("42s");
  });

  it("splits minutes and seconds", () => {
    expect(formatDuration(84.2)).toBe("1m 24s");
    expect(formatDuration(120)).toBe("2m");
  });

  it("splits hours and minutes", () => {
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(5400)).toBe("1h 30m");
  });

  it("splits days and hours", () => {
    expect(formatDuration(86400)).toBe("1d");
    expect(formatDuration(86400 + 4 * 3600)).toBe("1d 4h");
  });

  it("reads null as not available rather than as zero", () => {
    // The API sends null when there was nothing to measure. Rendering it as
    // "0.0s" would claim a registration finished instantly.
    expect(formatDuration(null)).toBe("n/a");
    expect(formatDuration(undefined)).toBe("n/a");
    expect(formatDuration(Number.NaN)).toBe("n/a");
    expect(formatDuration(-1)).toBe("n/a");
  });
});
