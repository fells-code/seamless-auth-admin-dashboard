/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignIn from "./SignIn";

const mocks = vi.hoisted(() => ({
  auth: {
    isAuthenticated: false,
    loading: false,
    markSignedIn: vi.fn(),
    refreshSession: vi.fn(),
    user: null as null | { id: string; roles: string[] },
  },
  client: {
    checkMagicLink: vi.fn(),
    login: vi.fn(),
    loginWithPasskey: vi.fn(),
    requestLoginEmailOtp: vi.fn(),
    requestLoginPhoneOtp: vi.fn(),
    requestMagicLink: vi.fn(),
    verifyLoginEmailOtp: vi.fn(),
    verifyLoginPhoneOtp: vi.fn(),
    listOAuthProviders: vi.fn(),
    startOAuthLogin: vi.fn(),
    finishOAuthLogin: vi.fn(),
  },
  passkey: {
    loading: false,
    passkeySupported: true,
  },
}));

vi.mock("@seamless-auth/react", () => ({
  useAuth: () => mocks.auth,
  useAuthClient: () => mocks.client,
  usePasskeySupport: () => mocks.passkey,
}));

function renderSignIn(from = "/users") {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/login", state: { from } }]}>
      <Routes>
        <Route path="/login" element={<SignIn />} />
        <Route path={from} element={<div>Protected destination</div>} />
        <Route path="/unauthenticated" element={<div>Access required</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SignIn", () => {
  beforeEach(() => {
    mocks.auth.isAuthenticated = false;
    mocks.auth.loading = false;
    mocks.auth.user = null;
    mocks.auth.markSignedIn.mockReset();
    mocks.auth.refreshSession.mockReset();
    mocks.auth.refreshSession.mockResolvedValue({
      data: { user: { roles: ["admin:read"] } },
      error: null,
    });
    mocks.passkey.loading = false;
    mocks.passkey.passkeySupported = true;

    Object.values(mocks.client).forEach((mock) => mock.mockReset());
    mocks.client.listOAuthProviders.mockResolvedValue({
      data: { providers: [] },
      error: null,
    });
  });

  it("starts login and completes passkey sign-in with the headless client", async () => {
    const user = userEvent.setup();
    mocks.client.login.mockResolvedValue({
      data: { loginMethods: ["passkey", "magic_link"] },
      error: null,
    });
    mocks.client.loginWithPasskey.mockResolvedValue({ data: {}, error: null });

    renderSignIn("/users");

    await user.type(
      screen.getByLabelText(/email or phone/i),
      "admin@example.com",
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() =>
      expect(mocks.client.login).toHaveBeenCalledWith({
        identifier: "admin@example.com",
        passkeyAvailable: true,
      }),
    );
    expect(mocks.client.loginWithPasskey).toHaveBeenCalled();

    // Navigation happens after refreshSession resolves, so wait for the
    // destination rather than for the call alone.
    expect(
      await screen.findByText("Protected destination"),
    ).toBeInTheDocument();

    expect(mocks.auth.refreshSession).toHaveBeenCalled();
    expect(mocks.auth.markSignedIn).toHaveBeenCalled();
  });

  it("falls back to email OTP when passkeys are unavailable", async () => {
    const user = userEvent.setup();
    mocks.passkey.passkeySupported = false;
    mocks.client.login.mockResolvedValue({
      data: { loginMethods: ["email_otp"] },
      error: null,
    });
    mocks.client.requestLoginEmailOtp.mockResolvedValue({
      data: { message: "sent" },
      error: null,
    });
    mocks.client.verifyLoginEmailOtp.mockResolvedValue({
      data: { message: "Success" },
      error: null,
    });

    renderSignIn("/system");

    await user.type(
      screen.getByLabelText(/email or phone/i),
      "admin@example.com",
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: /send email code/i }));

    expect(mocks.client.requestLoginEmailOtp).toHaveBeenCalled();
    await user.type(screen.getByLabelText(/verification code/i), "123456");
    await user.click(screen.getByRole("button", { name: /verify/i }));

    await waitFor(() =>
      expect(mocks.client.verifyLoginEmailOtp).toHaveBeenCalledWith("123456"),
    );

    // Navigation happens after refreshSession resolves, so wait for the
    // destination rather than for the call alone.
    expect(
      await screen.findByText("Protected destination"),
    ).toBeInTheDocument();

    expect(mocks.auth.refreshSession).toHaveBeenCalled();
  });
  it("offers configured OAuth providers on the login screen", async () => {
    mocks.client.listOAuthProviders.mockResolvedValue({
      data: { providers: [{ id: "google", name: "Google", scopes: [] }] },
      error: null,
    });

    renderSignIn();

    expect(
      await screen.findByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
  });

  it("does not announce success for an account without admin access", async () => {
    const user = userEvent.setup();
    mocks.client.login.mockResolvedValue({
      data: { loginMethods: ["passkey"] },
      error: null,
    });
    mocks.client.loginWithPasskey.mockResolvedValue({ data: {}, error: null });
    mocks.auth.refreshSession.mockResolvedValue({
      data: { user: { roles: ["user"] } },
      error: null,
    });

    renderSignIn("/users");

    await user.type(
      screen.getByLabelText(/email or phone/i),
      "user@example.com",
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // The admin requirement is evaluated before anything is announced, so the
    // "Admin session established" confirmation is never shown to an account
    // that is about to be bounced to the no-access screen.
    expect(await screen.findByText("Access required")).toBeInTheDocument();
    expect(screen.queryByText("Protected destination")).not.toBeInTheDocument();
  });

  it("offers a method the server returned even when it does not look like an email", async () => {
    const user = userEvent.setup();
    mocks.passkey.passkeySupported = false;
    mocks.client.login.mockResolvedValue({
      data: { loginMethods: ["magic_link", "email_otp"] },
      error: null,
    });

    renderSignIn("/users");

    // An identifier the server accepts but a strict email pattern rejects used
    // to have every method filtered out locally.
    await user.type(
      screen.getByLabelText(/email or phone/i),
      "admin@localhost",
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(
      await screen.findByRole("button", { name: /send magic link/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send email code/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/No available sign-in method was returned/),
    ).not.toBeInTheDocument();
  });

  it("disables the magic link resend while the request is in flight", async () => {
    const user = userEvent.setup();
    mocks.passkey.passkeySupported = false;
    mocks.client.login.mockResolvedValue({
      data: { loginMethods: ["magic_link"] },
      error: null,
    });

    let releaseResend: (() => void) | undefined;
    mocks.client.requestMagicLink
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseResend = () => resolve({ data: {}, error: null });
          }),
      );

    renderSignIn("/users");

    await user.type(
      screen.getByLabelText(/email or phone/i),
      "admin@example.com",
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(
      await screen.findByRole("button", { name: /send magic link/i }),
    );

    const resend = await screen.findByRole("button", { name: /resend/i });
    await user.click(resend);

    // Both controls lock while the resend is outstanding, so the button cannot
    // be hammered into sending a run of duplicate emails.
    expect(
      await screen.findByRole("button", { name: /sending/i }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /change/i })).toBeDisabled();

    releaseResend?.();
    await waitFor(() =>
      expect(mocks.client.requestMagicLink).toHaveBeenCalledTimes(2),
    );
  });
});
