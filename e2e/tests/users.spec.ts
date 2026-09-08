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
  statCard,
} from "../helpers";
import { makeMeUser, makeStepUpStatus, makeUser } from "../factories";
import type { MockApi } from "../mockApi";

const DIRECTORY = [
  makeUser({
    id: "user_1",
    email: "ada@example.com",
    roles: ["user"],
    verified: true,
  }),
  makeUser({
    id: "user_2",
    email: "grace@example.com",
    roles: ["admin:read"],
    phone: null,
    verified: false,
  }),
];

/**
 * A directory the mutations actually change.
 *
 * Swapping a registration mid-test races the background refetch, so a row could
 * disappear before it was clicked. Holding the list here makes the assertions
 * describe the deployment rather than the order the mocks were registered in.
 */
function seedDirectory(api: MockApi, users = [...DIRECTORY]) {
  const directory = [...users];

  api.get("/admin/users", ({ url }) => {
    const search = url.searchParams.get("search");
    const matched = search
      ? directory.filter((user) => user.email.includes(search))
      : directory;

    return { json: { users: matched, total: matched.length } };
  });

  api.post("/admin/users", ({ payload }) => {
    const created = makeUser(payload as Record<string, never>);
    directory.push(created);
    return { json: created };
  });

  api.delete("/admin/users", ({ payload }) => {
    const { userId } = payload as { userId: string };
    const index = directory.findIndex((user) => user.id === userId);
    if (index >= 0) directory.splice(index, 1);
    return { json: { message: "User deleted" } };
  });

  return directory;
}

test.describe("Users directory", () => {
  test("lists users with their roles and verification state", async ({
    page,
    api,
    signInAs,
  }) => {
    seedDirectory(api);

    await signInAs("writeAdmin", "/users");

    await expect(page.getByText("ada@example.com")).toBeVisible();
    await expect(page.getByText("admin:read")).toBeVisible();
    await expect(page.getByText("No phone on record")).toBeVisible();
    await expect(statCard(page, "Matched Users")).toContainText("2");
  });

  test("searches the directory server-side and debounces the input", async ({
    page,
    api,
    signInAs,
  }) => {
    seedDirectory(api);

    await signInAs("writeAdmin", "/users");
    await expect(page.getByText("ada@example.com")).toBeVisible();

    await page.getByPlaceholder("Search by email or phone").fill("grace");

    await expect(page.getByText("ada@example.com")).toBeHidden();
    await expect(page.getByText("grace@example.com")).toBeVisible();

    // Debounced, so the five keystrokes are not five requests.
    const searches = api
      .recordedCalls("GET", "/admin/users")
      .filter((call) => call.url.includes("search="));
    expect(searches.length).toBeLessThan(5);
  });

  test("says when a search matched nothing", async ({
    page,
    api,
    signInAs,
  }) => {
    seedDirectory(api);

    await signInAs("writeAdmin", "/users");
    await page.getByPlaceholder("Search by email or phone").fill("nobody");

    await expect(page.getByText("No users match this search")).toBeVisible();
  });

  test("opens a user from the directory", async ({ page, api, signInAs }) => {
    seedDirectory(api);

    await signInAs("writeAdmin", "/users");

    // The identity button's accessible name concatenates the email, phone, and
    // id, so it is neither the bare address nor any of the row's actions.
    await page.getByRole("button", { name: /^ada@example\.com\s/ }).click();

    await expect(page).toHaveURL(/\/users\/user_1$/);
  });

  test("renders an empty directory cleanly", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/admin/users", { json: { users: [], total: 0 } });

    await signInAs("writeAdmin", "/users");

    await expect(page.getByText("No users in the directory")).toBeVisible();
    await expect(
      page.getByText("Create your first user to start managing access"),
    ).toBeVisible();
  });

  test("surfaces a failed load", async ({ page, api, signInAs }) => {
    api.get("/admin/users", {
      status: 500,
      json: { error: "directory unavailable" },
    });

    await signInAs("writeAdmin", "/users");
    await drainRetries(page);

    await expectErrorState(page, "Could not load users");
  });
});

test.describe("create user", () => {
  test("validates, submits, and reports success", async ({
    page,
    api,
    signInAs,
  }) => {
    seedDirectory(api);

    await signInAs("writeAdmin", "/users");
    await page.getByRole("button", { name: "Create User" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // An email alone is not enough: a user with no role can do nothing.
    await expect(dialog.getByRole("button", { name: "Create" })).toBeDisabled();

    await dialog.getByLabel("Email").fill("hopper@example.com");
    await expect(dialog.getByRole("button", { name: "Create" })).toBeDisabled();

    await dialog.getByRole("button", { name: "user", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Create" })).toBeEnabled();

    await dialog.getByRole("button", { name: "Create" }).click();

    await expectToast(page, "User created");
    // Scoped to the directory: the success toast names the address too.
    await expect(
      page.getByRole("main").getByText("hopper@example.com"),
    ).toBeVisible();
    expect(api.lastCall("POST", "/admin/users")?.payload).toMatchObject({
      email: "hopper@example.com",
      roles: ["user"],
    });
  });

  test("reports a creation the API refused", async ({
    page,
    api,
    signInAs,
  }) => {
    api.post("/admin/users", {
      status: 409,
      json: { error: "User already exists" },
    });

    await signInAs("writeAdmin", "/users");
    await page.getByRole("button", { name: "Create User" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Email").fill("ada@example.com");
    await dialog.getByRole("button", { name: "user", exact: true }).click();
    await dialog.getByRole("button", { name: "Create" }).click();

    await expectToast(page, "User creation failed");
    // The dialog stays open so the operator can correct the value.
    await expect(dialog).toBeVisible();
  });

  test("aborts without mutating when step-up fails", async ({ page, api }) => {
    api.get("/users/me", {
      json: {
        user: makeMeUser({ roles: ["admin:write"] }),
        credentials: [],
        organizations: [],
        activeOrganization: null,
      },
    });
    api.get("/step-up/status", { json: makeStepUpStatus({ fresh: false }) });

    await page.goto("/users");
    await page.getByRole("button", { name: "Create User" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Email").fill("hopper@example.com");
    await dialog.getByRole("button", { name: "user", exact: true }).click();
    await dialog.getByRole("button", { name: "Create" }).click();

    await expectToast(page, /security key or authenticator is required/i);
    expect(api.recordedCalls("POST", "/admin/users")).toHaveLength(0);
  });
});

test.describe("delete user", () => {
  test("confirms, deletes, and removes the row", async ({
    page,
    api,
    signInAs,
  }) => {
    seedDirectory(api);

    await signInAs("writeAdmin", "/users");
    await expect(page.getByText("ada@example.com")).toBeVisible();

    await page.getByRole("button", { name: "Delete ada@example.com" }).click();
    await confirmDialog(page, "Delete");

    await expectToast(page, "User deleted");
    // Scoped to the directory: the toast names the address it removed.
    await expect(
      page.getByRole("main").getByText("ada@example.com"),
    ).toBeHidden();

    // The API takes the id in the body rather than in the path.
    expect(api.lastCall("DELETE", "/admin/users")?.payload).toEqual({
      userId: "user_1",
    });
  });

  test("sends nothing when the confirmation is dismissed", async ({
    page,
    api,
    signInAs,
  }) => {
    seedDirectory(api);

    await signInAs("writeAdmin", "/users");

    await page.getByRole("button", { name: "Delete ada@example.com" }).click();
    await dismissDialog(page);

    expect(api.recordedCalls("DELETE", "/admin/users")).toHaveLength(0);
  });

  test("reports a deletion the API refused", async ({
    page,
    api,
    signInAs,
  }) => {
    seedDirectory(api);
    api.delete("/admin/users", {
      status: 409,
      json: { error: "User owns an organization" },
    });

    await signInAs("writeAdmin", "/users");

    await page.getByRole("button", { name: "Delete ada@example.com" }).click();
    await confirmDialog(page, "Delete");

    await expectToast(page, "User deletion failed");
    await expect(
      page.getByRole("main").getByText("ada@example.com"),
    ).toBeVisible();
  });
});
