/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";

import { getMagicLinkConfirmation } from "./magicLinkConfirmation";

const conflict = (requestedFrom: unknown) => ({
  status: 409,
  body: { error: "confirmation_required", message: "Confirm", requestedFrom },
});

describe("getMagicLinkConfirmation", () => {
  it("reads the requesting device and time from a 409", () => {
    expect(
      getMagicLinkConfirmation(
        conflict({
          deviceClass: "macos",
          requestedAt: "2026-10-18T12:00:00.000Z",
        }),
      ),
    ).toEqual({
      deviceLabel: "a Mac",
      requestedAt: new Date("2026-10-18T12:00:00.000Z"),
    });
  });

  it("falls back to an unknown device and no time when the details are missing", () => {
    expect(
      getMagicLinkConfirmation(
        conflict({ deviceClass: "toaster", requestedAt: "soon" }),
      ),
    ).toEqual({
      deviceLabel: "an unknown device",
      requestedAt: null,
    });
  });

  it("ignores every other error", () => {
    expect(getMagicLinkConfirmation(null)).toBeNull();
    expect(getMagicLinkConfirmation(new Error("expired"))).toBeNull();
    expect(
      getMagicLinkConfirmation({ status: 400, body: { error: "Invalid" } }),
    ).toBeNull();
    expect(
      getMagicLinkConfirmation({ status: 409, body: { error: "other" } }),
    ).toBeNull();
  });
});
