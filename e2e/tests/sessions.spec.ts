/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { expect, test } from "../fixtures";
import {
  confirmDialog,
  dismissDialog,
  drainRetries,
  expectErrorState,
  expectToast,
} from "../helpers";
import { makeMeUser, makeSession, makeStepUpStatus } from "../factories";

test.describe("Sessions", () => {
  test("lists the seeded sessions with their metadata", async ({
    page,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/sessions");

    await expect(
      page.getByRole("heading", { name: "Sessions", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("203.0.113.10")).toBeVisible();
    await expect(page.getByText("203.0.113.11")).toBeVisible();
    // The user agent is summarised rather than dumped raw.
    await expect(page.getByText("Chrome").first()).toBeVisible();
  });

  test("revokes a session behind a confirmation and step-up", async ({
    page,
    api,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/sessions");

    await page
      .getByRole("button", { name: /Revoke session from 203.0.113.10/ })
      .click();
    await confirmDialog(page, "Revoke");

    await expectToast(page, "Session revoked");
    expect(
      api.lastCall("DELETE", "/admin/sessions/by-id/session_1"),
    ).toBeTruthy();
  });

  test("sends nothing when the confirmation is dismissed", async ({
    page,
    api,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/sessions");

    await page
      .getByRole("button", { name: /Revoke session from 203.0.113.10/ })
      .click();
    await dismissDialog(page);

    expect(
      api.recordedCalls("DELETE", "/admin/sessions/by-id/session_1"),
    ).toHaveLength(0);
  });

  test("aborts the revoke when the passkey ceremony fails", async ({
    page,
    api,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/sessions");
    await expect(page.getByText("203.0.113.10")).toBeVisible();

    api.get("/step-up/status", { json: makeStepUpStatus({ fresh: false }) });
    api.post("/step-up/webauthn/start", {
      status: 400,
      json: { error: "no challenge" },
    });

    await page
      .getByRole("button", { name: /Revoke session from 203.0.113.10/ })
      .click();
    await confirmDialog(page, "Revoke");

    await expectToast(page, "Step-up verification failed");
    expect(
      api.recordedCalls("DELETE", "/admin/sessions/by-id/session_1"),
    ).toHaveLength(0);
  });

  test("explains that an account with no second factor cannot step up", async ({
    page,
    api,
  }) => {
    // Routine with OAuth, where an admin may never have enrolled a passkey.
    // Going straight to a WebAuthn ceremony there produced a generic failure
    // with no cause and no way forward.
    api.get("/users/me", {
      json: {
        user: makeMeUser({ roles: ["admin:write"] }),
        credentials: [],
        organizations: [],
        activeOrganization: null,
      },
    });
    api.get("/step-up/status", { json: makeStepUpStatus({ fresh: false }) });

    await page.goto("/sessions");
    await expect(page.getByText("203.0.113.10")).toBeVisible();

    await page
      .getByRole("button", { name: /Revoke session from 203.0.113.10/ })
      .click();
    await confirmDialog(page, "Revoke");

    await expectToast(page, /security key or authenticator is required/i);
    expect(
      api.recordedCalls("DELETE", "/admin/sessions/by-id/session_1"),
    ).toHaveLength(0);
  });

  test("reports a revoke the API refused", async ({ page, api, signInAs }) => {
    api.delete("/admin/sessions/by-id/:id", {
      status: 409,
      json: { error: "Session already revoked" },
    });

    await signInAs("writeAdmin", "/sessions");

    await page
      .getByRole("button", { name: /Revoke session from 203.0.113.10/ })
      .click();
    await confirmDialog(page, "Revoke");

    await expectToast(page, "Session revoke failed");
  });

  test("renders an empty inventory cleanly", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/admin/sessions", { json: { sessions: [], total: 0 } });

    await signInAs("writeAdmin", "/sessions");

    await expect(page.getByText("No sessions match this view")).toBeVisible();
  });

  test("holds a skeleton while the inventory loads", async ({
    page,
    api,
    signInAs,
  }) => {
    let release: (() => void) | undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });

    api.get("/admin/sessions", async () => {
      await held;
      return {
        json: { sessions: [makeSession({ id: "session_late" })], total: 1 },
      };
    });

    await signInAs("writeAdmin", "/sessions");
    await expect(page.getByRole("navigation")).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Sessions", level: 1 }),
    ).toBeHidden();

    release?.();

    await expect(
      page.getByRole("heading", { name: "Sessions", level: 1 }),
    ).toBeVisible();
  });

  test("surfaces a failed load with a retry", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/admin/sessions", {
      status: 500,
      json: { error: "sessions unavailable" },
    });

    await signInAs("writeAdmin", "/sessions");
    await drainRetries(page);

    await expectErrorState(page, "Could not load sessions");

    api.get("/admin/sessions", {
      json: {
        sessions: [
          makeSession({ id: "session_recovered", ipAddress: "198.51.100.4" }),
        ],
        total: 1,
      },
    });
    await page.getByRole("button", { name: "Retry" }).click();

    await expect(page.getByText("198.51.100.4")).toBeVisible();
  });

  test("filters the loaded rows by search", async ({ page, signInAs }) => {
    await signInAs("writeAdmin", "/sessions");

    await page.getByPlaceholder(/Search/).fill("203.0.113.11");

    await expect(page.getByText("203.0.113.11")).toBeVisible();
    await expect(page.getByText("203.0.113.10")).toBeHidden();
  });
});
