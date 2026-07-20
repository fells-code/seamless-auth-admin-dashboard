/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OAuthProviderButtons, {
  OAUTH_PROVIDER_STORAGE_KEY,
} from "./OAuthProviderButtons";

const mocks = vi.hoisted(() => ({
  listOAuthProviders: vi.fn(),
  startOAuthLogin: vi.fn(),
  assign: vi.fn(),
}));

vi.mock("@seamless-auth/react", () => ({
  useAuthClient: () => ({
    listOAuthProviders: mocks.listOAuthProviders,
    startOAuthLogin: mocks.startOAuthLogin,
  }),
}));

function renderButtons() {
  return render(
    <MemoryRouter>
      <OAuthProviderButtons />
    </MemoryRouter>,
  );
}

describe("OAuthProviderButtons", () => {
  beforeEach(() => {
    mocks.listOAuthProviders.mockReset();
    mocks.startOAuthLogin.mockReset();
    mocks.assign.mockReset();
    sessionStorage.clear();
    // A full-page navigation is what starts the OAuth redirect; stub it so the
    // test can assert where the browser was sent.
    vi.stubGlobal("location", {
      origin: "https://admin.example.com",
      assign: mocks.assign,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders nothing when no providers are configured", async () => {
    mocks.listOAuthProviders.mockResolvedValue({
      data: { providers: [] },
      error: null,
    });

    const { container } = renderButtons();

    await waitFor(() => expect(mocks.listOAuthProviders).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the provider list errors", async () => {
    mocks.listOAuthProviders.mockResolvedValue({ data: null, error: {} });

    const { container } = renderButtons();

    await waitFor(() => expect(mocks.listOAuthProviders).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a button per configured provider", async () => {
    mocks.listOAuthProviders.mockResolvedValue({
      data: {
        providers: [
          { id: "google", name: "Google", scopes: [] },
          { id: "github", name: "GitHub", scopes: [] },
        ],
      },
      error: null,
    });

    renderButtons();

    expect(
      await screen.findByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue with GitHub" }),
    ).toBeInTheDocument();
  });

  it("stashes the provider, starts login, and redirects the browser", async () => {
    const user = userEvent.setup();
    mocks.listOAuthProviders.mockResolvedValue({
      data: { providers: [{ id: "google", name: "Google", scopes: [] }] },
      error: null,
    });
    mocks.startOAuthLogin.mockResolvedValue({
      data: {
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?x=1",
        state: "state-token",
      },
      error: null,
    });

    renderButtons();
    await user.click(
      await screen.findByRole("button", { name: "Continue with Google" }),
    );

    // The provider id is not in the callback URL, so it must be stored for the
    // callback to read back.
    expect(sessionStorage.getItem(OAUTH_PROVIDER_STORAGE_KEY)).toBe("google");
    expect(mocks.startOAuthLogin).toHaveBeenCalledWith({
      providerId: "google",
      redirectUri: "https://admin.example.com/oauth/callback",
    });
    await waitFor(() =>
      expect(mocks.assign).toHaveBeenCalledWith(
        "https://accounts.google.com/o/oauth2/v2/auth?x=1",
      ),
    );
  });

  it("does not leave a stale provider or redirect when start fails", async () => {
    const user = userEvent.setup();
    mocks.listOAuthProviders.mockResolvedValue({
      data: { providers: [{ id: "google", name: "Google", scopes: [] }] },
      error: null,
    });
    mocks.startOAuthLogin.mockResolvedValue({ data: null, error: {} });

    renderButtons();
    await user.click(
      await screen.findByRole("button", { name: "Continue with Google" }),
    );

    await waitFor(() =>
      expect(sessionStorage.getItem(OAUTH_PROVIDER_STORAGE_KEY)).toBeNull(),
    );
    expect(mocks.assign).not.toHaveBeenCalled();
  });
});
