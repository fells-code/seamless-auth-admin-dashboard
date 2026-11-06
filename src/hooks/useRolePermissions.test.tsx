/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api";
import {
  useCreateOrganizationRole,
  useCreatePermission,
  useDeleteOrganizationRole,
  useDeletePermission,
  usePermissionCatalogue,
  useRoleDefinitions,
  useSetRolePermissions,
  useUpdateOrganizationRole,
  useUpdatePermission,
} from "./useRolePermissions";

const apiFetch = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", async (importActual) => ({
  ...(await importActual<typeof import("../lib/api")>()),
  apiFetch,
}));

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");

  return {
    invalidate,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue({});
});

describe("catalogue reads", () => {
  it("lists permissions and roles", async () => {
    const { wrapper } = setup();
    const permissions = renderHook(() => usePermissionCatalogue(), { wrapper });
    const roles = renderHook(() => useRoleDefinitions(), { wrapper });

    await waitFor(() =>
      expect(permissions.result.current.isSuccess).toBe(true),
    );
    await waitFor(() => expect(roles.result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith("/admin/permissions");
    expect(apiFetch).toHaveBeenCalledWith("/admin/roles");
  });

  // Each retry waits, so an older API held the page on its skeleton before the
  // upgrade message appeared, and then retried again on every remount.
  it.each([
    ["usePermissionCatalogue", usePermissionCatalogue],
    ["useRoleDefinitions", useRoleDefinitions],
  ])("%s does not retry a 404", async (_name, useHook) => {
    apiFetch.mockRejectedValue(new ApiError("Not found", 404));

    const { result } = renderHook(() => useHook(), {
      wrapper: setup().wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});

describe("writes", () => {
  it("creates a permission", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useCreatePermission(), { wrapper });

    await act(() =>
      result.current.mutateAsync({ name: "invoices:read", description: "x" }),
    );

    expect(apiFetch).toHaveBeenCalledWith("/admin/permissions", {
      method: "POST",
      body: JSON.stringify({ name: "invoices:read", description: "x" }),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["permissions"] });
  });

  it("updates a permission's description", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useUpdatePermission(), { wrapper });

    await act(() =>
      result.current.mutateAsync({ name: "invoices:read", description: null }),
    );

    expect(apiFetch).toHaveBeenCalledWith(
      "/admin/permissions/invoices%3Aread",
      {
        method: "PATCH",
        body: JSON.stringify({ description: null }),
      },
    );
  });

  it("deletes a permission and refreshes the roles that listed it", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useDeletePermission(), { wrapper });

    await act(() => result.current.mutateAsync("invoices:read"));

    expect(apiFetch).toHaveBeenCalledWith(
      "/admin/permissions/invoices%3Aread",
      {
        method: "DELETE",
      },
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["role-definitions"],
    });
  });

  it("replaces a mapping, encoding a legacy role name", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useSetRolePermissions(), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        kind: "organization",
        name: "Legacy Role",
        permissions: ["invoices:read"],
      }),
    );

    expect(apiFetch).toHaveBeenCalledWith(
      "/admin/roles/organization/Legacy%20Role/permissions",
      {
        method: "PUT",
        body: JSON.stringify({ permissions: ["invoices:read"] }),
      },
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["role-definitions"],
    });
  });

  it("creates an organization role", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useCreateOrganizationRole(), {
      wrapper,
    });

    await act(() =>
      result.current.mutateAsync({ name: "billing", permissions: [] }),
    );

    expect(apiFetch).toHaveBeenCalledWith("/admin/organization-roles", {
      method: "POST",
      body: JSON.stringify({ name: "billing", permissions: [] }),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["role-definitions"],
    });
  });

  it("updates and deletes an organization role, encoding its name", async () => {
    const { wrapper } = setup();
    const update = renderHook(() => useUpdateOrganizationRole(), { wrapper });
    const remove = renderHook(() => useDeleteOrganizationRole(), { wrapper });

    await act(() =>
      update.result.current.mutateAsync({
        name: "Legacy Role",
        description: "Old",
      }),
    );
    await act(() => remove.result.current.mutateAsync("Legacy Role"));

    expect(apiFetch).toHaveBeenCalledWith(
      "/admin/organization-roles/Legacy%20Role",
      { method: "PATCH", body: JSON.stringify({ description: "Old" }) },
    );
    expect(apiFetch).toHaveBeenCalledWith(
      "/admin/organization-roles/Legacy%20Role",
      { method: "DELETE" },
    );
  });
});
