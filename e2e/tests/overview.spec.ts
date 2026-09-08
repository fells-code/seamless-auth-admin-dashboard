/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { expect, test } from "../fixtures";
import { drainRetries, expectErrorState, statCard } from "../helpers";
import { makeDashboardMetrics, makeTimeseries } from "../factories";

test.describe("Overview", () => {
  test("renders the seeded deployment metrics", async ({ page, signInAs }) => {
    await signInAs("writeAdmin");

    await expect(
      page.getByRole("heading", { name: "Overview", level: 1 }),
    ).toBeVisible();

    // Asserted through the labelled tile rather than by hunting for a bare
    // number, which any other tile could also render.
    await expect(statCard(page, "Users")).toContainText("128");
    await expect(statCard(page, "Users")).toContainText(
      "7 new in the last 24 hours",
    );
  });

  test("renders both charts without a runtime error", async ({
    page,
    signInAs,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await signInAs("writeAdmin");

    await expect(page.getByText("Login Activity")).toBeVisible();
    await expect(page.getByText("Event Distribution")).toBeVisible();

    // Recharts renders into SVG, so the chart either drew or it did not.
    await expect(page.locator(".recharts-wrapper").first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("reaches the investigation destinations", async ({ page, signInAs }) => {
    await signInAs("writeAdmin");

    await page.getByRole("button", { name: "Open Security" }).click();
    await expect(page).toHaveURL(/\/security$/);

    await page.goBack();
    await page.getByRole("button", { name: "Review Users" }).click();
    await expect(page).toHaveURL(/\/users$/);

    await page.goBack();
    await page.getByRole("button", { name: "Inspect Events" }).click();
    await expect(page).toHaveURL(/\/events$/);
  });

  test("shows skeletons while the metrics are in flight", async ({
    page,
    api,
    signInAs,
  }) => {
    let release: (() => void) | undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });

    api.get("/internal/metrics/dashboard", async () => {
      await held;
      return { json: makeDashboardMetrics() };
    });

    await signInAs("writeAdmin");
    await expect(page.getByRole("navigation")).toBeVisible();

    await expect(page.getByText("Current storage footprint")).toBeHidden();

    release?.();

    await expect(page.getByText("Current storage footprint")).toBeVisible();
  });

  test("renders cleanly against an empty deployment", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/internal/metrics/dashboard", {
      json: makeDashboardMetrics({
        totalUsers: 0,
        activeSessions: 0,
        newUsers24h: 0,
        loginSuccess24h: 0,
        loginFailed24h: 0,
        successRate24h: 0,
        passkeyUsage24h: 0,
        databaseSize: 0,
      }),
    });
    api.get("/internal/auth-events/timeseries", { json: { timeseries: [] } });
    api.get("/internal/auth-events/summary", { json: { summary: [] } });

    await signInAs("writeAdmin");

    // With no attempts there is no rate to report. Deriving one anyway put
    // "100%" next to "Elevated enough to merit review" on the landing screen,
    // which reads as a complete authentication outage.
    await expect(statCard(page, "Failure Rate")).toContainText("n/a");
    await expect(statCard(page, "Failure Rate")).toContainText(
      "No authentication attempts in this window",
    );
  });

  test("surfaces a failed metrics query", async ({ page, api, signInAs }) => {
    api.get("/internal/metrics/dashboard", {
      status: 500,
      json: { error: "metrics unavailable" },
    });

    await signInAs("writeAdmin");
    await drainRetries(page);

    await expectErrorState(page, "Could not load overview metrics");
  });

  test("keeps the page up when only a chart query fails", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/internal/auth-events/timeseries", {
      status: 500,
      json: { error: "timeseries unavailable" },
    });

    await signInAs("writeAdmin");
    await drainRetries(page);

    await expect(page.getByText("Login activity unavailable")).toBeVisible();
    // The rest of the screen is still worth reading.
    await expect(page.getByText("Event Distribution")).toBeVisible();
  });

  test("refreshes every panel from one control", async ({
    page,
    api,
    signInAs,
  }) => {
    await signInAs("writeAdmin");
    await expect(page.getByRole("navigation")).toBeVisible();

    api.get("/internal/metrics/dashboard", {
      json: makeDashboardMetrics({ totalUsers: 999 }),
    });
    api.get("/internal/auth-events/timeseries", { json: makeTimeseries(3) });

    await page.getByRole("button", { name: /refresh/i }).click();

    await expect(page.getByText("999")).toBeVisible();
  });
});
