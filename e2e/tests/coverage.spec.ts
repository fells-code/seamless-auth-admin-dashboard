/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { expect, test } from "../fixtures";
import { statCard } from "../helpers";
import { makeCoverageReport } from "../factories";

test.describe("Authentication coverage", () => {
  test("shows coverage, sign-in mix and the enforced policy", async ({
    page,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/coverage");

    await expect(
      page.getByRole("heading", { name: "Authentication coverage", level: 1 }),
    ).toBeVisible();
    await expect(statCard(page, "Passkey Coverage")).toContainText("75.0%");
    await expect(statCard(page, "Phishing-Resistant Sign-Ins")).toContainText(
      "64.0%",
    );
    await expect(
      page.getByRole("table", { name: "Coverage by organization" }),
    ).toContainText("Clerk's Office");
    await expect(
      page.getByRole("table", { name: "Authenticator mix" }),
    ).toContainText("iCloud Keychain");
  });

  test("asks the API for the chosen filters", async ({
    page,
    api,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/coverage");

    await page.getByLabel("Trend by").selectOption("week");

    await expect
      .poll(() => {
        const call = api.lastCall(
          "GET",
          "/admin/reports/authentication-coverage",
        );
        return call ? new URL(call.url).searchParams.get("bucket") : null;
      })
      .toBe("week");
  });

  test("downloads the API's CSV under the name it gives", async ({
    page,
    api,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/coverage");

    api.get("/admin/reports/authentication-coverage", ({ url }) =>
      url.searchParams.get("format") === "csv"
        ? {
            body: "Section,Field,Value\r\nCoverage,Users,40\r\n",
            headers: {
              "content-type": "text/csv; charset=utf-8",
              "content-disposition":
                'attachment; filename="authentication-coverage-2026-07-01-to-2026-09-28.csv"',
            },
          }
        : makeCoverageReport(),
    );

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download CSV" }).click();

    expect((await download).suggestedFilename()).toBe(
      "authentication-coverage-2026-07-01-to-2026-09-28.csv",
    );
  });
});
