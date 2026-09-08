/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { expect, test } from "../fixtures";
import {
  confirmDialog,
  drainRetries,
  expectErrorState,
  expectToast,
} from "../helpers";
import { makeSystemConfig } from "../factories";

test.describe("System Configuration", () => {
  test("renders the current configuration", async ({ page, signInAs }) => {
    await signInAs("writeAdmin", "/system");

    await expect(
      page.getByRole("heading", { name: "System Configuration", level: 1 }),
    ).toBeVisible();
    await expect(page.getByLabel("App Name")).toHaveValue("Seamless Auth");
    await expect(page.getByLabel("Access Token TTL")).toHaveValue("15m");
    await expect(page.getByLabel("RP ID")).toHaveValue("localhost");
    await expect(
      page.getByRole("checkbox", { name: /passkeys/i }),
    ).toBeChecked();
  });

  test("sends only the section that changed", async ({
    page,
    api,
    signInAs,
  }) => {
    // The PATCH body schema is strict and rejects the read-only keys the GET
    // returns, so echoing the whole config back fails.
    await signInAs("writeAdmin", "/system");

    await page.getByLabel("App Name").fill("Seamless Auth Console");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expectToast(page, "Configuration saved");
    expect(api.lastCall("PATCH", "/system-config/admin")?.payload).toEqual({
      app_name: "Seamless Auth Console",
    });
  });

  test("adds and removes a scoped role", async ({ page, api, signInAs }) => {
    await signInAs("writeAdmin", "/system");

    await page.getByLabel("Add a role").fill("support:read");
    await page.getByLabel("Add a role").press("Enter");

    await expect(page.getByText("support:read").first()).toBeVisible();

    await page
      .getByRole("button", { name: "Remove admin:read from available roles" })
      .click();
    await confirmDialog(page, "Remove");

    await page.getByRole("button", { name: "Save Changes" }).click();

    await expectToast(page, "Configuration saved");
    expect(
      api.lastCall("PATCH", "/system-config/admin")?.payload,
    ).toMatchObject({
      available_roles: ["user", "admin:write", "support:read"],
    });
  });

  test("toggles a login method and refuses to disable the last one", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/system-config/admin", {
      json: makeSystemConfig({ login_methods: ["passkey"] }),
    });

    await signInAs("writeAdmin", "/system");

    // The last enabled method cannot be turned off: nobody could sign in.
    await expect(
      page.getByRole("checkbox", { name: /passkeys/i }),
    ).toBeDisabled();

    await page.getByRole("checkbox", { name: /email otp/i }).check();
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expectToast(page, "Configuration saved");
    expect(
      api.lastCall("PATCH", "/system-config/admin")?.payload,
    ).toMatchObject({ login_methods: ["passkey", "email_otp"] });
  });

  test("edits the lockout policy", async ({ page, api, signInAs }) => {
    await signInAs("writeAdmin", "/system");

    await page.getByLabel("Max Failures").fill("5");
    await page.getByLabel("Lockout Seconds").fill("1800");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expectToast(page, "Configuration saved");
    expect(
      api.lastCall("PATCH", "/system-config/admin")?.payload,
    ).toMatchObject({
      lockout_policy: {
        enabled: true,
        maxFailures: 5,
        windowSeconds: 900,
        lockoutSeconds: 1800,
      },
    });
  });

  test("refuses a lockout threshold of zero", async ({
    page,
    api,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/system");

    // Clearing the field used to stage a 0, which changes authentication
    // behaviour drastically with nothing saying so.
    await page.getByLabel("Max Failures").fill("");

    await expect(
      page.getByText("Enter a whole number of 1 or greater."),
    ).toBeVisible();
    expect(api.recordedCalls("PATCH", "/system-config/admin")).toHaveLength(0);
  });

  test("adds an OAuth provider without ever collecting a secret", async ({
    page,
    api,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/system");

    await page.getByLabel("Provider ID").fill("google");
    await page.getByLabel("Display Name").fill("Google");
    await page.getByLabel("Client ID").fill("client-abc");
    await page.getByLabel("Client Secret Env").fill("GOOGLE_CLIENT_SECRET");
    await page
      .getByLabel("Authorization URL")
      .fill("https://accounts.google.com/o/oauth2/v2/auth");
    await page
      .getByLabel("Token URL")
      .fill("https://oauth2.googleapis.com/token");
    await page
      .getByLabel("User Info URL")
      .fill("https://openidconnect.googleapis.com/v1/userinfo");

    await page.getByRole("button", { name: "Add Provider" }).click();
    await expectToast(page, "Provider added");

    const payload = api.lastCall("POST", "/system-config/oauth-providers")
      ?.payload as Record<string, unknown>;

    expect(payload).toMatchObject({
      id: "google",
      clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    });
    // The secret value itself never reaches the browser or the request.
    expect(Object.keys(payload)).not.toContain("clientSecret");
  });

  test("rejects a provider URL that is not absolute", async ({
    page,
    api,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/system");

    await page.getByLabel("Provider ID").fill("google");
    await page.getByLabel("Display Name").fill("Google");
    await page.getByLabel("Client ID").fill("client-abc");
    await page.getByLabel("Client Secret Env").fill("GOOGLE_CLIENT_SECRET");
    await page.getByLabel("Authorization URL").fill("accounts.google.com");
    await page
      .getByLabel("Token URL")
      .fill("https://oauth2.googleapis.com/token");
    await page
      .getByLabel("User Info URL")
      .fill("https://openidconnect.googleapis.com/v1/userinfo");

    await page.getByRole("button", { name: "Add Provider" }).click();

    // These are typed as URLs upstream, so a malformed value would otherwise be
    // rejected by the API rather than by anything the operator can see.
    await expect(
      page.getByText("Enter a full URL, including https://.").first(),
    ).toBeVisible();
    expect(
      api.recordedCalls("POST", "/system-config/oauth-providers"),
    ).toHaveLength(0);
  });

  test("warns before a relying-party change that invalidates every passkey", async ({
    page,
    api,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/system");

    await page.getByLabel("RP ID").fill("console.example.com");
    await page.getByRole("button", { name: "Save Changes" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("invalidates every passkey");

    await dialog.getByRole("button", { name: "Cancel" }).click();

    expect(api.recordedCalls("PATCH", "/system-config/admin")).toHaveLength(0);
  });

  test("discards staged changes behind a confirmation", async ({
    page,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/system");

    await page.getByLabel("App Name").fill("Something else");
    await expect(page.getByText("Unsaved configuration changes")).toBeVisible();

    await page.getByRole("button", { name: "Discard" }).click();
    await confirmDialog(page, "Discard");

    await expect(page.getByLabel("App Name")).toHaveValue("Seamless Auth");
    await expect(page.getByText("Configuration is up to date")).toBeVisible();
  });

  test("reports a save the API refused", async ({ page, api, signInAs }) => {
    api.patch("/system-config/admin", {
      status: 400,
      json: {
        error: "Invalid roles",
        message: "Roles not available on this instance: admin:reed",
      },
    });

    await signInAs("writeAdmin", "/system");

    await page.getByLabel("App Name").fill("Seamless Auth Console");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expectToast(page, "Configuration save failed");
    // The detail is what an operator can act on, so it wins over the reason.
    await expectToast(page, /Roles not available on this instance/);
  });

  test("surfaces a failed load", async ({ page, api, signInAs }) => {
    api.get("/system-config/admin", {
      status: 500,
      json: { error: "config unavailable" },
    });

    await signInAs("writeAdmin", "/system");
    await drainRetries(page);

    await expectErrorState(page, "Could not load system configuration");
  });
});
