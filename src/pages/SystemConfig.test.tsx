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
});
