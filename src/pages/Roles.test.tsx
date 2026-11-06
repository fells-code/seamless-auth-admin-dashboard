/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api";
import Roles from "./Roles";

const mocks = vi.hoisted(() => ({
  usePermissionCatalogue: vi.fn(),
  useRoleDefinitions: vi.fn(),
  createPermission: vi.fn(),
  updatePermission: vi.fn(),
  deletePermission: vi.fn(),
  setRolePermissions: vi.fn(),
  createRole: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
  useAdminPermissions: vi.fn(),
  ensureStepUp: vi.fn(),
  confirm: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

const { mutation } = vi.hoisted(() => ({
  mutation: (mutate: ReturnType<typeof vi.fn>) => () => ({
    mutate,
    isPending: false,
  }),
}));

vi.mock("../hooks/useRolePermissions", () => ({
  usePermissionCatalogue: mocks.usePermissionCatalogue,
  useRoleDefinitions: mocks.useRoleDefinitions,
  useCreatePermission: mutation(mocks.createPermission),
  useUpdatePermission: mutation(mocks.updatePermission),
  useDeletePermission: mutation(mocks.deletePermission),
  useSetRolePermissions: mutation(mocks.setRolePermissions),
  useCreateOrganizationRole: mutation(mocks.createRole),
  useUpdateOrganizationRole: mutation(mocks.updateRole),
  useDeleteOrganizationRole: mutation(mocks.deleteRole),
}));

vi.mock("../hooks/useAdminPermissions", () => ({
  useAdminPermissions: mocks.useAdminPermissions,
}));

vi.mock("../hooks/useStepUpGuard", () => ({
  useStepUpGuard: () => mocks.ensureStepUp,
}));

vi.mock("../hooks/useToast", () => ({
  useToast: () => ({ success: mocks.toastSuccess, error: mocks.toastError }),
}));

vi.mock("../hooks/useConfirm", () => ({
  useConfirm: () => mocks.confirm,
}));

const invoicesRead = {
  id: "1",
  name: "invoices:read",
  description: "Read invoices",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};
const reportsRead = {
  ...invoicesRead,
  id: "2",
  name: "reports:read",
  description: null,
};

const roles = [
  {
    name: "admin",
    kind: "instance",
    description: null,
    builtIn: false,
    permissions: [],
  },
  {
    name: "admin",
    kind: "organization",
    description: "Runs the organization",
    builtIn: true,
    permissions: ["invoices:read"],
  },
  {
    name: "Legacy Role",
    kind: "organization",
    description: null,
    builtIn: false,
    permissions: [],
  },
];

function renderRoles() {
  return render(
    <MemoryRouter>
      <Roles />
    </MemoryRouter>,
  );
}

describe("Roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usePermissionCatalogue.mockReturnValue({
      data: { permissions: [invoicesRead, reportsRead], total: 2 },
      isLoading: false,
    });
    mocks.useRoleDefinitions.mockReturnValue({
      data: { roles },
      isLoading: false,
    });
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: true,
    });
    mocks.ensureStepUp.mockResolvedValue(true);
    mocks.confirm.mockResolvedValue(true);
  });

  it("lists permissions and both kinds of role", () => {
    renderRoles();

    const permissions = screen.getByRole("table", { name: "Permissions" });
    expect(permissions).toHaveTextContent("invoices:read");
    expect(permissions).toHaveTextContent("Read invoices");
    expect(permissions).toHaveTextContent("organization role admin");
    expect(permissions).toHaveTextContent("No role");

    expect(
      screen.getByRole("table", { name: "Organization roles" }),
    ).toHaveTextContent("Built in");
    expect(
      screen.getByRole("table", { name: "Instance roles" }),
    ).toHaveTextContent("admin");
  });

  it("states when a change applies and that the role kinds never share", () => {
    renderRoles();

    expect(
      screen.getByText(
        /a change reaches a user when their next access token is issued/,
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        /An instance admin and an organization admin are different roles that never share a grant/,
      ),
    ).toBeVisible();
  });

  it("links to system configuration for instance roles", () => {
    renderRoles();

    expect(
      screen.getByRole("link", { name: "Add or remove in System" }),
    ).toHaveAttribute("href", "/system");
  });

  it("shows a skeleton and a load failure", () => {
    mocks.useRoleDefinitions.mockReturnValue({ isLoading: true });
    const { unmount } = renderRoles();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    unmount();

    const refetch = vi.fn();
    mocks.useRoleDefinitions.mockReturnValue({
      isError: true,
      error: new ApiError("The API had a problem", 500),
      refetch,
    });
    mocks.usePermissionCatalogue.mockReturnValue({ isError: false, refetch });
    renderRoles();

    expect(
      screen.getByText("Could not load roles and permissions"),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it("says the API needs upgrading on a 404, with nothing to retry", () => {
    mocks.usePermissionCatalogue.mockReturnValue({
      isError: true,
      error: new ApiError("Not found", 404),
    });
    mocks.useRoleDefinitions.mockReturnValue({
      isError: true,
      error: new ApiError("Not found", 404),
    });
    renderRoles();

    expect(screen.getByText("Needs Seamless Auth API v0.23")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("creates a permission after step-up", async () => {
    mocks.createPermission.mockImplementation((_request, options) =>
      options.onSuccess({ permission: invoicesRead }),
    );
    renderRoles();

    fireEvent.click(screen.getByRole("button", { name: "New permission" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: " projects:write " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create permission" }));

    await waitFor(() =>
      expect(mocks.createPermission).toHaveBeenCalledWith(
        { name: "projects:write" },
        expect.anything(),
      ),
    );
    expect(mocks.ensureStepUp).toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("refuses an invalid permission name before asking the API", async () => {
    renderRoles();

    fireEvent.click(screen.getByRole("button", { name: "New permission" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "has spaces" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create permission" }));

    expect(await screen.findByText(/That name cannot be used/)).toBeVisible();
    expect(mocks.ensureStepUp).not.toHaveBeenCalled();
    expect(mocks.createPermission).not.toHaveBeenCalled();
  });

  it("does not write when step-up is refused", async () => {
    mocks.ensureStepUp.mockResolvedValue(false);
    renderRoles();

    fireEvent.click(
      screen.getByRole("button", { name: "Edit permissions Legacy Role" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "invoices:read" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
    expect(mocks.setRolePermissions).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("edits a permission's description without its name", async () => {
    mocks.updatePermission.mockImplementation((_request, options) =>
      options.onSuccess({ permission: invoicesRead }),
    );
    renderRoles();

    fireEvent.click(screen.getByRole("button", { name: "Edit invoices:read" }));
    expect(screen.getByLabelText("Name")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mocks.updatePermission).toHaveBeenCalledWith(
        { name: "invoices:read", description: null },
        expect.anything(),
      ),
    );
  });

  it("names the roles granting a permission when delete is refused", async () => {
    mocks.deletePermission.mockImplementation((_name, options) =>
      options.onError(
        new ApiError("Permission is still granted by a role", 409, undefined, {
          roles: [{ kind: "organization", name: "admin" }],
        }),
      ),
    );
    renderRoles();

    fireEvent.click(
      screen.getByRole("button", { name: "Delete invoices:read" }),
    );

    expect(
      await screen.findByText(
        /still granted by a role: organization role admin/,
      ),
    ).toBeVisible();
    expect(mocks.ensureStepUp).toHaveBeenCalled();
    expect(screen.getByText("Could not delete invoices:read")).toBeVisible();
  });

  it("does not delete when the confirmation is dismissed", async () => {
    mocks.confirm.mockResolvedValue(false);
    renderRoles();

    fireEvent.click(
      screen.getByRole("button", { name: "Delete invoices:read" }),
    );

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.ensureStepUp).not.toHaveBeenCalled();
    expect(mocks.deletePermission).not.toHaveBeenCalled();
  });

  it("replaces a mapping and says when it reaches holders", async () => {
    mocks.setRolePermissions.mockImplementation((_request, options) =>
      options.onSuccess({ role: roles[2] }),
    );
    renderRoles();

    fireEvent.click(
      screen.getByRole("button", { name: "Edit permissions Legacy Role" }),
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "reports:read" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mocks.setRolePermissions).toHaveBeenCalledWith(
        {
          kind: "organization",
          name: "Legacy Role",
          permissions: ["reports:read"],
        },
        expect.anything(),
      ),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Role permissions saved",
      expect.stringContaining("next access token"),
    );
  });

  it("tells the two admin roles apart in the mapping dialog", () => {
    renderRoles();

    const [instance] = screen
      .getAllByRole("button", { name: "Edit permissions admin" })
      .slice(-1);
    fireEvent.click(instance);

    expect(
      screen.getByRole("heading", {
        name: "Permissions for instance role admin",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(/An organization role named admin is a different role/),
    ).toBeVisible();
  });

  it("names unknown permissions when a mapping is refused", async () => {
    mocks.setRolePermissions.mockImplementation((_request, options) =>
      options.onError(
        new ApiError("Unknown permissions", 400, undefined, {
          permissions: ["reports:read"],
        }),
      ),
    );
    renderRoles();

    fireEvent.click(
      screen.getByRole("button", { name: "Edit permissions Legacy Role" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "reports:read" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(/Unknown permissions: reports:read/),
    ).toBeVisible();
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("creates an organization role with permissions", async () => {
    mocks.createRole.mockImplementation((_request, options) =>
      options.onSuccess({ role: roles[2] }),
    );
    renderRoles();

    fireEvent.click(
      screen.getByRole("button", { name: "New organization role" }),
    );
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "billing" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Pays invoices" },
    });
    fireEvent.click(screen.getByRole("button", { name: "invoices:read" }));
    fireEvent.click(screen.getByRole("button", { name: "Create role" }));

    await waitFor(() =>
      expect(mocks.createRole).toHaveBeenCalledWith(
        {
          name: "billing",
          description: "Pays invoices",
          permissions: ["invoices:read"],
        },
        expect.anything(),
      ),
    );
  });

  it("edits an organization role's description", async () => {
    mocks.updateRole.mockImplementation((_request, options) =>
      options.onSuccess({ role: roles[2] }),
    );
    renderRoles();

    fireEvent.click(screen.getByRole("button", { name: "Edit Legacy Role" }));
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Older role" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mocks.updateRole).toHaveBeenCalledWith(
        { name: "Legacy Role", description: "Older role" },
        expect.anything(),
      ),
    );
  });

  it("counts holders when deleting an organization role is refused", async () => {
    mocks.deleteRole.mockImplementation((_name, options) =>
      options.onError(
        new ApiError("Organization role is still held", 409, undefined, {
          holders: 3,
        }),
      ),
    );
    renderRoles();

    fireEvent.click(screen.getByRole("button", { name: "Delete Legacy Role" }));

    expect(await screen.findByText(/3 memberships hold it/)).toBeVisible();
  });

  it("offers no delete on a built-in role", () => {
    renderRoles();

    expect(screen.queryByRole("button", { name: "Delete admin" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Delete Legacy Role" }),
    ).toBeVisible();
  });

  it("hides every write from a read-only admin", () => {
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: false,
    });
    renderRoles();

    expect(screen.getByText("Read-only access")).toBeVisible();
    expect(screen.getByRole("table", { name: "Permissions" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /^New / })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Delete / })).toBeNull();
  });
});
