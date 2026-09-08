/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
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
