/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { expect, test } from "../fixtures";
import { makeCredential, makeMeUser } from "../factories";

test.describe("harness", () => {
  test("resolves the API URL from the injected runtime config", async ({
    page,
    signInAs,
    baseURL,
  }) => {
    await signInAs("writeAdmin");

    // getApiUrl reads window.__SEAMLESS_CONFIG__ first, which the container
    // writes at startup and the harness serves as /config.js.
    await expect
      .poll(() =>
        page.evaluate(() => window.__SEAMLESS_CONFIG__?.API_URL ?? null),
      )
      .toBe(baseURL);
  });

  test("fails a test when the app calls an endpoint with no mock", async ({
    page,
    api,
    signInAs,
  }) => {
    await signInAs("writeAdmin");
    await expect(page.getByRole("navigation")).toBeVisible();

    await page.evaluate(() =>
      fetch(`${window.__SEAMLESS_CONFIG__!.API_URL}/auth/admin/not-a-route`),
    );

    await expect
      .poll(() => api.unhandledCalls().map((call) => call.path))
      .toEqual(["/admin/not-a-route"]);

    // Asserted here so this spec passes; the fixture makes the same check at
    // teardown, which is what turns a missing mock into a failing test.
    api.clearUnhandledCalls();
  });
});

test.describe("personas", () => {
  test("unauthenticated: a protected route lands on access required", async ({
    page,
    signInAs,
  }) => {
    await signInAs("unauthenticated", "/users");

    await expect(
      page.getByRole("heading", { name: "Access Required" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("read admin: reaches the shell without write controls", async ({
    page,
    signInAs,
  }) => {
    await signInAs("readAdmin", "/sessions");

    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sessions" })).toBeVisible();
    await expect(page.getByText("Read-only access")).toBeVisible();
  });

  test("write admin: reaches the overview shell", async ({
    page,
    signInAs,
  }) => {
    await signInAs("writeAdmin");

    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByText("128")).toBeVisible();
  });

  test("a non-admin authenticated user is refused the console", async ({
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

    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Access Required" }),
    ).toBeVisible();
    await expect(
      page.getByText("Your account does not have admin access."),
    ).toBeVisible();
  });
});

test.describe("passkey sign-in", () => {
  test("signs in with the virtual authenticator and lands in the console", async ({
    page,
    api,
    virtualAuthenticator,
  }) => {
    // Unauthenticated until the ceremony finishes, then the SDK re-reads
    // /users/me, which is what actually flips the app into its signed-in state.
    let signedIn = false;

    api.get("/users/me", () =>
      signedIn
        ? {
            json: {
              user: makeMeUser({ roles: ["admin:write"] }),
              credentials: [makeCredential({ id: "credential_admin" })],
              organizations: [],
              activeOrganization: null,
            },
          }
        : { status: 401, json: { error: "Unauthorized" } },
    );
    api.get("/step-up/status", { json: { fresh: false } });

    api.post("/login", {
      json: { loginMethods: ["passkey", "magic_link"], userExists: true },
    });

    await virtualAuthenticator.addPasskey({ rpId: "localhost" });

    api.post("/webAuthn/login/start", {
      json: {
        challenge: "Y2hhbGxlbmdlLWZvci10ZXN0cw",
        rpId: "localhost",
        timeout: 60_000,
        userVerification: "required",
        // Empty, so the ceremony resolves a discoverable credential the way a
        // passkey-first sign-in does.
        allowCredentials: [],
      },
    });

    api.post("/webAuthn/login/finish", () => {
      signedIn = true;

      // The SDK treats any message other than "Success" as a failed ceremony,
      // so this string is part of the contract rather than decoration.
      return { json: { message: "Success", token: "test-token" } };
    });

    await page.goto("/login");

    await page.getByLabel("Email or phone").fill("admin@example.com");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("navigation")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

    // The ceremony really ran rather than the state being faked past it.
    expect(api.recordedCalls("POST", "/webAuthn/login/finish")).toHaveLength(1);
    expect(await virtualAuthenticator.credentials()).toBeDefined();
  });
});
