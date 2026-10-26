/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { expect, test } from "../fixtures";
import { confirmDialog, expectToast } from "../helpers";
import { makePolicy, makePolicyDryRun, makePolicyVersion } from "../factories";
import type { MockApi } from "../mockApi";

const published = makePolicyVersion({ version: 1 });
const draftPolicy = makePolicy({ login_methods: ["passkey"] });

function seedDraft(api: MockApi) {
  api.get("/system-config/policy", {
    json: {
      published,
      draft: {
        policy: draftPolicy,
        basedOnVersion: 1,
        updatedAt: published.publishedAt,
        updatedBy: "user_admin",
      },
    },
  });
}

test.describe("Sign-in Policy", () => {
  test("shows the published policy and its history to a read-only admin", async ({
    page,
    signInAs,
  }) => {
    await signInAs("readAdmin", "/policy");

    await expect(
      page.getByRole("heading", { name: "Sign-in Policy", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("Read-only access")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start Draft" })).toHaveCount(
      0,
    );

    const history = page.getByRole("table", { name: "Policy versions" });
    await expect(history.getByText("Initial policy")).toBeVisible();
  });

  test("saves a draft from the published policy", async ({
    page,
    api,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/policy");

    await page.getByRole("button", { name: "Start Draft" }).click();
    await page.getByRole("checkbox", { name: /^magic links/i }).click();
    await page.getByRole("button", { name: "Save Draft" }).click();

    await expectToast(page, "Draft saved");
    expect(
      api.lastCall("PUT", "/system-config/policy/draft")?.payload,
    ).toMatchObject({ policy: { login_methods: ["passkey", "email_otp"] } });
  });

  test("dry runs the draft and lists who it would refuse", async ({
    page,
    api,
    signInAs,
  }) => {
    seedDraft(api);
    api.post("/system-config/policy/dry-run", {
      json: makePolicyDryRun({
        signInsEvaluated: 12,
        usersEvaluated: 3,
        usersLockedOut: 1,
        breakGlassAccounts: 1,
        wouldFail: [
          {
            userId: "user_1",
            email: "ada@example.com",
            signIns: 4,
            reasons: ["method_disabled"],
            lockedOut: true,
          },
        ],
      }),
    });
    await signInAs("writeAdmin", "/policy");

    await page.getByLabel("Days of sign-ins").fill("14");
    await page.getByRole("button", { name: "Run Dry Run" }).click();

    await expect(
      page.getByText("This draft would lock accounts out"),
    ).toBeVisible();
    await expect(page.getByText("1 break-glass account")).toBeVisible();
    await expect(
      page
        .getByRole("table", { name: "Accounts the draft would refuse" })
        .getByRole("link", { name: "ada@example.com" }),
    ).toBeVisible();
    expect(
      api.lastCall("POST", "/system-config/policy/dry-run")?.payload,
    ).toEqual({ days: 14 });
  });

  test("publishes the draft against the reviewed version", async ({
    page,
    api,
    signInAs,
  }) => {
    seedDraft(api);
    api.post("/system-config/policy/publish", {
      json: makePolicyVersion({
        version: 2,
        policy: draftPolicy,
        source: "publish",
      }),
    });
    await signInAs("writeAdmin", "/policy");

    await page.getByRole("button", { name: "Publish" }).click();
    await confirmDialog(page, "Publish");

    await expectToast(page, "Version 2 published");
    expect(
      api.lastCall("POST", "/system-config/policy/publish")?.payload,
    ).toEqual({ expectedVersion: 1 });
  });

  test("retries a publish the API refused for a lapsed step-up", async ({
    page,
    api,
    signInAs,
  }) => {
    seedDraft(api);
    let attempts = 0;
    api.post("/system-config/policy/publish", () => {
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
        : makePolicyVersion({ version: 2, source: "publish" });
    });
    await signInAs("writeAdmin", "/policy");

    await page.getByRole("button", { name: "Publish" }).click();
    await confirmDialog(page, "Publish");

    await expectToast(page, "Version 2 published");
    expect(attempts).toBe(2);
  });

  test("reloads and explains a publish that lost to another version", async ({
    page,
    api,
    signInAs,
  }) => {
    seedDraft(api);
    api.post("/system-config/policy/publish", {
      status: 409,
      json: {
        error: "policy_version_conflict",
        message: "Version 2 is the published policy now. Review it and retry.",
      },
    });
    await signInAs("writeAdmin", "/policy");

    await page.getByRole("button", { name: "Publish" }).click();
    await confirmDialog(page, "Publish");

    await expect(page.getByText("Another version was published")).toBeVisible();
    await expect(
      page.getByText(/Version 2 is the published policy now/).first(),
    ).toBeVisible();
  });
});
