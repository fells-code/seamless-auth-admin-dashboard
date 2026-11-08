/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { expect, test } from "../fixtures";
import type { MockApi } from "../mockApi";
import { confirmDialog, expectInlineAlert, expectToast } from "../helpers";
import { isoOffset, makeAuditSink, MINUTE } from "../factories";

function seedSinks(api: MockApi) {
  const otlp = makeAuditSink();
  const syslog = makeAuditSink({
    name: "Splunk",
    settings: {
      kind: "syslog",
      host: "siem.example.com",
      port: 6514,
      transport: "tls",
      appName: "seamless-auth",
      facility: 10,
    },
    status: {
      cursorSeq: 90,
      lagEvents: 30,
      lastDeliveredAt: isoOffset(-20 * MINUTE),
      lastFailure: "connection_failed",
      lastFailureAt: isoOffset(-1 * MINUTE),
    },
  });
  const sinks = [otlp, syslog];

  api.get("/admin/audit-sinks", () => ({ json: { sinks } }));
  api.post("/admin/audit-sinks", ({ payload }) => {
    const sink = makeAuditSink(payload as object);
    sinks.push(sink);
    return { status: 201, json: { sink } };
  });
  api.patch("/admin/audit-sinks/:id", ({ params, payload }) => {
    const sink = sinks.find((item) => item.id === params.id)!;
    Object.assign(sink, payload);
    return { json: { sink } };
  });
  api.post("/admin/audit-sinks/:id/test", {
    json: { ok: true, failure: null, statusCode: 200, durationMs: 45 },
  });
  api.delete("/admin/audit-sinks/:id", {
    json: { message: "Audit sink deleted" },
  });

  return { otlp, syslog };
}

test.describe("Audit streaming", () => {
  test("shows each sink's lag, last delivery and last failure", async ({
    page,
    api,
    signInAs,
  }) => {
    seedSinks(api);

    await signInAs("writeAdmin", "/audit-streaming");

    await expect(
      page.getByRole("heading", { name: "Audit streaming", level: 1 }),
    ).toBeVisible();
    const table = page.getByRole("table", { name: "Audit sinks" });
    await expect(table.getByText("Caught up")).toBeVisible();
    await expect(table.getByText("30 events behind")).toBeVisible();
    await expect(
      table.getByText("The API could not connect to the destination."),
    ).toBeVisible();
    await expect(
      table.getByText("Syslog siem.example.com:6514 over TLS"),
    ).toBeVisible();
  });

  test("creates an OTLP sink with a header named by env var", async ({
    page,
    api,
    signInAs,
  }) => {
    seedSinks(api);

    await signInAs("writeAdmin", "/audit-streaming");
    await page.getByRole("button", { name: "New sink" }).click();

    const form = page.getByRole("dialog");
    await form.getByLabel("Name", { exact: true }).fill("Honeycomb");
    await form.getByLabel("Collector URL").fill("https://api.honeycomb.io");
    await form.getByRole("button", { name: "Add header" }).click();
    await form.getByLabel("Header 1 name").fill("x-honeycomb-team");
    await form
      .getByLabel("Header 1 env var")
      .fill("HONEYCOMB_AUDIT_SINK_SECRET");
    await form.getByRole("button", { name: "Create sink" }).click();

    await expectToast(page, "Audit sink created");
    expect(api.lastCall("POST", "/admin/audit-sinks")?.payload).toEqual({
      name: "Honeycomb",
      enabled: true,
      settings: {
        kind: "otlp",
        endpoint: "https://api.honeycomb.io",
        serviceName: "seamless-auth",
        headersFromEnv: { "x-honeycomb-team": "HONEYCOMB_AUDIT_SINK_SECRET" },
      },
    });
  });

  test("never sends a header value pasted where an env var belongs", async ({
    page,
    api,
    signInAs,
  }) => {
    seedSinks(api);

    await signInAs("writeAdmin", "/audit-streaming");
    await page.getByRole("button", { name: "New sink" }).click();

    const form = page.getByRole("dialog");
    await form.getByLabel("Name", { exact: true }).fill("Datadog EU");
    await form.getByLabel("Collector URL").fill("https://otel.example.com");
    await form.getByRole("button", { name: "Add header" }).click();
    await form.getByLabel("Header 1 name").fill("DD-API-KEY");
    await form.getByLabel("Header 1 env var").fill("dd0123456789abcdef");
    await form.getByRole("button", { name: "Create sink" }).click();

    await expect(
      form.getByText(/must name an env var ending _AUDIT_SINK_SECRET/),
    ).toBeVisible();
    expect(api.recordedCalls("POST", "/admin/audit-sinks")).toHaveLength(0);
  });

  test("creates a syslog sink", async ({ page, api, signInAs }) => {
    seedSinks(api);

    await signInAs("writeAdmin", "/audit-streaming");
    await page.getByRole("button", { name: "New sink" }).click();

    const form = page.getByRole("dialog");
    await form.getByLabel("Name", { exact: true }).fill("Graylog");
    await form.getByLabel("Protocol").selectOption("syslog");
    await form.getByLabel("Host").fill("graylog.example.com");
    await form
      .getByLabel("CA certificate env var")
      .fill("GRAYLOG_CA_AUDIT_SINK_SECRET");
    await form.getByRole("button", { name: "Create sink" }).click();

    await expectToast(page, "Audit sink created");
    expect(api.lastCall("POST", "/admin/audit-sinks")?.payload).toMatchObject({
      settings: {
        kind: "syslog",
        host: "graylog.example.com",
        port: 6514,
        transport: "tls",
        facility: 10,
        tlsCaEnv: "GRAYLOG_CA_AUDIT_SINK_SECRET",
      },
    });
  });

  test("tests, turns off and deletes a sink", async ({
    page,
    api,
    signInAs,
  }) => {
    const { otlp } = seedSinks(api);

    await signInAs("writeAdmin", "/audit-streaming");

    await page.getByRole("button", { name: "Send test Datadog" }).click();
    await expect(
      page.getByText("Datadog accepted the test record"),
    ).toBeVisible();

    await page.getByRole("button", { name: "Turn off Datadog" }).click();
    await expectToast(page, "Audit sink turned off");
    expect(
      api.lastCall("PATCH", `/admin/audit-sinks/${otlp.id}`)?.payload,
    ).toEqual({ enabled: false });

    await page.getByRole("button", { name: "Delete Splunk" }).click();
    await confirmDialog(page, "Delete");
    await expectToast(page, "Audit sink deleted");
  });

  test("shows the reason for a refused test", async ({
    page,
    api,
    signInAs,
  }) => {
    seedSinks(api);
    api.post("/admin/audit-sinks/:id/test", {
      json: {
        ok: false,
        failure: "refused",
        statusCode: null,
        durationMs: 3,
      },
    });

    await signInAs("writeAdmin", "/audit-streaming");
    await page.getByRole("button", { name: "Send test Splunk" }).click();

    await expectInlineAlert(page, /CALLOUT_PRIVATE_HOSTS/);
  });

  test("hides writes from a read-only admin", async ({
    page,
    api,
    signInAs,
  }) => {
    seedSinks(api);

    await signInAs("readAdmin", "/audit-streaming");

    await expect(page.getByText("Read-only access")).toBeVisible();
    await expect(page.getByRole("button", { name: "New sink" })).toHaveCount(0);
  });

  test("says the API needs upgrading when the routes are missing", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/admin/audit-sinks", {
      status: 404,
      json: { error: "Not found" },
    });

    await signInAs("writeAdmin", "/audit-streaming");

    await expect(page.getByText("Needs Seamless Auth API v0.23")).toBeVisible();
  });
});
