/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OAuthCallback from "./OAuthCallback";
import { OAUTH_PROVIDER_STORAGE_KEY } from "../components/OAuthProviderButtons";

const mocks = vi.hoisted(() => ({
  finishOAuthLogin: vi.fn(),
  markSignedIn: vi.fn(),
  refreshSession: vi.fn(),
  getOAuthErrorCode: vi.fn(),
}));

vi.mock("@seamless-auth/react", () => ({
  useAuthClient: () => ({ finishOAuthLogin: mocks.finishOAuthLogin }),
  useAuth: () => ({
    markSignedIn: mocks.markSignedIn,
    refreshSession: mocks.refreshSession,
  }),
  getOAuthErrorCode: (error: unknown) => mocks.getOAuthErrorCode(error),
}));

function renderCallback(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/oauth/callback${search}`]}>
      <Routes>
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/" element={<div>Dashboard home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("OAuthCallback", () => {
  beforeEach(() => {
    mocks.finishOAuthLogin.mockReset();
    mocks.markSignedIn.mockReset();
    mocks.refreshSession.mockReset();
    mocks.refreshSession.mockResolvedValue({ data: null, error: null });
    mocks.getOAuthErrorCode.mockReset();
    mocks.getOAuthErrorCode.mockReturnValue(undefined);
    sessionStorage.clear();
  });

  it("completes sign-in and lands on the destination", async () => {
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, "google");
    mocks.finishOAuthLogin.mockResolvedValue({
      data: { message: "Success" },
      error: null,
    });

    renderCallback("?code=abc&state=xyz");

    await waitFor(() =>
      expect(mocks.finishOAuthLogin).toHaveBeenCalledWith({
        providerId: "google",
        code: "abc",
        state: "xyz",
      }),
    );
    expect(mocks.markSignedIn).toHaveBeenCalled();
    expect(mocks.refreshSession).toHaveBeenCalled();
    expect(await screen.findByText("Dashboard home")).toBeInTheDocument();
    // The stored provider is cleared once consumed.
    expect(sessionStorage.getItem(OAUTH_PROVIDER_STORAGE_KEY)).toBeNull();
  });

  it("errors without finishing when the provider id was never stored", async () => {
    renderCallback("?code=abc&state=xyz");

    expect(
      await screen.findByText(
        "This sign-in link is missing required information.",
      ),
    ).toBeInTheDocument();
    expect(mocks.finishOAuthLogin).not.toHaveBeenCalled();
  });

  it("errors when the callback is missing code or state", async () => {
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, "google");

    renderCallback("?state=xyz");

    expect(
      await screen.findByText(
        "This sign-in link is missing required information.",
      ),
    ).toBeInTheDocument();
    expect(mocks.finishOAuthLogin).not.toHaveBeenCalled();
  });

  it("shows a recoverable error when finishing the login fails", async () => {
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, "google");
    mocks.finishOAuthLogin.mockResolvedValue({ data: null, error: {} });

    renderCallback("?code=abc&state=xyz");

    expect(
      await screen.findByText(
        "We could not complete sign-in. Try signing in again.",
      ),
    ).toBeInTheDocument();
    expect(mocks.markSignedIn).not.toHaveBeenCalled();
    // The stored provider is left in place after a failure is not required, but
    // the "Back to sign in" recovery must be offered.
    expect(
      screen.getByRole("button", { name: "Back to sign in" }),
    ).toBeInTheDocument();
  });

  it("explains the failure when the provider returned no email address", async () => {
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, "google");
    mocks.finishOAuthLogin.mockResolvedValue({ data: null, error: {} });
    mocks.getOAuthErrorCode.mockReturnValue("oauth_missing_email");

    renderCallback("?code=abc&state=xyz");

    expect(
      await screen.findByText(/did not return an email address/),
    ).toBeInTheDocument();
  });

  it("explains the failure when the provider reports the email as unverified", async () => {
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, "google");
    mocks.finishOAuthLogin.mockResolvedValue({ data: null, error: {} });
    mocks.getOAuthErrorCode.mockReturnValue("oauth_email_not_verified");

    renderCallback("?code=abc&state=xyz");

    expect(await screen.findByText(/as unverified/)).toBeInTheDocument();
  });

  it("falls back to the generic message for an unrecognized code", async () => {
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, "google");
    mocks.finishOAuthLogin.mockResolvedValue({ data: null, error: {} });
    mocks.getOAuthErrorCode.mockReturnValue(undefined);

    renderCallback("?code=abc&state=xyz");

    expect(
      await screen.findByText(
        "We could not complete sign-in. Try signing in again.",
      ),
    ).toBeInTheDocument();
  });
});
