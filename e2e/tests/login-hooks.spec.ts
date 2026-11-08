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
  makeLoginHook,
  makeLoginHookInvocation,
} from "../factories";

const SECRET = `whsec_${"B".repeat(43)}=`;

function seedHooks(api: MockApi, hooks = [makeLoginHook()]) {
  api.get("/admin/login-hooks", () => ({ json: { hooks } }));
  api.get("/admin/login-hooks/:trigger/invocations", ({ params }) => ({
    json: {
      invocations:
        params.trigger === "post_login"
          ? [
              makeLoginHookInvocation({
                outcome: "failed_closed",
                failure: "timed_out",
                statusCode: null,
                durationMs: 2000,
              }),
            ]
          : [],
    },
  }));
  api.put("/admin/login-hooks/:trigger", ({ params, payload }) => {
    const existing = hooks.find((hook) => hook.trigger === params.trigger);
    const hook = makeLoginHook({
      ...(payload as object),
      trigger: params.trigger as "post_login" | "pre_token",
    });
    if (existing) {
      Object.assign(existing, hook);
      return { json: { hook } };
    }
    hooks.push(hook);
    return { status: 201, json: { hook, secret: SECRET } };
  });
  api.post("/admin/login-hooks/:trigger/secret", {
    json: { secret: SECRET, previousSecretExpiresAt: isoOffset(24 * HOUR) },
  });
  api.post("/admin/login-hooks/:trigger/test", {
    json: { ok: true, failure: null, statusCode: 200, durationMs: 80 },
  });
  api.delete("/admin/login-hooks/:trigger", {
    json: { message: "Login hook deleted" },
  });
}

test.describe("Login hooks", () => {
  test("explains the triggers, failure modes and break-glass", async ({
    page,
    api,
    signInAs,
  }) => {
    seedHooks(api);

    await signInAs("writeAdmin", "/login-hooks");

    await expect(
      page.getByRole("heading", { name: "Login hooks", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("Break-glass and recovery never call a hook"),
    ).toBeVisible();
    await expect(page.getByText(/Fail closed\./)).toBeVisible();
    await expect(
      page
        .getByRole("table", { name: "post_login invocations" })
        .getByText("Failed, sign-in refused"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Set up pre_token" }),
    ).toBeVisible();
  });

  test("sets up a hook and shows its secret once", async ({
    page,
    api,
    signInAs,
  }) => {
    seedHooks(api);

    await signInAs("writeAdmin", "/login-hooks");
    await page.getByRole("button", { name: "Set up pre_token" }).click();

    const form = page.getByRole("dialog");
    await form.getByLabel("URL").fill("https://hooks.example.com/claims");
    await form.getByLabel("Timeout (ms)").fill("800");
    await form.getByLabel(/Fail open/).check();
    await form.getByRole("button", { name: "Create hook" }).click();

    await expectToast(page, "Login hook saved");
    expect(
      api.lastCall("PUT", "/admin/login-hooks/pre_token")?.payload,
    ).toEqual({
      url: "https://hooks.example.com/claims",
      timeoutMs: 800,
      failureMode: "open",
      enabled: true,
    });
    await expect(
      page.getByRole("dialog", { name: "Signing secret" }).getByRole("textbox"),
    ).toHaveValue(SECRET);
  });

  test("refuses a timeout outside 100 to 5000 ms before step-up", async ({
    page,
    api,
    signInAs,
  }) => {
    seedHooks(api);

    await signInAs("writeAdmin", "/login-hooks");
    await page.getByRole("button", { name: "Edit post_login" }).click();

    const form = page.getByRole("dialog");
    await form.getByLabel("Timeout (ms)").fill("9000");
    await form.getByRole("button", { name: "Save" }).click();

    await expect(form.getByText(/timeoutMs/)).toBeVisible();
    expect(
      api.recordedCalls("PUT", "/admin/login-hooks/post_login"),
    ).toHaveLength(0);
  });

  test("tests, rotates and deletes a hook", async ({ page, api, signInAs }) => {
    seedHooks(api);

    await signInAs("writeAdmin", "/login-hooks");

    await page.getByRole("button", { name: "Send test post_login" }).click();
    await expect(page.getByText(/answered the test call/)).toBeVisible();

    await page
      .getByRole("button", { name: "Rotate secret post_login" })
      .click();
    // The secret dialog opens as soon as the confirmation closes, so wait on
    // the confirmation by name: "no dialog" is never a state the page reaches.
    const confirmation = page.getByRole("dialog", {
      name: "Rotate signing secret",
    });
    await confirmation.getByRole("button", { name: "Rotate" }).click();
    await expect(confirmation).toBeHidden();
    await expect(
      page
        .getByRole("dialog", { name: "Signing secret" })
        .getByText(/for 24 hours/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();

    await page.getByRole("button", { name: "Delete post_login" }).click();
    await confirmDialog(page, "Delete");
    await expectToast(page, "Login hook deleted");
  });

  test("shows a refused write", async ({ page, api, signInAs }) => {
    seedHooks(api);
    api.post("/admin/login-hooks/:trigger/secret", {
      status: 409,
      json: {
        error:
          "CALLOUT_SECRET_ENCRYPTION_KEY must be set before a login hook can be created",
      },
    });

    await signInAs("writeAdmin", "/login-hooks");
    await page
      .getByRole("button", { name: "Rotate secret post_login" })
      .click();
    // The secret dialog opens as soon as the confirmation closes, so wait on
    // the confirmation by name: "no dialog" is never a state the page reaches.
    const confirmation = page.getByRole("dialog", {
      name: "Rotate signing secret",
    });
    await confirmation.getByRole("button", { name: "Rotate" }).click();
    await expect(confirmation).toBeHidden();

    await expectInlineAlert(page, /CALLOUT_SECRET_ENCRYPTION_KEY must be set/);
  });

  test("hides writes from a read-only admin", async ({
    page,
    api,
    signInAs,
  }) => {
    seedHooks(api);

    await signInAs("readAdmin", "/login-hooks");

    await expect(page.getByText("Read-only access")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Set up / })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Delete / })).toHaveCount(0);
  });

  test("says the API needs upgrading when the routes are missing", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/admin/login-hooks", {
      status: 404,
      json: { error: "Not found" },
    });

    await signInAs("writeAdmin", "/login-hooks");

    await expect(page.getByText("Needs Seamless Auth API v0.23")).toBeVisible();
  });
});
