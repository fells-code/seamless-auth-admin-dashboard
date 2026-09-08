/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { expect, test } from "../fixtures";

const NAV_DESTINATIONS = [
  { name: "Overview", path: "/", heading: "Overview" },
  { name: "Users", path: "/users", heading: "Users" },
  { name: "Organizations", path: "/organizations", heading: "Organizations" },
  { name: "Sessions", path: "/sessions", heading: "Sessions" },
  { name: "Events", path: "/events", heading: "Events" },
  { name: "Security", path: "/security", heading: "Security" },
  { name: "System", path: "/system", heading: "System Configuration" },
];

test.describe("navigation", () => {
  for (const destination of NAV_DESTINATIONS) {
    test(`the sidebar reaches ${destination.name}`, async ({
      page,
      signInAs,
    }) => {
      await signInAs("writeAdmin");

      await page
        .getByRole("navigation")
        .getByRole("link", { name: destination.name })
        .click();

      await expect(page).toHaveURL(
        new RegExp(`${destination.path.replace("/", "\\/")}$`),
      );
      await expect(
        page.getByRole("heading", { name: destination.heading, level: 1 }),
      ).toBeVisible();
    });
  }

  test("marks the current destination as the active page", async ({
    page,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/events");

    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Events" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Users" }),
    ).not.toHaveAttribute("aria-current", "page");
  });

  test("names the current screen in the topbar and the document title", async ({
    page,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/sessions");

    await expect(page.getByRole("banner")).toContainText("Sessions");
    // Several open tabs were previously indistinguishable.
    await expect(page).toHaveTitle("Sessions | Seamless Auth");
  });

  test("holds a skeleton until the session resolves", async ({
    page,
    api,
    signInAs,
  }) => {
    let release: (() => void) | undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });

    api.get("/users/me", async () => {
      await held;
      return {
        json: {
          user: {
            id: "user_admin",
            email: "admin@example.com",
            phone: null,
            roles: ["admin:write"],
          },
          credentials: [],
          organizations: [],
          activeOrganization: null,
        },
      };
    });

    const navigation = signInAs("writeAdmin");

    await expect(page.getByRole("navigation")).toBeHidden();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeHidden();

    release?.();
    await navigation;

    await expect(page.getByRole("navigation")).toBeVisible();
  });
});

test.describe("account menu", () => {
  test("opens, reaches the profile, and closes", async ({ page, signInAs }) => {
    await signInAs("writeAdmin");

    await page.getByRole("button", { name: /admin@example.com/ }).click();

    const menu = page.getByRole("menu", { name: "Account menu" });
    await expect(menu).toBeVisible();

    await menu.getByRole("menuitem", { name: "Profile" }).click();

    await expect(page).toHaveURL(/\/profile$/);
    await expect(menu).toBeHidden();
  });

  test("signing out returns to the access-required screen", async ({
    page,
    api,
    signInAs,
  }) => {
    await signInAs("writeAdmin");
    await expect(page.getByRole("navigation")).toBeVisible();

    // Registered only once the shell is up: the session has to survive the
    // initial read, and be gone by the time the guard looks again.
    api.get("/users/me", { status: 401, json: { error: "Unauthorized" } });

    await page.getByRole("button", { name: /admin@example.com/ }).click();
    await page
      .getByRole("menu", { name: "Account menu" })
      .getByRole("menuitem", { name: "Logout" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Access Required" }),
    ).toBeVisible();
  });
});

test.describe("appearance", () => {
  test("switches between light and dark and remembers the choice", async ({
    page,
    signInAs,
  }) => {
    await signInAs("writeAdmin");

    await page.getByRole("button", { name: /admin@example.com/ }).click();
    await page
      .getByRole("menu", { name: "Account menu" })
      .getByRole("button", { name: "dark" })
      .click();

    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.reload();

    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("applies a different theme and remembers it", async ({
    page,
    signInAs,
  }) => {
    await signInAs("writeAdmin");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "autumn");

    await page.getByRole("button", { name: /admin@example.com/ }).click();
    await page
      .getByRole("menu", { name: "Account menu" })
      .getByRole("menuitemradio", { name: /Winter/ })
      .click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "winter");

    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "winter");
  });
});
