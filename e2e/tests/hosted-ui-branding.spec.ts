/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { expect, test } from "../fixtures";
import { confirmDialog, expectToast } from "../helpers";
import { makeSystemConfig } from "../factories";

const BRANDED = {
  appName: "Acme",
  logoUrl: "https://cdn.acme.test/logo.svg",
  colors: { text: "#111111" },
};

test.describe("Hosted page branding", () => {
  test("saves the whole branding object", async ({ page, api, signInAs }) => {
    api.get("/system-config/admin", {
      json: makeSystemConfig({ hosted_ui: BRANDED }),
    });
    await signInAs("writeAdmin", "/system");

    await expect(page.getByLabel("Brand Name", { exact: true })).toHaveValue(
      "Acme",
    );
    await page.getByLabel("Primary", { exact: true }).fill("#0b3d91");
    await page.getByLabel("Font Family").fill("Inter, 'Segoe UI', sans-serif");

    await expect(
      page.getByRole("figure", { name: "Sign-in page preview" }),
    ).toContainText("Sign in to Acme");

    await page.getByRole("button", { name: "Save Branding" }).click();

    await expectToast(page, "Branding saved");
    expect(api.lastCall("PATCH", "/system-config/admin")?.payload).toEqual({
      hosted_ui: {
        ...BRANDED,
        colors: { text: "#111111", primary: "#0b3d91" },
        fontFamily: "Inter, 'Segoe UI', sans-serif",
      },
    });
  });

  test("warns about low contrast but still saves", async ({
    page,
    api,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/system");

    await page.getByLabel("Primary", { exact: true }).fill("#ffd400");

    await expect(
      page.getByText("2 color pairs are below WCAG 2.2 AA"),
    ).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Contrast checks" }),
    ).toContainText("below 3:1");

    await page.getByRole("button", { name: "Save Branding" }).click();

    await expectToast(page, "Branding saved");
    expect(api.lastCall("PATCH", "/system-config/admin")?.payload).toEqual({
      hosted_ui: { colors: { primary: "#ffd400" } },
    });
  });

  test("shows field errors and sends nothing for an invalid value", async ({
    page,
    api,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/system");

    await page.getByLabel("Logo URL").fill("http://cdn.acme.test/logo.svg");
    await page.getByRole("button", { name: "Save Branding" }).click();

    await expect(
      page.getByText("Enter an https URL of 2048 characters or fewer."),
    ).toBeVisible();
    await expect(page.getByLabel("Logo URL")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(api.recordedCalls("PATCH", "/system-config/admin")).toHaveLength(0);
  });

  test("resets to the defaults by writing null", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/system-config/admin", {
      json: makeSystemConfig({ hosted_ui: BRANDED }),
    });
    await signInAs("writeAdmin", "/system");

    await page.getByRole("button", { name: "Reset to Defaults" }).click();
    await confirmDialog(page, "Reset");

    await expectToast(page, "Branding reset");
    expect(api.lastCall("PATCH", "/system-config/admin")?.payload).toEqual({
      hosted_ui: null,
    });
  });

  test("retries a save the API refused for a lapsed step-up", async ({
    page,
    api,
    signInAs,
  }) => {
    let attempts = 0;
    api.patch("/system-config/admin", ({ payload }) => {
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
        : { config: makeSystemConfig(payload as object) };
    });
    await signInAs("writeAdmin", "/system");

    await page.getByLabel("Brand Name", { exact: true }).fill("Acme");
    await page.getByRole("button", { name: "Save Branding" }).click();

    await expectToast(page, "Branding saved");
    expect(attempts).toBe(2);
  });

  test("is read only for a read-only administrator", async ({
    page,
    signInAs,
  }) => {
    await signInAs("readAdmin", "/system");

    await expect(page.getByLabel("Brand Name", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("Primary", { exact: true })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Save Branding" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Reset to Defaults" }),
    ).toBeDisabled();
  });
});
