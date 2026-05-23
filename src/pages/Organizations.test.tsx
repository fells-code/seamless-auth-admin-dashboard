/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Organizations from "./Organizations";

const mocks = vi.hoisted(() => ({
  addMember: vi.fn(),
  createOrganization: vi.fn(),
  removeMember: vi.fn(),
  updateOrganization: vi.fn(),
  useAddOrganizationMember: vi.fn(),
  useCreateOrganization: vi.fn(),
  useOrganizationMembers: vi.fn(),
  useOrganizations: vi.fn(),
  useRemoveOrganizationMember: vi.fn(),
  useUpdateOrganization: vi.fn(),
}));

vi.mock("../hooks/useOrganizations", () => ({
  useAddOrganizationMember: mocks.useAddOrganizationMember,
  useCreateOrganization: mocks.useCreateOrganization,
  useOrganizationMembers: mocks.useOrganizationMembers,
  useOrganizations: mocks.useOrganizations,
  useRemoveOrganizationMember: mocks.useRemoveOrganizationMember,
  useUpdateOrganization: mocks.useUpdateOrganization,
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

describe("Organizations", () => {
  beforeEach(() => {
    mocks.addMember.mockReset();
    mocks.createOrganization.mockReset();
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
    mocks.useAddOrganizationMember.mockReturnValue({
      mutate: mocks.addMember,
      isPending: false,
    });
    mocks.useRemoveOrganizationMember.mockReturnValue({
      mutate: mocks.removeMember,
      isPending: false,
    });
  });

  it("renders organizations and members", () => {
    render(<Organizations />);

    expect(
      screen.getByRole("heading", { name: "Organizations" }),
    ).toBeVisible();
    expect(screen.getAllByText("Acme").length).toBeGreaterThan(0);
    expect(screen.getByText("owner@example.com")).toBeVisible();
  });

  it("creates organizations from the directory form", () => {
    render(<Organizations />);

    fireEvent.change(screen.getByPlaceholderText("Organization name"), {
      target: { value: "Beta" },
    });
    fireEvent.change(screen.getByPlaceholderText("Slug"), {
      target: { value: "beta" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(mocks.createOrganization).toHaveBeenCalledWith(
      { name: "Beta", slug: "beta" },
      expect.any(Object),
    );
  });

  it("adds organization members", () => {
    render(<Organizations />);

    fireEvent.change(screen.getByPlaceholderText("member@example.com"), {
      target: { value: "member@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Roles"), {
      target: { value: "admin, member" },
    });
    fireEvent.change(screen.getByPlaceholderText("Scopes"), {
      target: { value: "organization:read, members:write" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    expect(mocks.addMember).toHaveBeenCalledWith(
      {
        organizationId: "org-1",
        email: "member@example.com",
        roles: ["admin", "member"],
        scopes: ["organization:read", "members:write"],
      },
      expect.any(Object),
    );
  });
});
