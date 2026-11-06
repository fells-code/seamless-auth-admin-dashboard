/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { describeRefusal, isRouteMissing } from "./roleRefusals";

describe("isRouteMissing", () => {
  it("is true only for an API 404", () => {
    expect(isRouteMissing(new ApiError("Not found", 404))).toBe(true);
    expect(isRouteMissing(new ApiError("Boom", 500))).toBe(false);
    expect(isRouteMissing(new Error("Not found"))).toBe(false);
    expect(isRouteMissing(null)).toBe(false);
  });
});

describe("describeRefusal", () => {
  it("names the roles still granting a permission", () => {
    expect(
      describeRefusal(
        new ApiError("Permission is still granted by a role", 409, undefined, {
          roles: [
            { kind: "organization", name: "billing" },
            { kind: "instance", name: "reports" },
          ],
        }),
      ),
    ).toBe(
      "Permission is still granted by a role: organization role billing, instance role reports. Take it off these roles first.",
    );
  });

  it("names unknown permissions", () => {
    expect(
      describeRefusal(
        new ApiError("Unknown permissions", 400, undefined, {
          permissions: ["ghost:read"],
        }),
      ),
    ).toContain("Unknown permissions: ghost:read");
  });

  it("names unknown organization roles", () => {
    expect(
      describeRefusal(
        new ApiError("Unknown organization roles", 400, undefined, {
          roles: ["ghost"],
        }),
      ),
    ).toContain("Unknown organization roles: ghost");
  });

  it("names the roles a caller may not grant, whatever the 403 wording", () => {
    expect(
      describeRefusal(
        new ApiError("You do not have permission", 403, undefined, {
          roles: ["owner", "billing"],
        }),
      ),
    ).toContain("You may not change these roles: owner, billing");
  });

  it("counts the holders of a role", () => {
    const refusal = (holders: number) =>
      new ApiError("Organization role is still held", 409, undefined, {
        holders,
      });

    expect(describeRefusal(refusal(1))).toContain("1 membership holds it");
    expect(describeRefusal(refusal(3))).toContain("3 memberships hold it");
  });

  it("falls back to the message without usable details", () => {
    expect(
      describeRefusal(new ApiError("A built-in role cannot be deleted", 409)),
    ).toBe("A built-in role cannot be deleted");
    expect(
      describeRefusal(
        new ApiError("Bad", 400, undefined, { roles: [{ unexpected: true }] }),
      ),
    ).toBe("Bad");
    expect(describeRefusal(new Error("Plain"))).toBe("Plain");
  });
});
