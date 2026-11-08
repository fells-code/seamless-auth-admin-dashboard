/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { expect, test } from "../fixtures";
import type { MockApi } from "../mockApi";
import { confirmDialog, expectInlineAlert, expectToast } from "../helpers";
import {
  HOUR,
  isoOffset,
  makeMeUser,
  makeStepUpStatus,
  makeWebhookDelivery,
  makeWebhookEndpoint,
} from "../factories";

const SECRET = `whsec_${"A".repeat(43)}=`;

function seedWebhooks(api: MockApi) {
  const live = makeWebhookEndpoint({
    url: "https://hooks.example.com/live",
    description: "CRM sync",
    eventTypes: ["user.created", "user.deleted"],
  });
  const gone = makeWebhookEndpoint({
    url: "https://old.example.com/hook",
    enabled: false,
    disabledReason: "gone",
  });
  const endpoints = [live, gone];

  const dead = makeWebhookDelivery({
    endpointId: live.id,
    eventType: "user.deleted",
    status: "dead",
    attempts: 8,
    lastStatusCode: 500,
    lastFailure: "http_status",
  });
  const older = makeWebhookDelivery({
    endpointId: live.id,
    createdAt: isoOffset(-5 * HOUR),
  });

  api.get("/admin/webhooks", () => ({ json: { endpoints } }));
  api.get("/admin/webhook-deliveries", ({ url }) => {
    const status = url.searchParams.get("status");
    if (status === "dead") {
      return { json: { deliveries: [dead], nextCursor: null } };
    }
    if (url.searchParams.get("cursor") === "page-2") {
      return { json: { deliveries: [older], nextCursor: null } };
    }
    return { json: { deliveries: [dead], nextCursor: "page-2" } };
  });
  api.get("/admin/webhook-deliveries/:deliveryId", ({ params }) => ({
    json: {
      delivery: {
        ...[dead, older].find((delivery) => delivery.id === params.deliveryId),
        event: {
          id: params.deliveryId,
          type: "user.deleted",
          version: 1,
          timestamp: isoOffset(-1 * HOUR),
          data: { userId: "user_42" },
        },
      },
    },
  }));
  api.post("/admin/webhooks", ({ payload }) => {
    const endpoint = makeWebhookEndpoint(payload as object);
    endpoints.push(endpoint);
    return { status: 201, json: { endpoint, secret: SECRET } };
  });
  api.patch("/admin/webhooks/:id", ({ params, payload }) => {
    const endpoint = endpoints.find((item) => item.id === params.id)!;
    Object.assign(endpoint, payload, { disabledReason: null });
    return { json: { endpoint } };
  });
  api.post("/admin/webhooks/:id/secret", {
    json: { secret: SECRET, previousSecretExpiresAt: isoOffset(24 * HOUR) },
  });
  api.post("/admin/webhooks/:id/test", {
    json: {
      ok: false,
      failure: "timed_out",
      statusCode: null,
      durationMs: 15000,
    },
  });
  api.post("/admin/webhook-deliveries/:deliveryId/redeliver", ({ params }) => ({
    json: {
      delivery: {
        ...dead,
        id: params.deliveryId,
        status: "succeeded",
        lastStatusCode: 204,
        lastFailure: null,
        event: {
          id: params.deliveryId,
          type: "user.deleted",
          version: 1,
          timestamp: isoOffset(-1 * HOUR),
          data: { userId: "user_42" },
        },
      },
    },
  }));

  return { live, gone, dead, older };
}

test.describe("Webhooks", () => {
  test("lists endpoints with why one is off, and the delivery log", async ({
    page,
    api,
    signInAs,
  }) => {
    seedWebhooks(api);

    await signInAs("writeAdmin", "/webhooks");

    await expect(
      page.getByRole("heading", { name: "Webhooks", level: 1 }),
    ).toBeVisible();
    const endpoints = page.getByRole("table", { name: "Webhook endpoints" });
    await expect(endpoints.getByText("CRM sync")).toBeVisible();
    await expect(endpoints.getByText(/answered 410 Gone/)).toBeVisible();

    const deliveries = page.getByRole("table", { name: "Webhook deliveries" });
    await expect(deliveries.getByText("Dead letter")).toBeVisible();
    await expect(
      deliveries.getByText("The destination answered HTTP 500."),
    ).toBeVisible();
  });

  test("creates a webhook and shows its secret once", async ({
    page,
    api,
    signInAs,
  }) => {
    seedWebhooks(api);

    await signInAs("writeAdmin", "/webhooks");
    await page.getByRole("button", { name: "New webhook" }).click();

    const form = page.getByRole("dialog");
    await form.getByLabel("URL").fill("https://hooks.example.com/new");
    await form.getByRole("button", { name: "session.revoked" }).click();
    await form.getByRole("button", { name: "Create webhook" }).click();

    await expectToast(page, "Webhook created");
    expect(api.lastCall("POST", "/admin/webhooks")?.payload).toEqual({
      url: "https://hooks.example.com/new",
      eventTypes: ["session.revoked"],
    });

    const reveal = page.getByRole("dialog", { name: "Signing secret" });
    await expect(reveal.getByRole("textbox")).toHaveValue(SECRET);
    await reveal.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(`input[value="${SECRET}"]`)).toHaveCount(0);
  });

  test("refuses a URL with credentials before step-up", async ({
    page,
    api,
    signInAs,
  }) => {
    seedWebhooks(api);

    await signInAs("writeAdmin", "/webhooks");
    await page.getByRole("button", { name: "New webhook" }).click();

    const form = page.getByRole("dialog");
    await form.getByLabel("URL").fill("https://user:pass@hooks.example.com");
    await form.getByRole("button", { name: "user.created" }).click();
    await form.getByRole("button", { name: "Create webhook" }).click();

    await expect(
      form.getByText(/must not carry a username or password/),
    ).toBeVisible();
    expect(api.recordedCalls("POST", "/admin/webhooks")).toHaveLength(0);
  });

  test("turns a disabled endpoint back on", async ({ page, api, signInAs }) => {
    const { gone } = seedWebhooks(api);

    await signInAs("writeAdmin", "/webhooks");
    await page.getByRole("button", { name: `Turn on ${gone.url}` }).click();

    await expectToast(page, "Webhook turned on");
    expect(
      api.lastCall("PATCH", `/admin/webhooks/${gone.id}`)?.payload,
    ).toEqual({ enabled: true });
  });

  test("rotates the secret and says the old one signs for 24 hours", async ({
    page,
    api,
    signInAs,
  }) => {
    const { live } = seedWebhooks(api);

    await signInAs("writeAdmin", "/webhooks");
    await page
      .getByRole("button", { name: `Rotate secret ${live.url}` })
      .click();
    await confirmDialog(page, "Rotate");

    const reveal = page.getByRole("dialog", { name: "Signing secret" });
    await expect(reveal.getByRole("textbox")).toHaveValue(SECRET);
    await expect(
      reveal.getByText(/keeps signing beside this one for 24 hours/),
    ).toBeVisible();
  });

  test("sends a test event and shows why it failed", async ({
    page,
    api,
    signInAs,
  }) => {
    const { live } = seedWebhooks(api);

    await signInAs("writeAdmin", "/webhooks");
    await page.getByRole("button", { name: `Send test ${live.url}` }).click();

    await expectInlineAlert(page, /did not answer in time/);
    expect(
      api.recordedCalls("POST", `/admin/webhooks/${live.id}/test`),
    ).toHaveLength(1);
  });

  test("opens the dead letter view, inspects and redelivers", async ({
    page,
    api,
    signInAs,
  }) => {
    const { dead } = seedWebhooks(api);

    await signInAs("writeAdmin", "/webhooks");
    await page.getByRole("tab", { name: "Dead letter" }).click();

    await expect
      .poll(() =>
        api
          .recordedCalls("GET", "/admin/webhook-deliveries")
          .some(
            (call) => new URL(call.url).searchParams.get("status") === "dead",
          ),
      )
      .toBe(true);

    const deliveries = page.getByRole("table", { name: "Webhook deliveries" });
    const rowName = `user.deleted ${dead.createdAt}`;
    await deliveries.getByRole("button", { name: `View ${rowName}` }).click();
    await expect(page.getByLabel("Event body")).toContainText("user_42");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Done" })
      .click();

    await deliveries
      .getByRole("button", { name: `Redeliver ${rowName}` })
      .click();
    await expectToast(page, "Redelivered");
    expect(
      api.recordedCalls(
        "POST",
        `/admin/webhook-deliveries/${dead.id}/redeliver`,
      ),
    ).toHaveLength(1);
  });

  test("pages through deliveries with the cursor", async ({
    page,
    api,
    signInAs,
  }) => {
    seedWebhooks(api);

    await signInAs("writeAdmin", "/webhooks");
    await page.getByRole("button", { name: "Older" }).click();

    await expect
      .poll(() =>
        new URL(
          api.recordedCalls("GET", "/admin/webhook-deliveries").at(-1)!.url,
        ).searchParams.get("cursor"),
      )
      .toBe("page-2");
    await expect(page.getByRole("button", { name: "Older" })).toBeDisabled();
    await page.getByRole("button", { name: "Newer" }).click();
    await expect(page.getByRole("button", { name: "Older" })).toBeEnabled();
  });

  test("writes nothing when step-up fails", async ({ page, api }) => {
    const { live } = seedWebhooks(api);
    api.get("/users/me", {
      json: {
        user: makeMeUser({ roles: ["admin:write"] }),
        credentials: [],
        organizations: [],
        activeOrganization: null,
      },
    });
    api.get("/step-up/status", { json: makeStepUpStatus({ fresh: false }) });

    await page.goto("/webhooks");
    await page.getByRole("button", { name: `Send test ${live.url}` }).click();

    await expectToast(page, /security key or authenticator is required/i);
    expect(
      api.recordedCalls("POST", `/admin/webhooks/${live.id}/test`),
    ).toHaveLength(0);
  });

  test("hides writes from a read-only admin", async ({
    page,
    api,
    signInAs,
  }) => {
    seedWebhooks(api);

    await signInAs("readAdmin", "/webhooks");

    await expect(page.getByText("Read-only access")).toBeVisible();
    await expect(
      page.getByRole("table", { name: "Webhook endpoints" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "New webhook" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: /^Redeliver / })).toHaveCount(
      0,
    );
  });

  test("says the API needs upgrading when the routes are missing", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/admin/webhooks", { status: 404, json: { error: "Not found" } });
    api.get("/admin/webhook-deliveries", {
      status: 404,
      json: { error: "Not found" },
    });

    await signInAs("writeAdmin", "/webhooks");

    await expect(page.getByText("Needs Seamless Auth API v0.23")).toBeVisible();
  });
});
