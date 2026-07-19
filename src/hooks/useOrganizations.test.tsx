/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useAddOrganizationMember,
  useCreateOrganization,
  useOrganizationMembers,
  useOrganizations,
  useRemoveOrganizationMember,
  useUpdateOrganization,
  useUpdateOrganizationMember,
} from "./useOrganizations";

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

beforeEach(() => {
  apiFetch.mockReset();
});

describe("useOrganizations", () => {
  it("lists organizations", async () => {
    apiFetch.mockResolvedValue({ organizations: [], total: 0 });

    const { result } = renderHook(() => useOrganizations(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith("/admin/organizations");
  });
});

describe("useOrganizationMembers", () => {
  it("lists members for an organization", async () => {
    apiFetch.mockResolvedValue({ members: [], total: 0 });

    const { result } = renderHook(() => useOrganizationMembers("org_1"), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith("/admin/organizations/org_1/members");
  });

  it("stays idle until an organization is selected", () => {
    const { result } = renderHook(() => useOrganizationMembers(null), {
      wrapper: createWrapper(createQueryClient()),
    });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useCreateOrganization", () => {
  it("posts the organization and refreshes the list", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockResolvedValue({ organization: { id: "org_1" } });
    const { result } = renderHook(() => useCreateOrganization(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ name: "Acme", slug: "acme" });
    });

    expect(apiFetch).toHaveBeenCalledWith("/admin/organizations", {
      method: "POST",
      body: JSON.stringify({ name: "Acme", slug: "acme" }),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["organizations"],
    });
  });
});

describe("useUpdateOrganization", () => {
  it("patches by id and keeps the id out of the request body", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockResolvedValue({ organization: { id: "org_1" } });
    const { result } = renderHook(() => useUpdateOrganization(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        organizationId: "org_1",
        name: "Acme Inc",
      });
    });

    expect(apiFetch).toHaveBeenCalledWith("/admin/organizations/org_1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Acme Inc" }),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["organizations"],
    });
  });

  it("refreshes members using the organization id from the response", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    // The server is the source of truth for the id here, not the input.
    apiFetch.mockResolvedValue({ organization: { id: "org_renamed" } });
    const { result } = renderHook(() => useUpdateOrganization(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        organizationId: "org_1",
        slug: "renamed",
      });
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["organization-members", "org_renamed"],
    });
  });
});

describe("useAddOrganizationMember", () => {
  it("posts the member and keeps the organization id out of the body", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockResolvedValue({ membership: { id: "mem_1" } });
    const { result } = renderHook(() => useAddOrganizationMember(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        organizationId: "org_1",
        email: "ada@example.com",
        roles: ["member"],
      });
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/admin/organizations/org_1/members",
      {
        method: "POST",
        body: JSON.stringify({
          email: "ada@example.com",
          roles: ["member"],
        }),
      },
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["organizations"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["organization-members", "org_1"],
    });
  });
});

describe("useUpdateOrganizationMember", () => {
  it("patches the member and keeps both ids out of the body", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockResolvedValue({ membership: { id: "mem_1" } });
    const { result } = renderHook(() => useUpdateOrganizationMember(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        organizationId: "org_1",
        userId: "user_1",
        roles: ["owner"],
      });
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/admin/organizations/org_1/members/user_1",
      {
        method: "PATCH",
        body: JSON.stringify({ roles: ["owner"] }),
      },
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["organization-members", "org_1"],
    });
  });
});

describe("useRemoveOrganizationMember", () => {
  it("deletes the member and refreshes both views", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockResolvedValue({ message: "removed" });
    const { result } = renderHook(() => useRemoveOrganizationMember(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        organizationId: "org_1",
        userId: "user_1",
      });
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/admin/organizations/org_1/members/user_1",
      { method: "DELETE" },
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["organizations"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["organization-members", "org_1"],
    });
  });

  it("does not refresh anything when removal fails", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockRejectedValue(
      new Error("Organization must keep at least one owner"),
    );
    const { result } = renderHook(() => useRemoveOrganizationMember(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          organizationId: "org_1",
          userId: "user_1",
        }),
      ).rejects.toThrow("Organization must keep at least one owner");
    });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
