/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "../lib/api";
import Organizations from "./Organizations";

const mocks = vi.hoisted(() => ({
  addMember: vi.fn(),
  createOrganization: vi.fn(),
  deleteOrganization: vi.fn(),
  removeMember: vi.fn(),
  updateOrganization: vi.fn(),
  useAddOrganizationMember: vi.fn(),
  useCreateOrganization: vi.fn(),
  useDeleteOrganization: vi.fn(),
  useOrganizationMembers: vi.fn(),
  useOrganizations: vi.fn(),
  useRemoveOrganizationMember: vi.fn(),
  useUpdateOrganization: vi.fn(),
  useUpdateOrganizationMember: vi.fn(),
  useRoles: vi.fn(),
  useRoleDefinitions: vi.fn(),
  useAdminPermissions: vi.fn(),
  useStepUpGuard: vi.fn(),
  useToast: vi.fn(),
  useConfirm: vi.fn(),
  ensureStepUp: vi.fn(),
  confirm: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  updateMemberMutate: vi.fn(),
}));

vi.mock("../hooks/useOrganizations", () => ({
  useAddOrganizationMember: mocks.useAddOrganizationMember,
  useCreateOrganization: mocks.useCreateOrganization,
  useDeleteOrganization: mocks.useDeleteOrganization,
  useOrganizationMembers: mocks.useOrganizationMembers,
  useOrganizations: mocks.useOrganizations,
  useRemoveOrganizationMember: mocks.useRemoveOrganizationMember,
  useUpdateOrganization: mocks.useUpdateOrganization,
  useUpdateOrganizationMember: mocks.useUpdateOrganizationMember,
}));

vi.mock("../hooks/useRoles", () => ({
  useRoles: mocks.useRoles,
}));

vi.mock("../hooks/useRolePermissions", () => ({
  useRoleDefinitions: mocks.useRoleDefinitions,
}));

vi.mock("../hooks/useAdminPermissions", () => ({
  useAdminPermissions: mocks.useAdminPermissions,
}));

vi.mock("../hooks/useStepUpGuard", () => ({
  useStepUpGuard: mocks.useStepUpGuard,
}));

vi.mock("../hooks/useToast", () => ({
  useToast: mocks.useToast,
}));

vi.mock("../hooks/useConfirm", () => ({
  useConfirm: mocks.useConfirm,
}));

const organization = {
  id: "org-1",
  name: "Acme",
  slug: "acme",
  createdByUserId: "user-1",
  metadata: null,
  createdAt: "2026-05-18T12:00:00.000Z",
  updatedAt: "2026-05-18T12:00:00.000Z",
  memberCount: 1,
};

function renderOrganizations() {
  return render(
    <MemoryRouter>
      <Organizations />
    </MemoryRouter>,
  );
}

function orgRole(name: string) {
  return {
    name,
    kind: "organization",
    description: null,
    builtIn: true,
    permissions: [],
  };
}

describe("Organizations", () => {
  beforeEach(() => {
    mocks.addMember.mockReset();
    mocks.createOrganization.mockReset();
    mocks.deleteOrganization.mockReset();
    mocks.removeMember.mockReset();
    mocks.updateOrganization.mockReset();

    mocks.useOrganizations.mockReturnValue({
      data: { organizations: [organization], total: 1 },
      isLoading: false,
    });
    mocks.useOrganizationMembers.mockReturnValue({
      data: {
        members: [
          {
            id: "membership-1",
            organizationId: "org-1",
            userId: "user-1",
            roles: ["owner"],
            scopes: ["organization:read"],
            createdAt: "2026-05-18T12:00:00.000Z",
            updatedAt: "2026-05-18T12:00:00.000Z",
            user: {
              id: "user-1",
              email: "owner@example.com",
              roles: ["admin"],
            },
          },
        ],
      },
      isLoading: false,
    });
    mocks.useCreateOrganization.mockReturnValue({
      mutate: mocks.createOrganization,
      isPending: false,
    });
    mocks.useUpdateOrganization.mockReturnValue({
      mutate: mocks.updateOrganization,
      isPending: false,
    });
    mocks.useUpdateOrganizationMember.mockReturnValue({
      mutate: mocks.updateMemberMutate,
      isPending: false,
    });
    mocks.useRoles.mockReturnValue({
      data: { roles: ["user", "reports"] },
    });
    mocks.useRoleDefinitions.mockReturnValue({
      isSuccess: true,
      data: {
        roles: [
          {
            name: "reports",
            kind: "instance",
            description: null,
            builtIn: false,
            permissions: [],
          },
          orgRole("owner"),
          orgRole("admin"),
          orgRole("member"),
        ],
      },
    });
    mocks.useAddOrganizationMember.mockReturnValue({
      mutate: mocks.addMember,
      isPending: false,
    });
    mocks.useRemoveOrganizationMember.mockReturnValue({
      mutate: mocks.removeMember,
      isPending: false,
    });
    mocks.useDeleteOrganization.mockReturnValue({
      mutate: mocks.deleteOrganization,
      isPending: false,
    });
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: true,
    });
    mocks.ensureStepUp.mockReset();
    mocks.ensureStepUp.mockResolvedValue(true);
    mocks.useStepUpGuard.mockReturnValue(mocks.ensureStepUp);
    mocks.confirm.mockReset();
    mocks.confirm.mockResolvedValue(true);
    mocks.useConfirm.mockReturnValue(mocks.confirm);
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.useToast.mockReturnValue({
      success: mocks.toastSuccess,
      error: mocks.toastError,
    });
  });

  it("renders organizations and members", () => {
    renderOrganizations();

    expect(
      screen.getByRole("heading", { name: "Organizations" }),
    ).toBeVisible();
    expect(screen.getAllByText("Acme").length).toBeGreaterThan(0);
    expect(screen.getByText("owner@example.com")).toBeVisible();
  });

  it("creates organizations from the directory form after step-up", async () => {
    renderOrganizations();

    fireEvent.change(screen.getByPlaceholderText("Organization name"), {
      target: { value: "Beta" },
    });
    fireEvent.change(screen.getByPlaceholderText("Slug"), {
      target: { value: "beta" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() =>
      expect(mocks.createOrganization).toHaveBeenCalledWith(
        { name: "Beta", slug: "beta" },
        expect.any(Object),
      ),
    );
    expect(mocks.ensureStepUp).toHaveBeenCalled();
  });

  it("does not create an organization when step-up fails", async () => {
    mocks.ensureStepUp.mockResolvedValue(false);
    renderOrganizations();

    fireEvent.change(screen.getByPlaceholderText("Organization name"), {
      target: { value: "Beta" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
    expect(mocks.createOrganization).not.toHaveBeenCalled();
  });

  it("steps up before saving organization details", async () => {
    renderOrganizations();

    fireEvent.change(screen.getByDisplayValue(organization.name), {
      target: { value: "Acme Renamed" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(mocks.updateOrganization).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Acme Renamed" }),
        expect.any(Object),
      ),
    );
    expect(mocks.ensureStepUp).toHaveBeenCalled();
  });

  it("does not save organization details when step-up fails", async () => {
    mocks.ensureStepUp.mockResolvedValue(false);
    renderOrganizations();

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
    expect(mocks.updateOrganization).not.toHaveBeenCalled();
  });

  it("adds organization members after step-up", async () => {
    renderOrganizations();

    fireEvent.change(screen.getByPlaceholderText("member@example.com"), {
      target: { value: "member@example.com" },
    });
    // Roles now come from a constrained selector rather than free-form text,
    // so a typo cannot be submitted.
    const roleSelect = screen.getByLabelText("Member roles");
    fireEvent.change(roleSelect, { target: { value: "admin" } });
    fireEvent.change(screen.getByPlaceholderText("Scopes"), {
      target: { value: "organization:read, members:write" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() =>
      expect(mocks.addMember).toHaveBeenCalledWith(
        {
          organizationId: "org-1",
          email: "member@example.com",
          roles: ["admin"],
          scopes: ["organization:read", "members:write"],
        },
        expect.any(Object),
      ),
    );
    expect(mocks.useStepUpGuard()).toHaveBeenCalled();
  });

  it("refuses to save an organization with an empty name", () => {
    renderOrganizations();

    const nameField = screen.getByDisplayValue(organization.name);
    fireEvent.change(nameField, { target: { value: "   " } });

    // The create form already guarded this; the edit form wrote it through and
    // left the organization unidentifiable in every list.
    expect(screen.getByText("A name is required.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("asks the server for the first page on mount", () => {
    renderOrganizations();

    expect(mocks.useOrganizations).toHaveBeenCalledWith({
      limit: 50,
      offset: 0,
      search: "",
    });
  });

  // The filter used to narrow the rows already loaded, which could not reach an
  // organization the endpoint had not returned. It is a query parameter now.
  it("sends the search term to the server once typing settles", async () => {
    renderOrganizations();

    fireEvent.change(screen.getByPlaceholderText("Search name or slug"), {
      target: { value: "beta" },
    });

    await waitFor(() =>
      expect(mocks.useOrganizations).toHaveBeenLastCalledWith({
        limit: 50,
        offset: 0,
        search: "beta",
      }),
    );
  });

  it("pages through the result set on the server", async () => {
    mocks.useOrganizations.mockReturnValue({
      data: { organizations: [organization], total: 140 },
      isLoading: false,
    });

    renderOrganizations();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() =>
      expect(mocks.useOrganizations).toHaveBeenLastCalledWith({
        limit: 50,
        offset: 50,
        search: "",
      }),
    );
  });

  // A new term describes a different result set, so page three of the old one
  // is meaningless and would strand the caller on an empty screen.
  it("returns to the first page when the search term changes", async () => {
    mocks.useOrganizations.mockReturnValue({
      data: { organizations: [organization], total: 140 },
      isLoading: false,
    });

    renderOrganizations();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() =>
      expect(mocks.useOrganizations).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 50 }),
      ),
    );

    fireEvent.change(screen.getByPlaceholderText("Search name or slug"), {
      target: { value: "beta" },
    });

    await waitFor(() =>
      expect(mocks.useOrganizations).toHaveBeenLastCalledWith({
        limit: 50,
        offset: 0,
        search: "beta",
      }),
    );
  });

  it("requires confirmation and step-up before deleting an organization", async () => {
    renderOrganizations();

    fireEvent.click(screen.getByRole("button", { name: "Remove Acme" }));

    await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
    expect(mocks.deleteOrganization).toHaveBeenCalledWith(
      "org-1",
      expect.any(Object),
    );
  });

  // The count comes from the row, so an operator is told what the cascade costs
  // before they agree to it rather than afterwards.
  it("names the membership count in the confirmation", async () => {
    renderOrganizations();

    fireEvent.click(screen.getByRole("button", { name: "Remove Acme" }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.confirm.mock.calls[0][0].description).toContain(
      "1 membership",
    );
    expect(mocks.confirm.mock.calls[0][0].description).toContain(
      "member accounts themselves are not deleted",
    );
  });

  it("does not delete an organization when the confirmation is dismissed", async () => {
    mocks.confirm.mockResolvedValue(false);

    renderOrganizations();

    fireEvent.click(screen.getByRole("button", { name: "Remove Acme" }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.ensureStepUp).not.toHaveBeenCalled();
    expect(mocks.deleteOrganization).not.toHaveBeenCalled();
  });

  it("does not delete an organization when step-up fails", async () => {
    mocks.ensureStepUp.mockResolvedValue(false);

    renderOrganizations();

    fireEvent.click(screen.getByRole("button", { name: "Remove Acme" }));

    await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
    expect(mocks.deleteOrganization).not.toHaveBeenCalled();
  });

  it("reports the outcome of an organization delete through toasts", async () => {
    renderOrganizations();

    fireEvent.click(screen.getByRole("button", { name: "Remove Acme" }));

    await waitFor(() => expect(mocks.deleteOrganization).toHaveBeenCalled());

    const callbacks = mocks.deleteOrganization.mock.calls[0][1] as {
      onSuccess: () => void;
      onError: (error: Error) => void;
    };

    callbacks.onSuccess();
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Organization removed",
      "Acme was deleted.",
    );

    callbacks.onError(new Error("nope"));
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Organization removal failed",
      expect.any(String),
    );
  });

  it("offers no Remove action to a read-only admin", () => {
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: false,
    });

    renderOrganizations();

    expect(
      screen.queryByRole("button", { name: "Remove Acme" }),
    ).not.toBeInTheDocument();
  });
  describe("member role assignment", () => {
    const openEditor = () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Edit roles owner@example.com" }),
      );

    function withMemberRoles(roles: string[]) {
      mocks.useOrganizationMembers.mockReturnValue({
        data: {
          members: [
            {
              id: "membership-1",
              organizationId: "org-1",
              userId: "user-1",
              roles,
              scopes: [],
              createdAt: "2026-05-18T12:00:00.000Z",
              updatedAt: "2026-05-18T12:00:00.000Z",
              user: {
                id: "user-1",
                email: "owner@example.com",
                roles: [],
              },
            },
          ],
        },
        isLoading: false,
      });
    }

    it("offers the organization catalogue, not the instance roles", () => {
      renderOrganizations();

      const picker = screen.getByLabelText("Member roles");
      expect(
        Array.from(picker.querySelectorAll("option")).map((o) => o.value),
      ).toEqual(["owner", "admin", "member"]);
      expect(mocks.useRoles).toHaveBeenCalledWith({ enabled: false });
    });

    it("falls back to the instance roles on an API without the catalogue", () => {
      mocks.useRoleDefinitions.mockReturnValue({
        isError: true,
        error: new ApiError("Not found", 404),
      });
      renderOrganizations();

      const picker = screen.getByLabelText("Member roles");
      expect(
        Array.from(picker.querySelectorAll("option")).map((o) => o.value),
      ).toEqual(["user", "reports"]);
      expect(mocks.useRoles).toHaveBeenCalledWith({ enabled: true });
      expect(screen.queryByText(/organization role catalogue/)).toBeNull();
    });

    it("reports a catalogue that failed to load", () => {
      mocks.useRoleDefinitions.mockReturnValue({
        isError: true,
        error: new ApiError("Boom", 500),
        refetch: vi.fn(),
      });
      renderOrganizations();

      expect(
        screen.getByText("Could not load the organization role catalogue"),
      ).toBeVisible();
    });

    it("keeps a legacy role visible and retained on save", async () => {
      withMemberRoles(["member", "Legacy Role"]);
      renderOrganizations();
      openEditor();

      expect(
        screen.getByRole("button", { name: "Legacy Role" }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        screen.getByText(/Not in the catalogue: Legacy Role/),
      ).toBeVisible();

      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "Save",
        }),
      );

      await waitFor(() =>
        expect(mocks.updateMemberMutate).toHaveBeenCalledWith(
          expect.objectContaining({ roles: ["member", "Legacy Role"] }),
          expect.anything(),
        ),
      );
    });

    it("says when a role change applies and that the kinds are separate", () => {
      renderOrganizations();
      openEditor();

      expect(
        screen.getByText(/separate from instance roles of the same name/),
      ).toBeVisible();
      expect(screen.getByText(/next access token is issued/)).toBeVisible();
    });

    it("names the roles in a 403 refusal and keeps the dialog open", async () => {
      mocks.updateMemberMutate.mockImplementation((_input, options) =>
        options.onError(
          new ApiError("Forbidden", 403, "Not allowed to change these roles", {
            roles: ["owner"],
          }),
        ),
      );
      renderOrganizations();
      openEditor();
      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "Save",
        }),
      );

      expect(
        await screen.findByText(/You may not change these roles: owner/),
      ).toBeVisible();
      expect(screen.getByRole("dialog")).toBeVisible();
    });

    it("steps up before saving and stops if it is refused", async () => {
      mocks.ensureStepUp.mockResolvedValue(false);
      renderOrganizations();
      openEditor();
      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "Save",
        }),
      );

      await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
      expect(mocks.updateMemberMutate).not.toHaveBeenCalled();
    });

    it("names an unknown role when adding a member is refused", async () => {
      mocks.addMember.mockImplementation((_input, options) =>
        options.onError(
          new ApiError("Unknown organization roles", 400, undefined, {
            roles: ["ghost"],
          }),
        ),
      );
      renderOrganizations();

      fireEvent.change(screen.getByLabelText("Member email"), {
        target: { value: "new@example.com" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Add" }));

      await waitFor(() =>
        expect(mocks.toastError).toHaveBeenCalledWith(
          "Member add failed",
          expect.stringContaining("Unknown organization roles: ghost"),
        ),
      );
    });
  });
});
