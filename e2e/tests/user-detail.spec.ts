/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { expect, test } from "../fixtures";
import type { MockApi } from "../mockApi";
import {
  confirmDialog,
  detailTab,
  drainRetries,
  expectErrorState,
  expectToast,
} from "../helpers";
import {
  makeCredential,
  makeEvent,
  makeSession,
  makeTimeseries,
  makeUser,
} from "../factories";

const USER = makeUser({
  id: "user_1",
  email: "ada@example.com",
  roles: ["user", "admin:read"],
  verified: true,
});

/** The detail response, with sessions the revoke actions can act on. */
function seedDetail(
  api: MockApi,
  sessions = [makeSession({ id: "session_1" })],
) {
  const state = { sessions: [...sessions] };

  api.get("/admin/users/:userId", () => ({
    json: {
      user: USER,
      sessions: state.sessions,
      credentials: [
        makeCredential({
          id: "credential_1",
          friendlyName: "MacBook Touch ID",
        }),
      ],
      events: [makeEvent({ id: "event_1", type: "login_success" })],
    },
  }));

  api.delete("/admin/sessions/by-id/:id", ({ params }) => {
    state.sessions = state.sessions.filter(
      (session) => session.id !== params.id,
    );
    return { json: { message: "Revoked" } };
  });

  api.delete("/admin/sessions/:userId/revoke-all", () => {
    const revoked = state.sessions.length;
    state.sessions = [];
    return { json: { revoked } };
  });

  api.get("/internal/auth-events/timeseries", { json: makeTimeseries(4) });

  return state;
}

test.describe("user detail", () => {
  test("renders the profile, roles, and verification state", async ({
    page,
    api,
    signInAs,
  }) => {
    seedDetail(api);

    await signInAs("writeAdmin", "/users/user_1");

    await expect(
      page.getByRole("heading", { name: "ada@example.com", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("admin:read")).toBeVisible();
  });

  test("moves between the detail tabs", async ({ page, api, signInAs }) => {
    seedDetail(api);

    await signInAs("writeAdmin", "/users/user_1");

    await detailTab(page, "Sessions").click();
    await expect(
      page.getByRole("heading", { name: "Session Inventory" }),
    ).toBeVisible();

    await detailTab(page, "Credentials").click();
    await expect(
      page.getByRole("heading", { name: "Credential Inventory" }),
    ).toBeVisible();
    await expect(page.getByText("macOS")).toBeVisible();

    await detailTab(page, "Events").click();
    await expect(page.getByText("login_success")).toBeVisible();
  });

  test("revokes a single session and drops it from the list", async ({
    page,
    api,
    signInAs,
  }) => {
    seedDetail(api, [
      makeSession({ id: "session_1", ipAddress: "203.0.113.10" }),
      makeSession({ id: "session_2", ipAddress: "203.0.113.11" }),
    ]);

    await signInAs("writeAdmin", "/users/user_1");
    await detailTab(page, "Sessions").click();
    await expect(page.getByText("203.0.113.10")).toBeVisible();

    await page.getByRole("button", { name: /^Revoke row 1$/ }).click();
    await confirmDialog(page, "Revoke");

    await expectToast(page, "Session revoked");
    await expect(page.getByText("203.0.113.10")).toBeHidden();
    await expect(page.getByText("203.0.113.11")).toBeVisible();
  });

  test("revokes every session behind a confirmation", async ({
    page,
    api,
    signInAs,
  }) => {
    seedDetail(api, [
      makeSession({ id: "session_1", ipAddress: "203.0.113.10" }),
      makeSession({ id: "session_2", ipAddress: "203.0.113.11" }),
    ]);

    await signInAs("writeAdmin", "/users/user_1");

    await page.getByRole("button", { name: "Revoke Sessions" }).click();
    await confirmDialog(page, "Revoke all");

    await expectToast(page, /sessions revoked/i);

    await detailTab(page, "Sessions").click();
    await expect(page.getByText("No sessions for this user")).toBeVisible();
  });

  test("reports only counts from a device replacement, never credentials", async ({
    page,
    api,
    signInAs,
  }) => {
    seedDetail(api);

    await signInAs("writeAdmin", "/users/user_1");

    await page.getByRole("button", { name: "Device Replacement" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("This cannot be undone")).toBeVisible();

    // The endpoint cannot be called without stating how identity was
    // established, so the control stays inert until it has been.
    await expect(
      dialog.getByRole("button", { name: "Prepare" }),
    ).toBeDisabled();

    await dialog.getByLabel("Evidence reference").fill("TICKET-4821");
    await expect(dialog.getByRole("button", { name: "Prepare" })).toBeEnabled();
    await dialog.getByRole("button", { name: "Prepare" }).click();

    await expectToast(page, "Device replacement prepared");
    await expect(
      page.getByText(
        "2 sessions revoked, 1 passkeys removed, 0 TOTP credentials disabled.",
      ),
    ).toBeVisible();

    expect(
      api.lastCall("POST", "/admin/users/user_1/recovery/device-replacement")
        ?.payload,
    ).toMatchObject({
      proofing: { method: "in_person", evidenceRef: "TICKET-4821" },
    });
  });

  test("requires a named approver for a remote exception", async ({
    page,
    api,
    signInAs,
  }) => {
    seedDetail(api);

    await signInAs("writeAdmin", "/users/user_1");
    await page.getByRole("button", { name: "Device Replacement" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Evidence reference").fill("TICKET-4821");
    await dialog
      .getByLabel("How was identity confirmed?")
      .selectOption("remote_exception");

    await expect(
      dialog.getByRole("button", { name: "Prepare" }),
    ).toBeDisabled();

    await dialog.getByLabel("Approver").fill("Grace Hopper");

    await expect(dialog.getByRole("button", { name: "Prepare" })).toBeEnabled();
  });

  test("edits the user and saves the change", async ({
    page,
    api,
    signInAs,
  }) => {
    seedDetail(api);

    await signInAs("writeAdmin", "/users/user_1");
    await page.getByRole("button", { name: "Edit User" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Email")).toHaveValue("ada@example.com");

    await dialog.getByLabel("Email").fill("ada.lovelace@example.com");
    await dialog.getByRole("button", { name: "Save" }).click();

    await expectToast(page, "User updated");
    expect(api.lastCall("PATCH", "/admin/users/user_1")?.payload).toMatchObject(
      { email: "ada.lovelace@example.com" },
    );
  });

  test("hides every write control from a read-only admin", async ({
    page,
    api,
    signInAs,
  }) => {
    seedDetail(api);

    await signInAs("readAdmin", "/users/user_1");

    await expect(page.getByText("Read-only admin access")).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit User" })).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Revoke Sessions" }),
    ).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Device Replacement" }),
    ).toBeHidden();
  });

  test("renders a user with no sessions or signals", async ({
    page,
    api,
    signInAs,
  }) => {
    seedDetail(api, []);
    api.get("/admin/users/:userId/anomalies", {
      json: { suspiciousEvents: [], relatedIps: [], relatedAgents: [] },
    });

    await signInAs("writeAdmin", "/users/user_1");

    await detailTab(page, "Sessions").click();
    await expect(page.getByText("No sessions for this user")).toBeVisible();
  });

  test("surfaces a user that does not exist", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/admin/users/:userId", {
      status: 404,
      json: { error: "User not found" },
    });

    await signInAs("writeAdmin", "/users/user_missing");
    await drainRetries(page);

    await expectErrorState(page, "Could not load user detail");
  });
});
