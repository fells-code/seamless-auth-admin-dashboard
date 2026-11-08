/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  RESERVED_CLAIM_NAMES,
  type CustomClaimSource,
} from "@seamless-auth/types";
import { expect, test } from "../fixtures";
import type { MockApi } from "../mockApi";
import { confirmDialog, expectToast } from "../helpers";
import {
  makeCustomClaimSource,
  makeOidcApplication,
  makeRoleDefinition,
} from "../factories";

function seedClaims(api: MockApi) {
  const sources = [
    makeCustomClaimSource({ sourceName: "admin", claims: { tier: "gold" } }),
    makeCustomClaimSource({
      sourceKind: "organization_role",
      sourceName: "Legacy Role",
      claims: { region: "eu-west" },
    }),
  ];

  api.get("/admin/custom-claims", () => ({
    json: {
      sources,
      reservedNames: [...RESERVED_CLAIM_NAMES],
      reservedPrefixes: ["seamless_", "org_"],
      budgetBytes: 1024,
    },
  }));
  api.get("/admin/roles", {
    json: {
      roles: [
        makeRoleDefinition({ name: "admin", kind: "instance" }),
        makeRoleDefinition({ name: "Legacy Role" }),
      ],
    },
  });
  api.get("/admin/applications", {
    json: { applications: [makeOidcApplication({ id: "docs-portal" })] },
  });
  api.put(
    "/admin/custom-claims/:sourceKind/:sourceName",
    ({ params, payload }) => ({
      json: {
        source: makeCustomClaimSource({
          sourceKind: params.sourceKind as "instance_role",
          sourceName: params.sourceName,
          claims: (payload as Pick<CustomClaimSource, "claims">).claims,
        }),
      },
    }),
  );
  api.delete("/admin/custom-claims/:sourceKind/:sourceName", {
    json: { message: "Custom claims deleted" },
  });
}

test.describe("Custom claims", () => {
  test("lists sets with their size, the budget and the reserved names", async ({
    page,
    api,
    signInAs,
  }) => {
    seedClaims(api);

    await signInAs("writeAdmin", "/custom-claims");

    await expect(
      page.getByRole("heading", { name: "Custom claims", level: 1 }),
    ).toBeVisible();
    const table = page.getByRole("table", { name: "Custom claim sets" });
    await expect(table.getByText("Legacy Role")).toBeVisible();
    await expect(table.getByText("15 of 1024 bytes")).toBeVisible();
    await expect(page.getByText(/permissions_omitted: true/)).toBeVisible();

    await page.getByText("Reserved claim names").click();
    await expect(
      page.getByText("email_verified", { exact: true }),
    ).toBeVisible();
  });

  test("adds claims to an OpenID Provider client", async ({
    page,
    api,
    signInAs,
  }) => {
    seedClaims(api);

    await signInAs("writeAdmin", "/custom-claims");
    await page.getByRole("button", { name: "Add claims" }).click();

    const form = page.getByRole("dialog");
    await form.getByLabel("Source kind").selectOption("oidc_client");
    await form.getByLabel("Client ID").fill("docs-portal");
    await form.getByLabel("Claims (JSON)").fill('{ "plan": "team" }');
    await form.getByRole("button", { name: "Save claims" }).click();

    await expectToast(page, "Custom claims saved");
    expect(
      api.lastCall("PUT", "/admin/custom-claims/oidc_client/docs-portal")
        ?.payload,
    ).toEqual({ claims: { plan: "team" } });
  });

  test("refuses a reserved name before step-up", async ({
    page,
    api,
    signInAs,
  }) => {
    seedClaims(api);

    await signInAs("writeAdmin", "/custom-claims");
    await page.getByRole("button", { name: "Edit admin" }).click();

    const form = page.getByRole("dialog");
    await form
      .getByLabel("Claims (JSON)")
      .fill('{ "email": "ceo@example.com", "org_x": 1 }');
    await form.getByRole("button", { name: "Save claims" }).click();

    await expect(form.getByText(/Reserved.*email, org_x/)).toBeVisible();
    expect(
      api.recordedCalls("PUT", "/admin/custom-claims/instance_role/admin"),
    ).toHaveLength(0);
  });

  test("shows why the API refused a write", async ({ page, api, signInAs }) => {
    seedClaims(api);
    api.put("/admin/custom-claims/:sourceKind/:sourceName", {
      status: 400,
      json: {
        error: "invalid_request",
        message: "Request failed schema validation.",
        details: {
          issues: [
            {
              path: ["claims", "tier"],
              code: "custom",
              message: "must not nest deeper than 3 levels",
            },
          ],
        },
      },
    });

    await signInAs("writeAdmin", "/custom-claims");
    await page.getByRole("button", { name: "Edit admin" }).click();

    const form = page.getByRole("dialog");
    await form.getByRole("button", { name: "Save claims" }).click();

    await expect(
      form.getByText(/claims\.tier: must not nest deeper than 3 levels/),
    ).toBeVisible();
  });

  test("deletes a set with a space in its role name", async ({
    page,
    api,
    signInAs,
  }) => {
    seedClaims(api);

    await signInAs("writeAdmin", "/custom-claims");
    await page.getByRole("button", { name: "Delete Legacy Role" }).click();
    await confirmDialog(page, "Delete");

    await expectToast(page, "Custom claims deleted");
    expect(
      api.recordedCalls(
        "DELETE",
        "/admin/custom-claims/organization_role/Legacy%20Role",
      ),
    ).toHaveLength(1);
  });

  test("hides writes from a read-only admin", async ({
    page,
    api,
    signInAs,
  }) => {
    seedClaims(api);

    await signInAs("readAdmin", "/custom-claims");

    await expect(page.getByText("Read-only access")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add claims" })).toHaveCount(
      0,
    );
  });

  test("says the API needs upgrading when the routes are missing", async ({
    page,
    api,
    signInAs,
  }) => {
    seedClaims(api);
    api.get("/admin/custom-claims", {
      status: 404,
      json: { error: "Not found" },
    });

    await signInAs("writeAdmin", "/custom-claims");

    await expect(page.getByText("Needs Seamless Auth API v0.23")).toBeVisible();
  });
});
