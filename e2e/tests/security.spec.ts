/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { expect, test } from "../fixtures";
import { drainRetries, expectErrorState, statCard } from "../helpers";
import { makeAnomaly, makeLoginStats } from "../factories";

const ANOMALIES = [
  makeAnomaly({
    id: "anomaly_1",
    type: "login_failed",
    user_id: "user_1",
    ip_address: "198.51.100.7",
  }),
  makeAnomaly({
    id: "anomaly_2",
    type: "login_failed",
    user_id: null,
    ip_address: "198.51.100.8",
  }),
];

test.describe("Security", () => {
  test("renders the seeded signals and login statistics", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/internal/security/anomalies", {
      json: { suspiciousEvents: ANOMALIES, total: ANOMALIES.length },
    });

    await signInAs("writeAdmin", "/security");

    await expect(
      page.getByRole("heading", { name: "Security", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("198.51.100.7")).toBeVisible();
    await expect(statCard(page, "Successful Logins")).toContainText("900");
    await expect(statCard(page, "Failed Logins")).toContainText("100");
    await expect(statCard(page, "Success Rate")).toContainText("90%");
  });

  test("distinguishes a user-linked signal from a system-level one", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/internal/security/anomalies", {
      json: { suspiciousEvents: ANOMALIES, total: ANOMALIES.length },
    });

    await signInAs("writeAdmin", "/security");

    await expect(
      page.getByRole("link", { name: "User user_1" }),
    ).toHaveAttribute("href", "/users/user_1");
    await expect(page.getByText("System-level signal")).toBeVisible();
  });

  test("says when the feed returned fewer signals than it reported", async ({
    page,
    api,
    signInAs,
  }) => {
    // The header used the reported total while the table used what was
    // returned, so the two halves of the screen could disagree silently.
    api.get("/internal/security/anomalies", {
      json: { suspiciousEvents: ANOMALIES, total: 57 },
    });

    await signInAs("writeAdmin", "/security");

    await expect(statCard(page, "Suspicious Events")).toContainText(
      "Showing 2 of 57 reported signals",
    );
  });

  test("navigates from a signal into the filtered event feed", async ({
    page,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/security");

    await page.getByRole("button", { name: "Inspect failed logins" }).click();

    await expect(page).toHaveURL(/\/events\?type=login_failed$/);
  });

  test("reaches the full event stream", async ({ page, signInAs }) => {
    await signInAs("writeAdmin", "/security");

    await page.getByRole("button", { name: "View Full Event Stream" }).click();

    await expect(page).toHaveURL(/\/events$/);
  });

  test("renders a quiet feed cleanly", async ({ page, api, signInAs }) => {
    api.get("/internal/security/anomalies", {
      json: { suspiciousEvents: [], total: 0 },
    });
    api.get("/internal/auth-events/login-stats", {
      json: makeLoginStats({ success: 0, failed: 0, successRate: 0 }),
    });

    await signInAs("writeAdmin", "/security");

    await expect(
      page.getByText("No suspicious activity detected"),
    ).toBeVisible();
    await expect(statCard(page, "Suspicious Events")).toContainText("0");
  });

  test("holds a skeleton while the signals load", async ({
    page,
    api,
    signInAs,
  }) => {
    let release: (() => void) | undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });

    api.get("/internal/security/anomalies", async () => {
      await held;
      return { json: { suspiciousEvents: ANOMALIES, total: 2 } };
    });

    await signInAs("writeAdmin", "/security");
    await expect(page.getByRole("navigation")).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Security", level: 1 }),
    ).toBeHidden();

    release?.();

    await expect(
      page.getByRole("heading", { name: "Security", level: 1 }),
    ).toBeVisible();
  });

  test("surfaces a failed anomaly query with a retry", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/internal/security/anomalies", {
      status: 500,
      json: { error: "anomalies unavailable" },
    });

    await signInAs("writeAdmin", "/security");
    await drainRetries(page);

    await expectErrorState(page, "Could not load security signals");

    api.get("/internal/security/anomalies", {
      json: { suspiciousEvents: ANOMALIES, total: 2 },
    });
    await page.getByRole("button", { name: "Retry" }).click();

    await expect(page.getByText("198.51.100.7")).toBeVisible();
  });

  test("surfaces a failed login-stats query", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/internal/auth-events/login-stats", {
      status: 500,
      json: { error: "stats unavailable" },
    });

    await signInAs("writeAdmin", "/security");
    await drainRetries(page);

    await expectErrorState(page, "Could not load security signals");
  });
});

test.describe("Audit trail", () => {
  const HEAD = "ab".repeat(32);

  test("verifies the trail on request and shows the head", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/admin/auth-events/integrity", {
      json: {
        verified: true,
        checkedAt: "2026-09-28T12:00:00.000Z",
        rowsChecked: 1200,
        firstSeq: 1,
        lastSeq: 1200,
        anchorHash: null,
        head: { seq: 1200, hash: HEAD },
        firstFailure: null,
      },
    });

    await signInAs("writeAdmin", "/security");

    expect(
      api.recordedCalls("GET", "/admin/auth-events/integrity"),
    ).toHaveLength(0);
    await page.getByRole("button", { name: "Verify integrity" }).click();

    await expect(
      page.getByText(/Audit trail verified: 1200 events/),
    ).toBeVisible();
    await expect(page.getByText(`event 1200, ${HEAD}`)).toBeVisible();
  });

  test("reports a broken trail", async ({ page, api, signInAs }) => {
    api.get("/admin/auth-events/integrity", {
      json: {
        verified: false,
        checkedAt: "2026-09-28T12:00:00.000Z",
        rowsChecked: 1200,
        firstSeq: 1,
        lastSeq: 1200,
        anchorHash: null,
        head: { seq: 1200, hash: HEAD },
        firstFailure: { seq: 42, id: "event_42", reason: "sequence_gap" },
      },
    });

    await signInAs("writeAdmin", "/security");
    await page.getByRole("button", { name: "Verify integrity" }).click();

    await expect(
      page.getByText("Audit trail failed verification at event 42"),
    ).toBeVisible();
  });

  test("exports a period as the API's NDJSON file", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/admin/auth-events/export", {
      body: '{"seq":1}\n{"type":"manifest","count":1}\n',
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "content-disposition":
          'attachment; filename="auth-events-2026-09-28.ndjson"',
      },
    });

    await signInAs("writeAdmin", "/security");

    await page.getByLabel("From (UTC)").fill("2026-09-01");
    await page.getByLabel("To (UTC, included)").fill("2026-09-30");

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export events" }).click();

    expect((await download).suggestedFilename()).toBe(
      "auth-events-2026-09-28.ndjson",
    );
    const call = api.lastCall("GET", "/admin/auth-events/export");
    const params = new URL(call!.url).searchParams;
    expect(params.get("from")).toBe("2026-09-01T00:00:00.000Z");
    expect(params.get("to")).toBe("2026-10-01T00:00:00.000Z");
  });
});
