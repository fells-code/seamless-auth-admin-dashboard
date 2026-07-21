/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SystemConfigPage from "./SystemConfig";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  useSystemConfig: vi.fn(),
  useUpdateSystemConfig: vi.fn(),
  useAdminPermissions: vi.fn(),
  useStepUpGuard: vi.fn(),
  useConfirm: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock("../hooks/useSystemConfig", () => ({
  useSystemConfig: mocks.useSystemConfig,
}));

vi.mock("../hooks/useUpdateSystemConfig", () => ({
  useUpdateSystemConfig: mocks.useUpdateSystemConfig,
}));

vi.mock("../hooks/useAdminPermissions", () => ({
  useAdminPermissions: mocks.useAdminPermissions,
}));

vi.mock("../hooks/useStepUpGuard", () => ({
  useStepUpGuard: mocks.useStepUpGuard,
}));

vi.mock("../hooks/useConfirm", () => ({
  useConfirm: mocks.useConfirm,
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
  lockout_policy: {
    enabled: true,
    maxFailures: 10,
    windowSeconds: 900,
    lockoutSeconds: 900,
  },
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
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: true,
    });
    mocks.useStepUpGuard.mockReturnValue(vi.fn().mockResolvedValue(true));
    mocks.confirm.mockReset().mockResolvedValue(true);
    mocks.useConfirm.mockReturnValue(mocks.confirm);
  });

  it("saves selected login policy fields after step-up", async () => {
    render(<SystemConfigPage />);

    fireEvent.click(screen.getByRole("checkbox", { name: /email otp/i }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: /passkey login fallback/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          login_methods: ["passkey", "magic_link", "email_otp"],
          passkey_login_fallback_enabled: false,
        }),
        expect.objectContaining({
          onError: expect.any(Function),
          onSuccess: expect.any(Function),
        }),
      ),
    );
    expect(mocks.useStepUpGuard()).toHaveBeenCalled();
  });

  it("sends only changed keys, not the full config, on save", async () => {
    // The GET response carries read-only keys (such as frontend_url) that the
    // strict PATCH schema rejects. Saving must send only the edited fields.
    mocks.useSystemConfig.mockReturnValue({
      data: { ...baseConfig, frontend_url: "https://app.example.com" },
      isLoading: false,
    });

    render(<SystemConfigPage />);

    fireEvent.click(screen.getByRole("checkbox", { name: /email otp/i }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());

    const payload = mocks.mutate.mock.calls[0]![0];
    expect(payload).toEqual({
      login_methods: ["passkey", "magic_link", "email_otp"],
    });
    expect(payload).not.toHaveProperty("frontend_url");
    expect(payload).not.toHaveProperty("app_name");
  });

  it("does not save config when step-up fails", async () => {
    const ensureStepUp = vi.fn().mockResolvedValue(false);
    mocks.useStepUpGuard.mockReturnValue(ensureStepUp);

    render(<SystemConfigPage />);

    fireEvent.click(screen.getByRole("checkbox", { name: /email otp/i }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(ensureStepUp).toHaveBeenCalled());
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("adds scoped roles to the available role set", async () => {
    render(<SystemConfigPage />);

    fireEvent.change(screen.getByPlaceholderText(/admin:read/i), {
      target: { value: "admin:write" },
    });
    const [addRoleButton] = screen.getAllByRole("button", { name: /^add$/i });
    expect(addRoleButton).toBeDefined();
    fireEvent.click(addRoleButton!);
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          available_roles: ["user", "admin", "admin:write"],
        }),
        expect.objectContaining({
          onError: expect.any(Function),
          onSuccess: expect.any(Function),
        }),
      ),
    );
  });

  it("adds OAuth provider configuration without a secret value", async () => {
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
    fireEvent.change(screen.getByLabelText(/^redirect uri$/i), {
      target: { value: "https://example.com/oauth/callback" },
    });
    fireEvent.change(screen.getByLabelText(/redirect uri allowlist/i), {
      target: { value: "https://example.com/oauth/callback" },
    });
    fireEvent.change(screen.getByLabelText(/scopes/i), {
      target: { value: "openid, email, profile" },
    });

    fireEvent.click(screen.getByRole("button", { name: /add provider/i }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          oauth_providers: [
            expect.objectContaining({
              id: "google",
              name: "Google",
              clientId: "client-id",
              clientSecretEnv: "GOOGLE_CLIENT_SECRET",
              scopes: ["openid", "email", "profile"],
              redirectUris: ["https://example.com/oauth/callback"],
              emailVerifiedJsonPath: "email_verified",
              accountLinking: "email",
              requireEmailVerified: false,
            }),
          ],
        }),
        expect.objectContaining({
          onError: expect.any(Function),
          onSuccess: expect.any(Function),
        }),
      ),
    );
  });

  it("saves lockout policy changes", async () => {
    render(<SystemConfigPage />);

    fireEvent.change(screen.getByLabelText(/max failures/i), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText(/lockout seconds/i), {
      target: { value: "600" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          lockout_policy: expect.objectContaining({
            maxFailures: 5,
            lockoutSeconds: 600,
          }),
        }),
        expect.objectContaining({
          onError: expect.any(Function),
          onSuccess: expect.any(Function),
        }),
      ),
    );
  });

  it("does not expose an enabled save action to read-only admins", () => {
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: false,
    });

    render(<SystemConfigPage />);

    expect(screen.getByRole("button", { name: /read only/i })).toBeDisabled();
  });

  it("requires confirmation before removing an available role", async () => {
    mocks.confirm.mockResolvedValue(false);

    render(<SystemConfigPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Remove user from available roles" }),
    );

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());

    // Dismissing the confirmation must leave the role in place, so the control
    // for it is still rendered and nothing was staged for saving.
    expect(
      screen.getByRole("button", { name: "Remove user from available roles" }),
    ).toBeInTheDocument();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("drops a removed role from the default roles as well", async () => {
    render(<SystemConfigPage />);

    // "user" is both an available role and a default role.
    fireEvent.click(
      screen.getByRole("button", { name: "Remove user from available roles" }),
    );

    // Removal resolves a confirm promise, so wait for the chip to disappear
    // before saving rather than racing the staged change.
    await waitFor(() =>
      expect(
        screen.queryByRole("button", {
          name: "Remove user from available roles",
        }),
      ).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    // Leaving it in default_roles would keep assigning a role the config no
    // longer offers, with no chip left in the UI to clear it.
    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          available_roles: ["admin"],
          default_roles: [],
        }),
        expect.anything(),
      ),
    );
  });

  it("associates config fields and the role input with their labels", () => {
    render(<SystemConfigPage />);

    // Rendered through the shared Field and Input helpers.
    expect(screen.getByLabelText(/app name/i).tagName).toBe("INPUT");
    expect(screen.getByLabelText(/rate limit/i).tagName).toBe("INPUT");

    // Previously reachable only by its placeholder.
    expect(screen.getByLabelText(/add a role/i).tagName).toBe("INPUT");
  });

  it("exposes the login method checkboxes as a named group", () => {
    render(<SystemConfigPage />);

    expect(
      screen.getByRole("group", { name: /enabled login methods/i }),
    ).toBeInTheDocument();
  });
});
