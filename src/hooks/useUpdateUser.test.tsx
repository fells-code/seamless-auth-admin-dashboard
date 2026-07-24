/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUpdateUser } from "./useUpdateUser";

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

describe("useUpdateUser", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("patches the target user and refreshes detail and list views", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockResolvedValue({ id: "user_1", email: "ada@example.com" });
    const { result } = renderHook(() => useUpdateUser("user_1"), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ roles: ["admin:write"] });
    });

    expect(apiFetch).toHaveBeenCalledWith("/admin/users/user_1", {
      method: "PATCH",
      body: JSON.stringify({ roles: ["admin:write"] }),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["user-detail", "user_1"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["users"] });
  });

  it.each([
    ["an empty phone", "", null],
    ["a whitespace-only phone", "   ", null],
    ["a filled phone", " +15551234567 ", "+15551234567"],
  ])("sends %s to the API as %j", async (_label, entered, sent) => {
    const queryClient = createQueryClient();

    apiFetch.mockResolvedValue({ id: "user_1" });
    const { result } = renderHook(() => useUpdateUser("user_1"), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        phone: entered,
        roles: ["admin:write"],
      });
    });

    expect(apiFetch).toHaveBeenCalledWith("/admin/users/user_1", {
      method: "PATCH",
      body: JSON.stringify({ roles: ["admin:write"], phone: sent }),
    });
  });

  it("leaves phone out of the request when the caller omits it", async () => {
    const queryClient = createQueryClient();

    apiFetch.mockResolvedValue({ id: "user_1" });
    const { result } = renderHook(() => useUpdateUser("user_1"), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ roles: ["admin:write"] });
    });

    expect(apiFetch).toHaveBeenCalledWith("/admin/users/user_1", {
      method: "PATCH",
      body: JSON.stringify({ roles: ["admin:write"] }),
    });
  });

  it("does not refresh any query when the update fails", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockRejectedValue(new Error("Invalid data"));
    const { result } = renderHook(() => useUpdateUser("user_1"), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ email: "bad" }),
      ).rejects.toThrow("Invalid data");
    });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
