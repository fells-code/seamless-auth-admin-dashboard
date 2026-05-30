/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDeleteUser } from "./useDeleteUser";

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

describe("useDeleteUser", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("deletes users by id and clears affected query state", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    });
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const removeQueries = vi.spyOn(queryClient, "removeQueries");

    apiFetch.mockResolvedValue({ message: "deleted" });
    const { result } = renderHook(() => useDeleteUser(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync("user_1");
    });

    expect(apiFetch).toHaveBeenCalledWith("/admin/users/user_1", {
      method: "DELETE",
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["sessions"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["events"] });
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: ["user-detail", "user_1"],
    });
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: ["user-anomalies", "user_1"],
    });
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: ["user-timeseries", "user_1"],
    });
  });
});
