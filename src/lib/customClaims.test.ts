/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import { checkClaims } from "./customClaims";

const reserved = { names: ["email", "roles"], prefixes: ["seamless_", "org_"] };

describe("checkClaims", () => {
  it("accepts a valid set and measures it", () => {
    const result = checkClaims('{ "tier": "gold" }', reserved, 1024);

    expect(result).toEqual({
      ok: true,
      request: { claims: { tier: "gold" } },
      bytes: 15,
    });
  });

  it("refuses names the API reserves, by name and by prefix", () => {
    const result = checkClaims(
      '{ "email": "a@b.c", "org_plan": 1, "seamless_x": 2 }',
      reserved,
      1024,
    );

    expect(result.ok).toBe(false);
    expect(!result.ok && result.problem).toBe(
      "Reserved, so they cannot be set: email, org_plan, seamless_x.",
    );
  });

  it("refuses a name the API reserves even when the bundled list does not", () => {
    const result = checkClaims(
      '{ "plan": 1 }',
      { names: ["plan"], prefixes: [] },
      1024,
    );

    expect(result.ok).toBe(false);
  });

  it("refuses a set over the budget", () => {
    const result = checkClaims(
      JSON.stringify({ blob: "x".repeat(1100) }),
      reserved,
      1024,
    );

    expect(!result.ok && result.problem).toMatch(/over the 1024 byte budget/);
  });

  it("refuses values nested past three levels and bad names", () => {
    expect(checkClaims('{ "a": [[[1]]] }', reserved, 1024).ok).toBe(true);
    expect(checkClaims('{ "a": [[[[1]]]] }', reserved, 1024).ok).toBe(false);
    expect(checkClaims('{ "Tier": 1 }', reserved, 1024).ok).toBe(false);
  });

  it("refuses text that is not a JSON object", () => {
    expect(checkClaims("{", reserved, 1024)).toMatchObject({
      ok: false,
      problem: "This is not valid JSON.",
    });
    expect(checkClaims("[1]", reserved, 1024).ok).toBe(false);
    expect(checkClaims("null", reserved, 1024).ok).toBe(false);
  });
});
