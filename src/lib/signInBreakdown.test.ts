/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import type { SignInBreakdownRow } from "../hooks/useSignInMetrics";
import { describeDropOff, labelFor, pivotBreakdown } from "./signInBreakdown";

const rows: SignInBreakdownRow[] = [
  {
    method: "passkey",
    deviceClass: "ios",
    mailProvider: "gmail",
    owner: false,
    success: 40,
    failed: 2,
  },
  {
    method: "passkey",
    deviceClass: "windows",
    mailProvider: "gmail",
    owner: true,
    success: 3,
    failed: 3,
  },
  {
    method: "magic_link",
    deviceClass: "ios",
    mailProvider: "other",
    owner: false,
    success: 9,
    failed: 1,
  },
  {
    method: "otp",
    deviceClass: null,
    mailProvider: null,
    owner: null,
    success: 1,
    failed: 1,
  },
];

describe("pivotBreakdown", () => {
  it("sums the flat rows over one dimension, busiest first", () => {
    expect(pivotBreakdown(rows, "method")).toEqual([
      {
        key: "passkey",
        label: "Passkey",
        success: 43,
        failed: 5,
        total: 48,
        rate: 43 / 48,
      },
      {
        key: "magic_link",
        label: "Magic link",
        success: 9,
        failed: 1,
        total: 10,
        rate: 0.9,
      },
      {
        key: "otp",
        label: "One-time code",
        success: 1,
        failed: 1,
        total: 2,
        rate: 0.5,
      },
    ]);
  });

  it("folds the same rows differently for each dimension", () => {
    expect(pivotBreakdown(rows, "deviceClass").map((e) => e.label)).toEqual([
      "iOS",
      "Windows",
      "Unknown",
    ]);
    expect(pivotBreakdown(rows, "mailProvider").map((e) => e.total)).toEqual([
      48, 10, 2,
    ]);
  });

  // A row written before the column existed, or whose subject was not known,
  // still holds attempts. Dropping it would make the rates look better than
  // they are.
  it("keeps rows with a null dimension as unknown rather than dropping them", () => {
    const [, , unknown] = pivotBreakdown(rows, "deviceClass");

    expect(unknown).toMatchObject({ key: "", label: "Unknown", total: 2 });
  });

  it("orders ties by label so the list is stable between refreshes", () => {
    const tied: SignInBreakdownRow[] = [
      { ...rows[0]!, deviceClass: "linux", success: 1, failed: 0 },
      { ...rows[0]!, deviceClass: "android", success: 1, failed: 0 },
    ];

    expect(pivotBreakdown(tied, "deviceClass").map((e) => e.label)).toEqual([
      "Android",
      "Linux",
    ]);
  });

  it("answers an empty breakdown with no entries", () => {
    expect(pivotBreakdown([], "method")).toEqual([]);
  });
});

describe("labelFor", () => {
  it("names the classes it knows and passes through the ones it does not", () => {
    expect(labelFor("macos")).toBe("macOS");
    expect(labelFor("bot")).toBe("Bots and scanners");
    expect(labelFor("other")).toBe("Other domains");
    expect(labelFor(null)).toBe("Unknown");
    // A class a newer server added is shown as itself rather than hidden.
    expect(labelFor("visionos")).toBe("visionos");
  });
});

describe("describeDropOff", () => {
  it("reads the two gaps out of the step counts", () => {
    expect(
      describeDropOff({
        started: 60,
        delivered: 20,
        presented: 55,
        completed: 48,
      }),
    ).toEqual({ abandoned: 5, stopped: 7 });
  });

  // The window cuts across attempts, so a later step can exceed an earlier one
  // at the edges. Negative people are not a thing.
  it("clamps at zero when the window cuts an attempt in half", () => {
    expect(
      describeDropOff({
        started: 2,
        delivered: 0,
        presented: 4,
        completed: 5,
      }),
    ).toEqual({ abandoned: 0, stopped: 0 });
  });
});
