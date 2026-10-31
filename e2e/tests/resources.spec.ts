/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { expect, test } from "../fixtures";
import type { MockApi } from "../mockApi";
import {
  confirmDialog,
  drainRetries,
  expectErrorState,
  expectToast,
} from "../helpers";
import { makeOidcResource } from "../factories";

const ORDERS_ID = "00000000-0000-4000-8000-000000000001";

function seedResources(api: MockApi) {
  const resources = [
    makeOidcResource({
      id: ORDERS_ID,
      name: "Orders API",
      identifier: "https://orders.example.com",
      scopes: ["orders:read", "orders:write"],
    }),
  ];

  api.get("/admin/resources", () => ({ json: { resources } }));

  api.post("/admin/resources", ({ payload }) => {
    const created = makeOidcResource(payload as object);
    resources.push(created);
    return { status: 201, json: { resource: created } };
  });

  api.patch("/admin/resources/:id", ({ params, payload }) => {
    const index = resources.findIndex((resource) => resource.id === params.id);
    resources[index] = { ...resources[index], ...(payload as object) };
    return { json: { resource: resources[index] } };
  });

  api.delete("/admin/resources/:id", ({ params }) => {
    const index = resources.findIndex((resource) => resource.id === params.id);
    resources.splice(index, 1);
    return { json: { message: "Success" } };
  });

  return resources;
}

test.describe("Resources", () => {
  test("lists resources with their scopes", async ({ page, api, signInAs }) => {
    seedResources(api);

    await signInAs("writeAdmin", "/resources");

    await expect(
      page.getByRole("heading", { name: "Resources", level: 1 }),
    ).toBeVisible();
    const table = page.getByRole("table", { name: "Resources" });
    await expect(table.getByText("Orders API")).toBeVisible();
    await expect(table.getByText("https://orders.example.com")).toBeVisible();
    await expect(table.getByText("orders:read orders:write")).toBeVisible();
  });

  test("creates a resource with scopes", async ({ page, api, signInAs }) => {
    seedResources(api);

    await signInAs("writeAdmin", "/resources");
    await page.getByRole("button", { name: "New resource" }).click();

    const form = page.getByRole("dialog");
    await form.getByLabel("Identifier").fill("https://billing.example.com");
    await form.getByLabel("Name").fill("Billing API");
    await form.getByLabel(/^Scopes/).fill("invoices:read, invoices:write");
    await form.getByRole("button", { name: "Create resource" }).click();

    await expectToast(page, "Resource created");
    expect(api.lastCall("POST", "/admin/resources")?.payload).toEqual({
      identifier: "https://billing.example.com",
      name: "Billing API",
      scopes: ["invoices:read", "invoices:write"],
      accessTokenTtlSeconds: null,
    });
  });

  test("refuses a reserved scope before asking the API", async ({
    page,
    api,
    signInAs,
  }) => {
    seedResources(api);

    await signInAs("writeAdmin", "/resources");
    await page.getByRole("button", { name: "New resource" }).click();

    const form = page.getByRole("dialog");
    await form.getByLabel("Identifier").fill("https://billing.example.com");
    await form.getByLabel("Name").fill("Billing API");
    await form.getByLabel(/^Scopes/).fill("openid");

    await expect(
      form.getByText(/that scope is reserved by the provider/),
    ).toBeVisible();
    await expect(
      form.getByRole("button", { name: "Create resource" }),
    ).toBeDisabled();
    expect(api.recordedCalls("POST", "/admin/resources")).toHaveLength(0);
  });

  test("edits a resource without sending its fixed identifier", async ({
    page,
    api,
    signInAs,
  }) => {
    seedResources(api);

    await signInAs("writeAdmin", "/resources");
    await page.getByRole("button", { name: "Edit Orders API" }).click();

    const form = page.getByRole("dialog");
    await expect(form.getByLabel("Identifier")).toBeDisabled();
    await form.getByLabel(/^Scopes/).fill("orders:read");
    await form.getByRole("button", { name: "Save" }).click();

    await expectToast(page, "Resource updated");
    expect(
      api.lastCall("PATCH", `/admin/resources/${ORDERS_ID}`)?.payload,
    ).toEqual({
      name: "Orders API",
      scopes: ["orders:read"],
      accessTokenTtlSeconds: null,
    });
  });

  test("deletes a resource behind a confirmation", async ({
    page,
    api,
    signInAs,
  }) => {
    seedResources(api);

    await signInAs("writeAdmin", "/resources");
    await page.getByRole("button", { name: "Delete Orders API" }).click();
    await confirmDialog(page, "Delete");

    await expectToast(page, "Resource deleted");
    expect(
      api.lastCall("DELETE", `/admin/resources/${ORDERS_ID}`),
    ).toBeTruthy();
  });

  test("hides every write control from a read-only admin", async ({
    page,
    api,
    signInAs,
  }) => {
    seedResources(api);

    await signInAs("readAdmin", "/resources");

    await expect(
      page.getByRole("button", { name: "New resource" }),
    ).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Edit Orders API" }),
    ).toBeHidden();
    await expect(page.getByText("Read-only access").first()).toBeVisible();
  });

  test("surfaces a failed load", async ({ page, api, signInAs }) => {
    api.get("/admin/resources", {
      status: 500,
      json: { error: "resources unavailable" },
    });

    await signInAs("writeAdmin", "/resources");
    await drainRetries(page);

    await expectErrorState(page, "Could not load resources");
  });
});
