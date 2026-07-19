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
    mocks.auth.refreshSession.mockResolvedValue(undefined);
    mocks.passkey.loading = false;
    mocks.passkey.passkeySupported = true;

    Object.values(mocks.client).forEach((mock) => mock.mockReset());
  });

  it("starts login and completes passkey sign-in with the headless client", async () => {
    const user = userEvent.setup();
    mocks.client.login.mockResolvedValue(
      new Response(JSON.stringify({ loginMethods: ["passkey", "magic_link"] })),
    );
    mocks.client.loginWithPasskey.mockResolvedValue({
      message: "Passkey login succeeded.",
      mfaRequired: false,
      success: true,
    });

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
    mocks.client.login.mockResolvedValue(
      new Response(JSON.stringify({ loginMethods: ["email_otp"] })),
    );
    mocks.client.requestLoginEmailOtp.mockResolvedValue(new Response(null));
    mocks.client.verifyLoginEmailOtp.mockResolvedValue(new Response(null));

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
});
