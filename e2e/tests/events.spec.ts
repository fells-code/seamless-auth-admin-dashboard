/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { expect, test } from "../fixtures";
import { drainRetries, expectErrorState, statCard } from "../helpers";
import { makeEvent } from "../factories";

const EVENTS = [
  makeEvent({
    id: "event_login",
    type: "login_success",
    user_id: "user_1",
    ip_address: "203.0.113.10",
  }),
  makeEvent({
    id: "event_failed",
    type: "login_failed",
    user_id: "user_2",
    ip_address: "198.51.100.7",
  }),
  makeEvent({
    id: "event_admin",
    type: "admin_user_deleted",
    user_id: "user_3",
    actor_user_id: "user_admin",
    ip_address: "203.0.113.99",
  }),
];

test.describe("Events", () => {
  test("renders the feed and categorises each row", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/admin/auth-events", {
      json: { events: EVENTS, total: EVENTS.length },
    });

    await signInAs("writeAdmin", "/events");

    await expect(page.getByText("login_success")).toBeVisible();
    await expect(page.getByText("User-linked event").first()).toBeVisible();
    // An administrative event names two people, so it must not read as though
    // the subject did it to themselves.
    await expect(page.getByText("Administrative action")).toBeVisible();
    await expect(statCard(page, "Matched Events")).toContainText("3");
  });

  test("narrows the feed to a selected category", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/admin/auth-events", ({ url }) =>
      url.searchParams.get("type") === "login_failed"
        ? { json: { events: [EVENTS[1]], total: 1 } }
        : { json: { events: EVENTS, total: EVENTS.length } },
    );

    await signInAs("writeAdmin", "/events");
    await page.getByRole("button", { name: "Login", exact: true }).click();

    await expect(page).toHaveURL(/type=login/);
    // The grouped alias expands into the concrete types the API knows.
    await expect
      .poll(() =>
        api
          .recordedCalls("GET", "/admin/auth-events")
          .some((call) => call.url.includes("type=login_failed")),
      )
      .toBe(true);
  });

  test("keeps the range in the URL so a filtered view is linkable", async ({
    page,
    api,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/events");

    await page.getByRole("button", { name: "7d", exact: true }).click();

    await expect(page).toHaveURL(/range=7d/);

    // Polled rather than read once: the URL updates before the query keyed on
    // the new window has had a chance to run.
    await expect
      .poll(() => {
        const params = new URL(api.lastCall("GET", "/admin/auth-events")!.url)
          .searchParams;
        const from = params.get("from");
        const to = params.get("to");

        return from && to
          ? new Date(to).getTime() - new Date(from).getTime()
          : null;
      })
      .toBe(7 * 24 * 60 * 60 * 1000);
  });

  test("reproduces a filtered view from a deep link", async ({
    page,
    api,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/events?range=1h&type=security");

    await expect(
      page.getByRole("button", { name: "1h", exact: true }),
    ).toHaveClass(/bg-primary/);

    await expect
      .poll(() => {
        const params = new URL(api.lastCall("GET", "/admin/auth-events")!.url)
          .searchParams;
        const from = params.get("from");
        const to = params.get("to");

        return from && to
          ? new Date(to).getTime() - new Date(from).getTime()
          : null;
      })
      .toBe(60 * 60 * 1000);
  });

  test("clearing filters returns the feed to its default window", async ({
    page,
    signInAs,
  }) => {
    await signInAs("writeAdmin", "/events?range=7d&type=security");

    await page.getByRole("button", { name: "Clear Filters" }).click();

    await expect(page).toHaveURL(/\/events$/);
    await expect(
      page.getByRole("button", { name: "24h", exact: true }),
    ).toHaveClass(/bg-primary/);
  });

  test("reports an inverted custom range rather than an empty feed", async ({
    page,
    signInAs,
  }) => {
    await signInAs(
      "writeAdmin",
      "/events?range=custom&from=2026-06-15T12:00&to=2026-06-01T12:00",
    );

    // An inverted range previously produced an empty table with only the
    // generic no-results message, giving no hint that the range was the cause.
    await expect(page.getByRole("alert")).toContainText(
      "The start must not be after the end",
    );
  });

  test("navigates from an event to the user it belongs to", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/admin/auth-events", {
      json: { events: [EVENTS[0]], total: 1 },
    });

    await signInAs("writeAdmin", "/events");

    await page.getByRole("button", { name: /user_1/ }).click();

    await expect(page).toHaveURL(/\/users\/user_1$/);
  });

  test("renders an empty feed cleanly", async ({ page, api, signInAs }) => {
    api.get("/admin/auth-events", { json: { events: [], total: 0 } });

    await signInAs("writeAdmin", "/events");

    await expect(
      page.getByText("No events found for the current filters"),
    ).toBeVisible();
    await expect(statCard(page, "Matched Events")).toContainText("0");
  });

  test("holds the counts back until the feed has loaded", async ({
    page,
    api,
    signInAs,
  }) => {
    let release: (() => void) | undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });

    api.get("/admin/auth-events", async () => {
      await held;
      return { json: { events: EVENTS, total: EVENTS.length } };
    });

    await signInAs("writeAdmin", "/events");
    await expect(page.getByRole("navigation")).toBeVisible();

    // Rendering these immediately reported no matched events and no suspicious
    // signals, which on a security surface reads as an all-clear.
    await expect(
      page.getByText("Matched Events", { exact: true }),
    ).toBeHidden();

    release?.();

    await expect(statCard(page, "Matched Events")).toContainText("3");
  });

  test("surfaces a failed feed query", async ({ page, api, signInAs }) => {
    api.get("/admin/auth-events", {
      status: 500,
      json: { error: "events unavailable" },
    });

    await signInAs("writeAdmin", "/events");
    await drainRetries(page);

    await expectErrorState(page, "Could not load events");
  });
});
