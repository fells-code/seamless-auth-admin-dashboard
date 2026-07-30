/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SystemConfigPage from "./SystemConfig";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  createProvider: vi.fn(),
  updateProvider: vi.fn(),
  removeProvider: vi.fn(),
  useSystemConfig: vi.fn(),
  useUpdateSystemConfig: vi.fn(),
  useOAuthProviders: vi.fn(),
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

vi.mock("../hooks/useOAuthProviders", () => ({
  useOAuthProviders: mocks.useOAuthProviders,
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

const storedProvider = {
  id: "google",
  name: "Google",
  enabled: true,
  clientId: "old-client",
  clientSecretEnv: "GOOGLE_CLIENT_SECRET",
  authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
  scopes: ["openid"],
  redirectUris: [],
  subjectJsonPath: "sub",
  emailJsonPath: "email",
  emailVerifiedJsonPath: "email_verified",
  allowSignup: true,
  accountLinking: "email",
  requireEmailVerified: false,
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
    mocks.createProvider.mockReset();
    mocks.updateProvider.mockReset();
    mocks.removeProvider.mockReset();
    mocks.useOAuthProviders.mockReturnValue({
      create: { mutate: mocks.createProvider, isPending: false },
      update: { mutate: mocks.updateProvider, isPending: false },
      remove: { mutate: mocks.removeProvider, isPending: false },
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

  it("creates an OAuth provider via the dedicated route, without a secret value", async () => {
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

    // Provider changes are immediate and go through the dedicated route, not the
    // whole-config Save action.
    fireEvent.click(screen.getByRole("button", { name: /add provider/i }));

    await waitFor(() =>
      expect(mocks.createProvider).toHaveBeenCalledWith(
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
        expect.objectContaining({
          onError: expect.any(Function),
          onSuccess: expect.any(Function),
        }),
      ),
    );

    const payload = mocks.createProvider.mock.calls[0]![0];
    expect(payload).not.toHaveProperty("clientSecret");
    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(mocks.useStepUpGuard()).toHaveBeenCalled();
  });

  it("loads a stored provider into the form and sends only what changed", async () => {
    mocks.useSystemConfig.mockReturnValue({
      data: { ...baseConfig, oauth_providers: [storedProvider] },
      isLoading: false,
    });

    render(<SystemConfigPage />);

    fireEvent.click(screen.getByRole("button", { name: /edit google/i }));

    // The stored values populate the form, so nothing has to be retyped.
    expect(screen.getByLabelText(/authorization url/i)).toHaveValue(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(screen.getByLabelText(/^client id$/i)).toHaveValue("old-client");

    fireEvent.change(screen.getByLabelText(/^client id$/i), {
      target: { value: "new-client" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save provider/i }));

    await waitFor(() => expect(mocks.updateProvider).toHaveBeenCalled());

    const [payload] = mocks.updateProvider.mock.calls[0]!;
    expect(payload.id).toBe("google");
    // Only the edited field travels. Everything the operator did not touch,
    // including the URLs and the JSON paths, stays out of the PATCH body.
    expect(payload.updates).toEqual({ clientId: "new-client" });
    expect(mocks.createProvider).not.toHaveBeenCalled();
  });

  it("preserves a disabled allowSignup instead of resetting it on save", async () => {
    mocks.useSystemConfig.mockReturnValue({
      data: {
        ...baseConfig,
        oauth_providers: [{ ...storedProvider, allowSignup: false }],
      },
      isLoading: false,
    });

    render(<SystemConfigPage />);

    fireEvent.click(screen.getByRole("button", { name: /edit google/i }));

    expect(
      screen.getByRole("checkbox", { name: /allow just-in-time signup/i }),
    ).not.toBeChecked();

    fireEvent.change(screen.getByLabelText(/^client id$/i), {
      target: { value: "new-client" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save provider/i }));

    await waitFor(() => expect(mocks.updateProvider).toHaveBeenCalled());

    const [payload] = mocks.updateProvider.mock.calls[0]!;
    expect(payload.updates).not.toHaveProperty("allowSignup");
  });

  it("refuses to submit a provider whose required URLs are blank", async () => {
    render(<SystemConfigPage />);

    fireEvent.change(screen.getByLabelText(/provider id/i), {
      target: { value: "google" },
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "Google" },
    });
    fireEvent.change(screen.getByLabelText(/^client id$/i), {
      target: { value: "client-id" },
    });
    fireEvent.change(screen.getByLabelText(/client secret env/i), {
      target: { value: "GOOGLE_CLIENT_SECRET" },
    });

    fireEvent.click(screen.getByRole("button", { name: /add provider/i }));

    expect(
      await screen.findAllByText("This URL is required for OAuth to work."),
    ).toHaveLength(3);
    expect(mocks.createProvider).not.toHaveBeenCalled();
  });

  it("rejects a malformed url and a provider id that is not kebab-case", async () => {
    render(<SystemConfigPage />);

    fireEvent.change(screen.getByLabelText(/provider id/i), {
      target: { value: "Google Provider" },
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "Google" },
    });
    fireEvent.change(screen.getByLabelText(/^client id$/i), {
      target: { value: "client-id" },
    });
    fireEvent.change(screen.getByLabelText(/client secret env/i), {
      target: { value: "GOOGLE_CLIENT_SECRET" },
    });
    fireEvent.change(screen.getByLabelText(/authorization url/i), {
      target: { value: "accounts.google.com/auth" },
    });
    fireEvent.change(screen.getByLabelText(/token url/i), {
      target: { value: "https://oauth2.googleapis.com/token" },
    });
    fireEvent.change(screen.getByLabelText(/user info url/i), {
      target: { value: "https://openidconnect.googleapis.com/v1/userinfo" },
    });

    fireEvent.click(screen.getByRole("button", { name: /add provider/i }));

    expect(
      await screen.findByText(
        "Use lowercase kebab-case, such as google or azure-ad.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Enter a full URL, including https://."),
    ).toBeInTheDocument();
    expect(mocks.createProvider).not.toHaveBeenCalled();
  });

  it("shows each provider's enabled state and counts both redirect fields", () => {
    mocks.useSystemConfig.mockReturnValue({
      data: {
        ...baseConfig,
        oauth_providers: [
          {
            ...storedProvider,
            enabled: false,
            redirectUri: "https://example.com/oauth/callback",
            redirectUris: ["https://example.com/oauth/callback"],
          },
        ],
      },
      isLoading: false,
    });

    render(<SystemConfigPage />);

    const card = within(screen.getByRole("group", { name: "Google" }));

    expect(card.getByText("Disabled")).toBeInTheDocument();
    // The summary previously counted the allowlist only, so a provider with just
    // the single redirect URI was described as falling back to the origin.
    expect(
      card.getByText("Redirects: 1 fixed, 1 allowlisted"),
    ).toBeInTheDocument();
  });

  it("disables a provider through the dedicated route after step-up", async () => {
    mocks.useSystemConfig.mockReturnValue({
      data: {
        ...baseConfig,
        oauth_providers: [
          {
            id: "google",
            name: "Google",
            enabled: true,
            clientId: "client-id",
            clientSecretEnv: "GOOGLE_CLIENT_SECRET",
            authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
            tokenUrl: "https://oauth2.googleapis.com/token",
            userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
            scopes: ["openid"],
            redirectUris: [],
            subjectJsonPath: "sub",
            emailJsonPath: "email",
            emailVerifiedJsonPath: "email_verified",
            allowSignup: true,
            accountLinking: "email",
            requireEmailVerified: false,
          },
        ],
      },
      isLoading: false,
    });

    render(<SystemConfigPage />);

    fireEvent.click(screen.getByRole("button", { name: /^disable$/i }));

    await waitFor(() =>
      expect(mocks.updateProvider).toHaveBeenCalledWith(
        { id: "google", updates: { enabled: false } },
        expect.anything(),
      ),
    );
    expect(mocks.useStepUpGuard()).toHaveBeenCalled();
  });

  it("removes a provider after confirmation and step-up", async () => {
    mocks.useSystemConfig.mockReturnValue({
      data: {
        ...baseConfig,
        oauth_providers: [
          {
            id: "google",
            name: "Google",
            enabled: true,
            clientId: "client-id",
            clientSecretEnv: "GOOGLE_CLIENT_SECRET",
            authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
            tokenUrl: "https://oauth2.googleapis.com/token",
            userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
            scopes: ["openid"],
            redirectUris: [],
            subjectJsonPath: "sub",
            emailJsonPath: "email",
            emailVerifiedJsonPath: "email_verified",
            allowSignup: true,
            accountLinking: "email",
            requireEmailVerified: false,
          },
        ],
      },
      isLoading: false,
    });

    render(<SystemConfigPage />);

    fireEvent.click(screen.getByRole("button", { name: /remove google/i }));

    await waitFor(() =>
      expect(mocks.removeProvider).toHaveBeenCalledWith(
        "google",
        expect.anything(),
      ),
    );
    expect(mocks.confirm).toHaveBeenCalled();
  });

  it("does not remove a provider when confirmation is declined", async () => {
    mocks.confirm.mockResolvedValue(false);
    mocks.useSystemConfig.mockReturnValue({
      data: {
        ...baseConfig,
        oauth_providers: [
          {
            id: "google",
            name: "Google",
            enabled: true,
            clientId: "client-id",
            clientSecretEnv: "GOOGLE_CLIENT_SECRET",
            authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
            tokenUrl: "https://oauth2.googleapis.com/token",
            userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
            scopes: ["openid"],
            redirectUris: [],
            subjectJsonPath: "sub",
            emailJsonPath: "email",
            emailVerifiedJsonPath: "email_verified",
            allowSignup: true,
            accountLinking: "email",
            requireEmailVerified: false,
          },
        ],
      },
      isLoading: false,
    });

    render(<SystemConfigPage />);

    fireEvent.click(screen.getByRole("button", { name: /remove google/i }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.removeProvider).not.toHaveBeenCalled();
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

  it("does not stage a cleared or negative numeric field", () => {
    render(<SystemConfigPage />);

    const rateLimit = screen.getByLabelText(/rate limit/i);

    fireEvent.change(rateLimit, { target: { value: "" } });
    expect(
      screen.getByText("Enter a whole number of 1 or greater."),
    ).toBeInTheDocument();

    fireEvent.change(rateLimit, { target: { value: "-5" } });
    expect(
      screen.getByText("Enter a whole number of 1 or greater."),
    ).toBeInTheDocument();

    // Blur restores the staged value, so the field never shows something the
    // Save action would not send.
    fireEvent.blur(rateLimit);
    expect(rateLimit).toHaveValue(100);

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("disables the configuration inputs for a read-only administrator", () => {
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: false,
    });

    render(<SystemConfigPage />);

    expect(screen.getByLabelText(/app name/i)).toBeDisabled();
    expect(screen.getByLabelText(/rate limit/i)).toBeDisabled();
    expect(screen.getByLabelText(/rp id/i)).toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: /passkey login fallback/i }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Add a role")).toBeDisabled();
    expect(screen.getByLabelText(/allowed origins/i)).toBeDisabled();
  });

  it("confirms before discarding a dirty draft", async () => {
    mocks.confirm.mockResolvedValue(false);

    render(<SystemConfigPage />);

    fireEvent.change(screen.getByLabelText(/app name/i), {
      target: { value: "Renamed" },
    });
    fireEvent.click(screen.getByRole("button", { name: /discard/i }));

    await waitFor(() =>
      expect(mocks.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Discard changes" }),
      ),
    );
    // Declining leaves the draft untouched.
    expect(screen.getByLabelText(/app name/i)).toHaveValue("Renamed");
  });

  it("warns before saving a changed relying-party id", async () => {
    mocks.confirm.mockResolvedValue(false);

    render(<SystemConfigPage />);

    fireEvent.change(screen.getByLabelText(/rp id/i), {
      target: { value: "new.example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(mocks.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Confirm WebAuthn changes",
          description: expect.stringContaining("invalidates every passkey"),
        }),
      ),
    );
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("refuses to remove the only allowed origin", () => {
    render(<SystemConfigPage />);

    expect(
      screen.getByRole("button", { name: "Remove https://example.com" }),
    ).toBeDisabled();
  });
});
