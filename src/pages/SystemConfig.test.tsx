/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SystemConfigPage from "./SystemConfig";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  useSystemConfig: vi.fn(),
  useUpdateSystemConfig: vi.fn(),
}));

vi.mock("../hooks/useSystemConfig", () => ({
  useSystemConfig: mocks.useSystemConfig,
}));

vi.mock("../hooks/useUpdateSystemConfig", () => ({
  useUpdateSystemConfig: mocks.useUpdateSystemConfig,
}));

const baseConfig = {
  app_name: "Seamless Auth",
  available_roles: ["user", "admin"],
  default_roles: ["user"],
  access_token_ttl: "15m",
  refresh_token_ttl: "30d",
  rate_limit: 100,
  delay_after: 10,
  login_methods: ["passkey", "magic_link"],
  passkey_login_fallback_enabled: true,
  oauth_providers: [],
  rpid: "example.com",
  origins: ["https://example.com"],
};

describe("SystemConfigPage", () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.useSystemConfig.mockReturnValue({
      data: baseConfig,
      isLoading: false,
    });
    mocks.useUpdateSystemConfig.mockReturnValue({
      mutate: mocks.mutate,
      isPending: false,
    });
  });

  it("saves selected login policy fields", () => {
    render(<SystemConfigPage />);

    fireEvent.click(screen.getByRole("checkbox", { name: /email otp/i }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: /passkey login fallback/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        login_methods: ["passkey", "magic_link", "email_otp"],
        passkey_login_fallback_enabled: false,
      }),
    );
  });

  it("adds OAuth provider configuration without a secret value", () => {
    render(<SystemConfigPage />);

    fireEvent.change(screen.getByLabelText(/provider id/i), {
      target: { value: "google" },
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "Google" },
    });
    fireEvent.change(screen.getByLabelText(/client id/i), {
      target: { value: "client-id" },
    });
    fireEvent.change(screen.getByLabelText(/client secret env/i), {
      target: { value: "GOOGLE_CLIENT_SECRET" },
    });
    fireEvent.change(screen.getByLabelText(/authorization url/i), {
      target: { value: "https://accounts.google.com/o/oauth2/v2/auth" },
    });
    fireEvent.change(screen.getByLabelText(/token url/i), {
      target: { value: "https://oauth2.googleapis.com/token" },
    });
    fireEvent.change(screen.getByLabelText(/user info url/i), {
      target: { value: "https://openidconnect.googleapis.com/v1/userinfo" },
    });
    fireEvent.change(screen.getByLabelText(/redirect uri/i), {
      target: { value: "https://example.com/oauth/callback" },
    });
    fireEvent.change(screen.getByLabelText(/scopes/i), {
      target: { value: "openid, email, profile" },
    });

    fireEvent.click(screen.getByRole("button", { name: /add provider/i }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        oauth_providers: [
          expect.objectContaining({
            id: "google",
            name: "Google",
            clientId: "client-id",
            clientSecretEnv: "GOOGLE_CLIENT_SECRET",
            scopes: ["openid", "email", "profile"],
          }),
        ],
      }),
    );
  });
});
