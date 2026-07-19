/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDeviceReplacementRecovery } from "./useDeviceReplacementRecovery";

const apiFetch = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", () => ({
  apiFetch,
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useDeviceReplacementRecovery", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("posts the recovery options and keeps the user id out of the body", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockResolvedValue({
      userId: "user_1",
      revokedSessions: 2,
      removedCredentials: 1,
      disabledTotpCredentials: 0,
    });
    const { result } = renderHook(() => useDeviceReplacementRecovery(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        userId: "user_1",
        revokeSessions: true,
        removePasskeys: true,
        disableTotp: false,
      });
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/admin/users/user_1/recovery/device-replacement",
      {
        method: "POST",
        body: JSON.stringify({
          revokeSessions: true,
          removePasskeys: true,
          disableTotp: false,
        }),
      },
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["user-detail", "user_1"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["sessions"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });

  it("does not refresh any view when recovery fails", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockRejectedValue(new Error("Not allowed"));
    const { result } = renderHook(() => useDeviceReplacementRecovery(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ userId: "user_1" }),
      ).rejects.toThrow("Not allowed");
    });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
