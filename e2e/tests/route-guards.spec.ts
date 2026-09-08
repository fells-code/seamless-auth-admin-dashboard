/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { expect, test } from "../fixtures";
import { makeMeUser } from "../factories";

test.describe("route guards", () => {
  test("sends an unauthenticated visitor to the access-required screen", async ({
    page,
    signInAs,
  }) => {
    await signInAs("unauthenticated", "/events");

    await expect(page).toHaveURL(/\/unauthenticated$/);
    await expect(
      page.getByRole("heading", { name: "Access Required" }),
    ).toBeVisible();
    await expect(
      page.getByText("Sign in with an admin account to continue."),
    ).toBeVisible();
  });

  test("offers a route back to sign-in from the access-required screen", async ({
    page,
    signInAs,
  }) => {
    await signInAs("unauthenticated", "/events");

    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Admin Sign In" }),
    ).toBeVisible();
  });

  test("returns an operator to the route they originally asked for", async ({
    page,
    api,
    signInAs,
  }) => {
    // The attempted path is preserved through the guard and the sign-in
    // screen, so an expired session does not dump the operator on Overview.
    await signInAs("unauthenticated", "/security");
    await page.getByRole("button", { name: "Sign In" }).click();

    api.get("/users/me", {
      json: {
        user: makeMeUser({ roles: ["admin:write"] }),
        credentials: [],
        organizations: [],
        activeOrganization: null,
      },
    });
    api.post("/login", {
      json: { loginMethods: ["magic_link"], userExists: true },
    });
    api.post("/magic-link", { json: { message: "Sent" } });
    api.get("/magic-link/check", { json: { message: "Success" } });

    await page.getByLabel("Email or phone").fill("admin@example.com");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /Send Magic Link/ }).click();

    // The poll is installed with the check-your-email view, so the clock can
    // only be advanced once that view is on screen.
    await expect(
      page.getByRole("heading", { name: "Check Your Email" }),
    ).toBeVisible();

    // The screen polls every five seconds until the emailed link is consumed.
    // The clock is frozen, so the poll has to be driven rather than waited on.
    await page.clock.runFor(5_100);

    await expect(page).toHaveURL(/\/security$/);
    await expect(page.getByRole("heading", { name: "Security" })).toBeVisible();
  });

  test("keeps an already-authenticated admin out of the sign-in form", async ({
    page,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/login");

    await expect(
      page.getByRole("heading", { name: "Admin Sign In" }),
    ).toBeHidden();
    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("refuses an authenticated user without admin:read", async ({
    page,
    api,
  }) => {
    api.get("/users/me", {
      json: {
        user: makeMeUser({ roles: ["user"] }),
        credentials: [],
        organizations: [],
        activeOrganization: null,
      },
    });
    api.get("/step-up/status", { json: { fresh: false } });

    await page.goto("/users");

    await expect(
      page.getByText("Your account does not have admin access."),
    ).toBeVisible();
    // The way out matters: without it, signing in with the wrong account left
    // no in-app route to try another.
    await expect(
      page.getByRole("button", { name: "Use a different account" }),
    ).toBeVisible();
  });

  test("keeps an unknown route inside the shell", async ({
    page,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/not-a-real-route");

    await expect(page.getByRole("navigation")).toBeVisible();
  });
});

test.describe("read-only admin", () => {
  test("sees the users directory without create, edit, or delete", async ({
    page,
    signInAs,
  }) => {
    await signInAs("readAdmin", "/users");

    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(page.getByText("Read-only access")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create user/i }),
    ).toBeHidden();
    await expect(page.getByRole("button", { name: /^Delete/ })).toBeHidden();
  });

  test("sees the session inventory without revoke", async ({
    page,
    signInAs,
  }) => {
    await signInAs("readAdmin", "/sessions");

    await expect(page.getByText("203.0.113.10")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Revoke/ })).toBeHidden();
  });

  test("cannot save system configuration", async ({ page, signInAs }) => {
    await signInAs("readAdmin", "/system");

    await expect(
      page.getByRole("heading", { name: "System Configuration" }),
    ).toBeVisible();
    // The save control reports why it cannot be used rather than sitting there
    // greyed out with no explanation.
    await expect(
      page.getByRole("button", { name: "Read Only" }),
    ).toBeDisabled();
  });
});

test.describe("write admin", () => {
  test("has the controls the read-only admin does not", async ({
    page,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/users");

    await expect(page.getByText("Read-only access")).toBeHidden();
    await expect(
      page.getByRole("button", { name: /create user/i }),
    ).toBeVisible();
  });

  test("can revoke a session", async ({ page, signInAs }) => {
    await signInAs("writeAdmin", "/sessions");

    await expect(
      page.getByRole("button", { name: /Revoke session from 203.0.113.10/ }),
    ).toBeVisible();
  });
});
