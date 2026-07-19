/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateUser } from "./useCreateUser";

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

describe("useCreateUser", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("posts the new user and refreshes the user list", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockResolvedValue({ id: "user_1", email: "ada@example.com" });
    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: "ada@example.com",
        roles: ["admin:read"],
      });
    });

    expect(apiFetch).toHaveBeenCalledWith("/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email: "ada@example.com",
        roles: ["admin:read"],
      }),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["users"] });
  });

  it("surfaces the error and skips invalidation when creation fails", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockRejectedValue(new Error("User already exists"));
    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ email: "ada@example.com" }),
      ).rejects.toThrow("User already exists");
    });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
