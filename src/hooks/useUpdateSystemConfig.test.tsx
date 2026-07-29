/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUpdateSystemConfig } from "./useUpdateSystemConfig";
import type { SystemConfig } from "@seamless-auth/types";

const apiFetch = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", () => ({
  apiFetch,
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

const config: SystemConfig = {
  app_name: "Seamless",
  available_roles: ["admin:read", "admin:write"],
  default_roles: [],
  access_token_ttl: "15m",
  refresh_token_ttl: "30d",
  rate_limit: 100,
  delay_after: 50,
  login_methods: ["passkey"],
  passkey_login_fallback_enabled: true,
  oauth_providers: [],
  lockout_policy: {
    enabled: true,
    maxFailures: 5,
    windowSeconds: 300,
    lockoutSeconds: 900,
  },
  rpid: "example.com",
  origins: ["https://example.com"],
};

describe("useUpdateSystemConfig", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("patches the admin system config and refreshes it", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockResolvedValue(config);
    const { result } = renderHook(() => useUpdateSystemConfig(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync(config);
    });

    expect(apiFetch).toHaveBeenCalledWith("/system-config/admin", {
      method: "PATCH",
      body: JSON.stringify(config),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["system-config"],
    });
  });

  it("does not refresh the config when the save fails", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockRejectedValue(new Error("Invalid data"));
    const { result } = renderHook(() => useUpdateSystemConfig(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(config)).rejects.toThrow(
        "Invalid data",
      );
    });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
