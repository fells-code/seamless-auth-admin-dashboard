/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { expect, test } from "../fixtures";
import { expectInlineAlert } from "../helpers";
import type { MockApi } from "../mockApi";
import { makeCredential, makeMeUser } from "../factories";

const ADMIN_SESSION = {
  user: makeMeUser({ roles: ["admin:write"] }),
  credentials: [makeCredential({ id: "credential_admin" })],
  organizations: [],
  activeOrganization: null,
};

/**
 * Signed out until the chosen ceremony finishes, then signed in.
 *
 * The SDK re-reads `/users/me` after every successful method, and that read is
 * what actually flips the app into its authenticated state, so faking it up
 * front would prove nothing about the flow under test.
 */
function seedSignInFlow(
  api: MockApi,
  loginMethods: string[] = ["passkey", "magic_link", "email_otp", "phone_otp"],
) {
  const state = { signedIn: false };

  api.get("/users/me", () =>
    state.signedIn
      ? { json: ADMIN_SESSION }
      : { status: 401, json: { error: "Unauthorized" } },
  );
  api.get("/step-up/status", { json: { fresh: false } });
  api.post("/login", { json: { loginMethods, userExists: true } });

  return state;
}

test.describe("identifier step", () => {
  test("keeps submit disabled until an identifier is entered", async ({
    page,
    api,
  }) => {
    seedSignInFlow(api);

    await page.goto("/login");

    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();

    await page.getByLabel("Email or phone").fill("admin@example.com");

    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  test("advances to the methods the server offered for the identifier", async ({
    page,
    api,
  }) => {
    // Passkey is deliberately absent, so the screen must not attempt one and
    // must land on the fallback list instead.
    seedSignInFlow(api, ["magic_link", "email_otp"]);

    await page.goto("/login");
    await page.getByLabel("Email or phone").fill("admin@example.com");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(
      page.getByRole("button", { name: /Send Magic Link/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Send Email Code/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Send Text Code/ }),
    ).toBeHidden();
  });

  test("offers only the phone method when that is what the server returned", async ({
    page,
    api,
  }) => {
    seedSignInFlow(api, ["phone_otp"]);

    await page.goto("/login");
    await page.getByLabel("Email or phone").fill("+15551234567");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(
      page.getByRole("button", { name: /Send Text Code/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Send Email Code/ }),
    ).toBeHidden();
  });
});

test.describe("passkey", () => {
  test("signs in and lands on the console", async ({
    page,
    api,
    virtualAuthenticator,
  }) => {
    const state = seedSignInFlow(api);

    await virtualAuthenticator.addPasskey({ rpId: "localhost" });

    api.post("/webAuthn/login/start", {
      json: {
        challenge: "Y2hhbGxlbmdlLWZvci10ZXN0cw",
        rpId: "localhost",
        timeout: 60_000,
        userVerification: "required",
        allowCredentials: [],
      },
    });
    api.post("/webAuthn/login/finish", () => {
      state.signedIn = true;
      // The SDK reads any message other than "Success" as a failed ceremony.
      return { json: { message: "Success" } };
    });

    await page.goto("/login");
    await page.getByLabel("Email or phone").fill("admin@example.com");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  });

  test("falls back to the method list and reports why it failed", async ({
    page,
    api,
    virtualAuthenticator,
  }) => {
    seedSignInFlow(api);

    await virtualAuthenticator.addPasskey({ rpId: "localhost" });

    api.post("/webAuthn/login/start", {
      json: {
        challenge: "Y2hhbGxlbmdlLWZvci10ZXN0cw",
        rpId: "localhost",
        timeout: 60_000,
        userVerification: "required",
        allowCredentials: [],
      },
    });
    api.post("/webAuthn/login/finish", {
      status: 401,
      json: { error: "Passkey verification failed." },
    });

    await page.goto("/login");
    await page.getByLabel("Email or phone").fill("admin@example.com");
    await page.getByRole("button", { name: "Continue" }).click();

    await expectInlineAlert(page, "Passkey verification failed.");
    // A failed ceremony must leave a way forward rather than a dead form.
    await expect(
      page.getByRole("button", { name: /Send Magic Link/ }),
    ).toBeVisible();
  });
});

test.describe("magic link", () => {
  test("sends, waits, and completes when the link is consumed", async ({
    page,
    api,
  }) => {
    const state = seedSignInFlow(api, ["magic_link"]);
    let consumed = false;

    api.post("/magic-link", { json: { message: "Sent" } });
    api.get("/magic-link/check", () =>
      consumed
        ? { json: { message: "Success" } }
        : // 204 while the emailed link is unused. A bare no-error check would
          // complete sign-in before the link was ever opened.
          { status: 204 },
    );

    await page.goto("/login");
    await page.getByLabel("Email or phone").fill("admin@example.com");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /Send Magic Link/ }).click();

    await expect(
      page.getByRole("heading", { name: "Check Your Email" }),
    ).toBeVisible();
    await expect(
      page.getByText("A sign-in link was sent to admin@example.com."),
    ).toBeVisible();

    // A poll against an unconsumed link must not sign anyone in.
    await page.clock.runFor(5_100);
    await expect(
      page.getByRole("heading", { name: "Check Your Email" }),
    ).toBeVisible();

    consumed = true;
    state.signedIn = true;
    await page.clock.runFor(5_100);

    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("reports a failure to send", async ({ page, api }) => {
    seedSignInFlow(api, ["magic_link"]);

    api.post("/magic-link", { status: 500, json: { error: "smtp down" } });

    await page.goto("/login");
    await page.getByLabel("Email or phone").fill("admin@example.com");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /Send Magic Link/ }).click();

    await expectInlineAlert(page, "Magic link could not be sent.");
  });
});

test.describe("magic link verification page", () => {
  test("completes sign-in from the emailed link", async ({ page, api }) => {
    let signedIn = false;

    api.get("/users/me", () =>
      signedIn
        ? { json: ADMIN_SESSION }
        : { status: 401, json: { error: "Unauthorized" } },
    );
    api.get("/step-up/status", { json: { fresh: false } });
    api.get("/magic-link/verify/:token", () => {
      signedIn = true;
      return { json: { message: "Success" } };
    });

    await page.goto("/verify-magiclink?token=emailed-token");

    await expect(page.getByRole("navigation")).toBeVisible();
    expect(
      api.lastCall("GET", "/magic-link/verify/emailed-token"),
    ).toBeTruthy();
  });

  test("offers a way back when the link has expired", async ({ page, api }) => {
    api.get("/users/me", { status: 401, json: { error: "Unauthorized" } });
    api.get("/step-up/status", {
      status: 401,
      json: { error: "Unauthorized" },
    });
    api.get("/magic-link/verify/:token", {
      status: 400,
      json: { error: "expired" },
    });

    await page.goto("/verify-magiclink?token=stale-token");

    await expect(
      page.getByRole("heading", { name: "Verification Failed" }),
    ).toBeVisible();
    await expectInlineAlert(
      page,
      "The link may have expired or already been used.",
    );

    // Without this the screen was a dead end and the only escape was editing
    // the URL.
    await page.getByRole("button", { name: "Back to sign in" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("reports a link with no token at all", async ({ page, api }) => {
    api.get("/users/me", { status: 401, json: { error: "Unauthorized" } });
    api.get("/step-up/status", {
      status: 401,
      json: { error: "Unauthorized" },
    });

    await page.goto("/verify-magiclink");

    await expect(
      page.getByRole("heading", { name: "Verification Failed" }),
    ).toBeVisible();
  });
});

for (const channel of [
  {
    name: "email",
    method: "email_otp",
    button: /Send Email Code/,
    heading: "Email Code",
    generate: "/otp/generate-login-email-otp",
    verify: "/otp/verify-login-email-otp",
  },
  {
    name: "phone",
    method: "phone_otp",
    button: /Send Text Code/,
    heading: "Text Message Code",
    generate: "/otp/generate-login-phone-otp",
    verify: "/otp/verify-login-phone-otp",
  },
] as const) {
  test.describe(`${channel.name} OTP`, () => {
    test("requests a code, verifies it, and signs in", async ({
      page,
      api,
    }) => {
      const state = seedSignInFlow(api, [channel.method]);

      api.post(channel.generate, { json: { message: "Sent" } });
      api.post(channel.verify, () => {
        state.signedIn = true;
        return { json: { message: "Success" } };
      });

      await page.goto("/login");
      await page.getByLabel("Email or phone").fill("admin@example.com");
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByRole("button", { name: channel.button }).click();

      await expect(
        page.getByRole("heading", { name: channel.heading }),
      ).toBeVisible();

      await page.getByLabel("Verification code").fill("123456");
      await page.getByRole("button", { name: "Verify" }).click();

      await expect(page.getByRole("navigation")).toBeVisible();
      expect(api.lastCall("POST", channel.verify)?.payload).toEqual({
        verificationToken: "123456",
      });
    });

    test("reports a rejected code without signing anyone in", async ({
      page,
      api,
    }) => {
      seedSignInFlow(api, [channel.method]);

      api.post(channel.generate, { json: { message: "Sent" } });
      api.post(channel.verify, {
        status: 400,
        json: { error: "Invalid code" },
      });

      await page.goto("/login");
      await page.getByLabel("Email or phone").fill("admin@example.com");
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByRole("button", { name: channel.button }).click();
      await page.getByLabel("Verification code").fill("999999");
      await page.getByRole("button", { name: "Verify" }).click();

      await expectInlineAlert(page, "Code verification failed.");
      await expect(page.getByRole("navigation")).toBeHidden();
    });

    test("blocks a short code before it reaches the API", async ({
      page,
      api,
    }) => {
      seedSignInFlow(api, [channel.method]);

      api.post(channel.generate, { json: { message: "Sent" } });

      await page.goto("/login");
      await page.getByLabel("Email or phone").fill("admin@example.com");
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByRole("button", { name: channel.button }).click();
      await page.getByLabel("Verification code").fill("123");

      await expect(page.getByRole("button", { name: "Verify" })).toBeDisabled();
      expect(api.recordedCalls("POST", channel.verify)).toHaveLength(0);
    });
  });
}

test.describe("OAuth", () => {
  const provider = { id: "google", name: "Google" };

  test("starts a provider login and remembers which one", async ({
    page,
    api,
  }) => {
    seedSignInFlow(api, ["magic_link"]);

    api.get("/oauth/providers", { json: { providers: [provider] } });
    // Kept on this origin: following a real provider redirect would leave the
    // app under test.
    api.post("/oauth/google/start", {
      json: {
        authorizationUrl:
          "http://localhost:4287/oauth/callback?code=abc&state=xyz",
      },
    });
    api.post("/oauth/google/callback", {
      status: 400,
      json: { code: "oauth_missing_email" },
    });

    await page.goto("/login");
    await page.getByRole("button", { name: /Google/ }).click();

    await expect(page).toHaveURL(/\/oauth\/callback/);
    expect(api.lastCall("POST", "/oauth/google/start")).toBeTruthy();
  });

  test("completes sign-in from the provider callback", async ({
    page,
    api,
  }) => {
    let signedIn = false;

    api.get("/users/me", () =>
      signedIn
        ? { json: ADMIN_SESSION }
        : { status: 401, json: { error: "Unauthorized" } },
    );
    api.get("/step-up/status", { json: { fresh: false } });
    api.get("/oauth/providers", { json: { providers: [provider] } });
    api.post("/oauth/google/callback", () => {
      signedIn = true;
      return { json: { message: "Success" } };
    });

    // The callback URL carries only code and state, so the provider id is read
    // back from where the buttons stashed it.
    await page.goto("/login");
    await page.evaluate(() =>
      sessionStorage.setItem("seamless:oauth:provider", "google"),
    );
    await page.goto("/oauth/callback?code=abc&state=xyz");

    await expect(page.getByRole("navigation")).toBeVisible();
    expect(api.lastCall("POST", "/oauth/google/callback")?.payload).toEqual({
      code: "abc",
      state: "xyz",
    });
  });

  test("explains a provider error and offers a way back", async ({
    page,
    api,
  }) => {
    api.get("/users/me", { status: 401, json: { error: "Unauthorized" } });
    api.get("/step-up/status", {
      status: 401,
      json: { error: "Unauthorized" },
    });
    // The actionable code is read from `code`, not from `error`, which is what
    // separates a specific explanation from the generic fallback.
    api.post("/oauth/google/callback", {
      status: 400,
      json: { code: "oauth_email_not_verified" },
    });

    await page.goto("/login");
    await page.evaluate(() =>
      sessionStorage.setItem("seamless:oauth:provider", "google"),
    );
    await page.goto("/oauth/callback?code=abc&state=xyz");

    await expect(
      page.getByRole("heading", { name: "Sign-in Failed" }),
    ).toBeVisible();
    await expect(
      page.getByText(/reports this account's email address as unverified/),
    ).toBeVisible();

    await page.getByRole("button", { name: "Back to sign in" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("reports a callback that is missing its parameters", async ({
    page,
    api,
  }) => {
    api.get("/users/me", { status: 401, json: { error: "Unauthorized" } });
    api.get("/step-up/status", {
      status: 401,
      json: { error: "Unauthorized" },
    });

    await page.goto("/oauth/callback");

    await expect(
      page.getByText("This sign-in link is missing required information."),
    ).toBeVisible();
  });
});
