/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import { checkClaims, findClaimConflicts } from "./customClaims";

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

function source(
  sourceKind: "instance_role" | "organization_role" | "oidc_client",
  sourceName: string,
  claims: Record<string, string>,
) {
  return {
    sourceKind,
    sourceName,
    claims,
    updatedAt: "2026-11-01T00:00:00.000Z",
  };
}

describe("findClaimConflicts", () => {
  it("names the role that sorts last as the winner, whatever order the list is in", () => {
    expect(
      findClaimConflicts([
        source("instance_role", "support", { tier: "silver" }),
        source("instance_role", "billing", { tier: "gold", region: "eu" }),
        source("instance_role", "admin", { tier: "platinum" }),
      ]),
    ).toEqual([
      {
        sourceKind: "instance_role",
        claim: "tier",
        roles: ["admin", "billing", "support"],
        winner: "support",
      },
    ]);
  });

  it("sorts by code unit as the API does, so an uppercase name sorts first", () => {
    expect(
      findClaimConflicts([
        source("organization_role", "member", { plan: "a" }),
        source("organization_role", "Legacy Role", { plan: "b" }),
      ])[0],
    ).toMatchObject({ roles: ["Legacy Role", "member"], winner: "member" });
  });

  it("ignores a name set by roles of different kinds or by a client", () => {
    expect(
      findClaimConflicts([
        source("instance_role", "admin", { tier: "a" }),
        source("organization_role", "admin", { tier: "b" }),
        source("oidc_client", "docs", { tier: "c" }),
        source("oidc_client", "portal", { tier: "d" }),
      ]),
    ).toEqual([]);
  });

  it("reports each kind separately", () => {
    expect(
      findClaimConflicts([
        source("instance_role", "a", { tier: "1" }),
        source("instance_role", "b", { tier: "2" }),
        source("organization_role", "c", { tier: "3" }),
        source("organization_role", "d", { tier: "4" }),
      ]).map((conflict) => [conflict.sourceKind, conflict.winner]),
    ).toEqual([
      ["instance_role", "b"],
      ["organization_role", "d"],
    ]);
  });
});
