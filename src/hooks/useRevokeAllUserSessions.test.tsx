/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRevokeAllUserSessions } from "./useRevokeAllUserSessions";

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

describe("useRevokeAllUserSessions", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("revokes every session for the user and refreshes affected views", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRevokeAllUserSessions(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync("user_1");
    });

    expect(apiFetch).toHaveBeenCalledWith("/admin/sessions/user_1/revoke-all", {
      method: "DELETE",
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["user-detail", "user_1"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["sessions"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });

  it("does not refresh any view when the revoke fails", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockRejectedValue(new Error("Not allowed"));
    const { result } = renderHook(() => useRevokeAllUserSessions(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync("user_1")).rejects.toThrow(
        "Not allowed",
      );
    });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
