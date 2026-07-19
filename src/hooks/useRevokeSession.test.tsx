/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRevokeSession } from "./useRevokeSession";

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

describe("useRevokeSession", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("revokes by session id when given a bare string", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRevokeSession(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync("session_1");
    });

    expect(apiFetch).toHaveBeenCalledWith("/admin/sessions/by-id/session_1", {
      method: "DELETE",
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["sessions"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });

  it("also refreshes the owning user's detail view when a userId is given", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRevokeSession(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "session_1", userId: "user_1" });
    });

    expect(apiFetch).toHaveBeenCalledWith("/admin/sessions/by-id/session_1", {
      method: "DELETE",
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["user-detail", "user_1"],
    });
  });

  it("leaves user detail untouched when no userId is given", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRevokeSession(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "session_1" });
    });

    expect(invalidateQueries).not.toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(["user-detail"]),
      }),
    );
  });
});
