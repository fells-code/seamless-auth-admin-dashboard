/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { Page } from "@playwright/test";
import type { OidcApplication } from "@seamless-auth/types";
import { expect, test } from "../fixtures";
import type { MockApi } from "../mockApi";
import {
  confirmDialog,
  drainRetries,
  expectErrorState,
  expectToast,
} from "../helpers";
import { makeOidcApplication, makeOidcResource } from "../factories";

const ORDERS = makeOidcResource({
  id: "00000000-0000-4000-8000-000000000001",
  name: "Orders API",
  identifier: "https://orders.example.com",
  scopes: ["orders:read", "orders:write"],
});

function seedApplications(
  api: MockApi,
  seeded: OidcApplication[] = [
    makeOidcApplication({ id: "client_docs", name: "Docs Portal" }),
    makeOidcApplication({
      id: "client_cli",
      name: "Desk CLI",
      clientType: "public",
      applicationType: "native",
      tokenEndpointAuthMethod: "none",
      redirectUris: ["http://127.0.0.1/callback"],
    }),
    makeOidcApplication({
      id: "client_legacy",
      name: "Legacy Billing",
      tokenEndpointAuthMethod: "client_secret_basic",
      hasSecret: true,
    }),
  ],
) {
  const applications = [...seeded];
  const links: Record<string, { resourceId: string; scopes: string[] }[]> = {};

  api.get("/admin/applications", () => ({ json: { applications } }));
  api.get("/admin/resources", { json: { resources: [ORDERS] } });

  api.post("/admin/applications", ({ payload }) => {
    const request = payload as Partial<OidcApplication>;
    const created = makeOidcApplication({
      ...request,
      id: "client_new",
      hasSecret: request.tokenEndpointAuthMethod?.startsWith("client_secret"),
    });
    applications.push(created);
    return {
      status: 201,
      json: {
        application: created,
        ...(created.hasSecret ? { clientSecret: "s3cr3t-shown-once" } : {}),
      },
    };
  });

  api.patch("/admin/applications/:id", ({ params, payload }) => {
    const index = applications.findIndex((app) => app.id === params.id);
    applications[index] = { ...applications[index], ...(payload as object) };
    return { json: { application: applications[index] } };
  });

  api.delete("/admin/applications/:id", ({ params }) => {
    const index = applications.findIndex((app) => app.id === params.id);
    applications.splice(index, 1);
    return { json: { message: "Success" } };
  });

  api.post("/admin/applications/:id/secret", ({ params }) => ({
    json: {
      application: applications.find((app) => app.id === params.id),
      clientSecret: "rotated-secret",
    },
  }));

  api.put("/admin/applications/:id/keys", ({ params, payload }) => {
    const index = applications.findIndex((app) => app.id === params.id);
    applications[index] = { ...applications[index], ...(payload as object) };
    return { json: { application: applications[index] } };
  });

  api.get("/admin/applications/:id/resources", ({ params }) => ({
    json: {
      resources: (links[params.id] ?? []).map((link) => ({
        ...link,
        identifier: ORDERS.identifier,
        name: ORDERS.name,
      })),
    },
  }));

  api.put("/admin/applications/:id/resources", ({ params, payload }) => {
    links[params.id] = (payload as { resources: [] }).resources;
    return {
      json: {
        resources: links[params.id].map(
          (link: { resourceId: string; scopes: string[] }) => ({
            ...link,
            identifier: ORDERS.identifier,
            name: ORDERS.name,
          }),
        ),
      },
    };
  });

  return { applications, links };
}

function dialog(page: Page) {
  return page.getByRole("dialog");
}

async function select(page: Page, name: string) {
  await page.getByRole("button", { name: `Manage ${name}` }).click();
  await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
}

test.describe("Applications", () => {
  test("lists applications and marks shared-secret clients as weaker", async ({
    page,
    api,
    signInAs,
  }) => {
    seedApplications(api);

    await signInAs("writeAdmin", "/applications");

    await expect(
      page.getByRole("heading", { name: "Applications", level: 1 }),
    ).toBeVisible();
    const table = page.getByRole("table", { name: "Applications" });
    await expect(table.getByText("Docs Portal")).toBeVisible();
    await expect(table.getByText("Desk CLI")).toBeVisible();
    await expect(
      table.getByRole("row", { name: /Legacy Billing/ }).getByText("Weaker"),
    ).toBeVisible();
    await expect(
      table.getByRole("row", { name: /Docs Portal/ }).getByText("Weaker"),
    ).toBeHidden();
  });

  test("shows a native client's loopback redirect", async ({
    page,
    api,
    signInAs,
  }) => {
    seedApplications(api);

    await signInAs("writeAdmin", "/applications");
    await select(page, "Desk CLI");

    await expect(page.getByText("http://127.0.0.1/callback")).toBeVisible();
    await expect(page.getByText("Loopback", { exact: true })).toBeVisible();
    await expect(
      page.getByText("A public client holds no credential."),
    ).toBeVisible();
  });

  test("creates a public client with loopback and private-use redirects", async ({
    page,
    api,
    signInAs,
  }) => {
    seedApplications(api);

    await signInAs("writeAdmin", "/applications");
    await page.getByRole("button", { name: "New application" }).click();

    const form = dialog(page);
    await form.getByLabel("Name").fill("Mobile App");
    await form.getByLabel("Client type").selectOption("public");
    await form
      .getByLabel("Redirect URIs (one per line)", { exact: true })
      .fill("http://127.0.0.1/callback\ncom.example.app:/callback");

    await expect(form.getByText("Loopback", { exact: true })).toBeVisible();
    await expect(
      form.getByText("Private-use scheme", { exact: true }),
    ).toBeVisible();

    await form.getByRole("button", { name: "Create application" }).click();

    await expectToast(page, "Application created");
    expect(api.lastCall("POST", "/admin/applications")?.payload).toMatchObject({
      name: "Mobile App",
      clientType: "public",
      tokenEndpointAuthMethod: "none",
      redirectUris: ["http://127.0.0.1/callback", "com.example.app:/callback"],
    });
  });

  test("refuses a localhost redirect before asking the API", async ({
    page,
    api,
    signInAs,
  }) => {
    seedApplications(api);

    await signInAs("writeAdmin", "/applications");
    await page.getByRole("button", { name: "New application" }).click();

    const form = dialog(page);
    await form.getByLabel("Name").fill("Local Dev");
    await form
      .getByLabel("Redirect URIs (one per line)", { exact: true })
      .fill("http://localhost:3000/callback");

    await expect(
      form.getByText(/localhost is not a redirect host/).first(),
    ).toBeVisible();
    await expect(
      form.getByRole("button", { name: "Create application" }),
    ).toBeDisabled();
    expect(api.recordedCalls("POST", "/admin/applications")).toHaveLength(0);
  });

  test("shows a new shared secret once", async ({ page, api, signInAs }) => {
    seedApplications(api);

    await signInAs("writeAdmin", "/applications");
    await page.getByRole("button", { name: "New application" }).click();

    const form = dialog(page);
    await form.getByLabel("Name").fill("Reports");
    await form
      .getByLabel("Client authentication")
      .selectOption("client_secret_post");
    await expect(form.getByText(/A shared secret is weaker/)).toBeVisible();
    await form
      .getByLabel("Redirect URIs (one per line)", { exact: true })
      .fill("https://reports.example.com/callback");
    await form.getByRole("button", { name: "Create application" }).click();

    const secret = page.getByRole("dialog", { name: "Client secret" });
    await expect(secret.getByLabel("Client secret")).toHaveValue(
      "s3cr3t-shown-once",
    );
    await secret.getByRole("button", { name: "Done" }).click();
    await expect(secret).toBeHidden();
  });

  test("saves an edit to an application", async ({ page, api, signInAs }) => {
    seedApplications(api);

    await signInAs("writeAdmin", "/applications");
    await page.getByRole("button", { name: "Edit Docs Portal" }).click();

    const form = dialog(page);
    await form.getByLabel("Name").fill("Docs");
    await form.getByLabel(/^Disabled/).check();
    await form.getByRole("button", { name: "Save" }).click();

    await expectToast(page, "Application updated");
    const payload = api.lastCall("PATCH", "/admin/applications/client_docs")
      ?.payload as Record<string, unknown>;
    expect(payload).toMatchObject({ name: "Docs", disabled: true });
    expect(payload).not.toHaveProperty("clientType");
  });

  test("rotates a secret behind a confirmation", async ({
    page,
    api,
    signInAs,
  }) => {
    seedApplications(api);

    await signInAs("writeAdmin", "/applications");
    await select(page, "Legacy Billing");

    await page.getByRole("button", { name: "Rotate secret" }).click();
    await confirmDialog(page, "Rotate");

    await expect(
      page
        .getByRole("dialog", { name: "Client secret" })
        .getByLabel("Client secret"),
    ).toHaveValue("rotated-secret");
    expect(
      api.lastCall("POST", "/admin/applications/client_legacy/secret"),
    ).toBeTruthy();
  });

  test("registers a public key set", async ({ page, api, signInAs }) => {
    seedApplications(api);
    const jwks = {
      keys: [
        { kty: "EC", kid: "k1", alg: "ES256", crv: "P-256", x: "x", y: "y" },
      ],
    };

    await signInAs("writeAdmin", "/applications");
    await select(page, "Docs Portal");

    await expect(
      page.getByText(
        "No keys are registered, so this client cannot get tokens yet.",
      ),
    ).toBeVisible();
    await page
      .getByLabel("Public key set (JWKS JSON)")
      .fill(JSON.stringify(jwks));
    await page.getByRole("button", { name: "Save keys" }).click();

    await expectToast(page, "Keys saved");
    expect(
      api.lastCall("PUT", "/admin/applications/client_docs/keys")?.payload,
    ).toEqual({ jwks });
  });

  test("refuses a key set with a private member", async ({
    page,
    api,
    signInAs,
  }) => {
    seedApplications(api);

    await signInAs("writeAdmin", "/applications");
    await select(page, "Docs Portal");

    await page.getByLabel("Public key set (JWKS JSON)").fill(
      JSON.stringify({
        keys: [{ kty: "EC", kid: "k1", alg: "ES256", d: "secret" }],
      }),
    );
    await page.getByRole("button", { name: "Save keys" }).click();

    await expect(page.getByText(/private key members/)).toBeVisible();
    expect(
      api.recordedCalls("PUT", "/admin/applications/client_docs/keys"),
    ).toHaveLength(0);
  });

  test("allows a resource and a subset of its scopes", async ({
    page,
    api,
    signInAs,
  }) => {
    seedApplications(api);

    await signInAs("writeAdmin", "/applications");
    await select(page, "Docs Portal");

    await page.getByRole("checkbox", { name: "Allow Orders API" }).check();
    await page
      .getByRole("checkbox", { name: "Orders API scope orders:read" })
      .check();
    await page.getByRole("button", { name: "Save resources" }).click();

    await expectToast(page, "Resources saved");
    expect(
      api.lastCall("PUT", "/admin/applications/client_docs/resources")?.payload,
    ).toEqual({
      resources: [{ resourceId: ORDERS.id, scopes: ["orders:read"] }],
    });
  });

  test("deletes an application behind a confirmation", async ({
    page,
    api,
    signInAs,
  }) => {
    seedApplications(api);

    await signInAs("writeAdmin", "/applications");
    await page.getByRole("button", { name: "Delete Desk CLI" }).click();
    await confirmDialog(page, "Delete");

    await expectToast(page, "Application deleted");
    expect(
      api.lastCall("DELETE", "/admin/applications/client_cli"),
    ).toBeTruthy();
  });

  test("retries a write the API refused for a lapsed step-up", async ({
    page,
    api,
    signInAs,
  }) => {
    seedApplications(api);
    let attempts = 0;
    api.delete("/admin/applications/:id", () => {
      attempts += 1;
      return attempts === 1
        ? {
            status: 403,
            json: {
              error: "step_up_required",
              message: "Recent step-up authentication is required",
              fresh: false,
              method: null,
              verifiedAt: null,
              expiresAt: null,
              maxAgeSeconds: 300,
            },
          }
        : { json: { message: "Success" } };
    });

    await signInAs("writeAdmin", "/applications");
    await page.getByRole("button", { name: "Delete Desk CLI" }).click();
    await confirmDialog(page, "Delete");

    await expectToast(page, "Application deleted");
    expect(attempts).toBe(2);
  });

  test("hides every write control from a read-only admin", async ({
    page,
    api,
    signInAs,
  }) => {
    seedApplications(api);

    await signInAs("readAdmin", "/applications");
    await select(page, "Legacy Billing");

    await expect(
      page.getByRole("button", { name: "New application" }),
    ).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Rotate secret" }),
    ).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Save resources" }),
    ).toBeHidden();
    await expect(page.getByText("Read-only access").first()).toBeVisible();
  });

  test("renders an empty list cleanly", async ({ page, api, signInAs }) => {
    seedApplications(api, []);

    await signInAs("writeAdmin", "/applications");

    await expect(page.getByText("No applications")).toBeVisible();
  });

  test("surfaces a failed load", async ({ page, api, signInAs }) => {
    api.get("/admin/applications", {
      status: 500,
      json: { error: "applications unavailable" },
    });

    await signInAs("writeAdmin", "/applications");
    await drainRetries(page);

    await expectErrorState(page, "Could not load applications");
  });
});
