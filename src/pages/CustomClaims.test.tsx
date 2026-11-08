/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api";
import CustomClaims from "./CustomClaims";

const mocks = vi.hoisted(() => ({
  useCustomClaims: vi.fn(),
  setClaims: vi.fn(),
  deleteClaims: vi.fn(),
  useRoleDefinitions: vi.fn(),
  useOidcApplications: vi.fn(),
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

vi.mock("../hooks/useCustomClaims", () => ({
  useCustomClaims: mocks.useCustomClaims,
  useSetCustomClaims: mutation(mocks.setClaims),
  useDeleteCustomClaims: mutation(mocks.deleteClaims),
}));

vi.mock("../hooks/useRolePermissions", () => ({
  useRoleDefinitions: mocks.useRoleDefinitions,
}));

vi.mock("../hooks/useOidcApplications", () => ({
  useOidcApplications: mocks.useOidcApplications,
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

const adminClaims = {
  sourceKind: "instance_role",
  sourceName: "admin",
  claims: { tier: "gold" },
  updatedAt: "2026-11-01T00:00:00.000Z",
};

function setText(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("CustomClaims", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useCustomClaims.mockReturnValue({
      data: {
        sources: [adminClaims],
        reservedNames: ["email", "roles", "plan_reserved"],
        reservedPrefixes: ["seamless_", "org_"],
        budgetBytes: 1024,
      },
      isLoading: false,
    });
    mocks.useRoleDefinitions.mockReturnValue({
      data: {
        roles: [
          { name: "admin", kind: "instance", permissions: [] },
          { name: "billing", kind: "organization", permissions: [] },
        ],
      },
    });
    mocks.useOidcApplications.mockReturnValue({
      data: { applications: [{ id: "docs-portal" }] },
    });
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: true,
    });
    mocks.ensureStepUp.mockResolvedValue(true);
    mocks.confirm.mockResolvedValue(true);
  });

  it("lists each set with its size against the budget", () => {
    render(<CustomClaims />);

    const table = screen.getByRole("table", { name: "Custom claim sets" });
    expect(table).toHaveTextContent("Instance role");
    expect(table).toHaveTextContent("tier");
    expect(table).toHaveTextContent("15 of 1024 bytes");
  });

  it("shows the reserved names and the shared budget from the API", () => {
    render(<CustomClaims />);

    expect(screen.getByText("plan_reserved")).toBeInTheDocument();
    expect(screen.getByText("seamless_")).toBeInTheDocument();
    expect(screen.getByText("One 1024 byte budget per token")).toBeVisible();
    expect(screen.getByText(/permissions give way first/)).toBeVisible();
  });

  it("saves claims for a role after step-up", async () => {
    mocks.setClaims.mockImplementation((_request, options) =>
      options.onSuccess({ source: adminClaims }),
    );
    render(<CustomClaims />);

    fireEvent.click(screen.getByRole("button", { name: "Add claims" }));
    setText("Source kind", "organization_role");
    setText("Role", "billing");
    setText("Claims (JSON)", '{ "cost_center": "4410" }');
    expect(screen.getByText("22 of 1024 bytes.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Save claims" }));

    await waitFor(() =>
      expect(mocks.setClaims).toHaveBeenCalledWith(
        {
          sourceKind: "organization_role",
          sourceName: "billing",
          claims: { cost_center: "4410" },
        },
        expect.anything(),
      ),
    );
    expect(mocks.ensureStepUp).toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalled();
  });

  it("suggests the roles and clients that exist", () => {
    render(<CustomClaims />);

    fireEvent.click(screen.getByRole("button", { name: "Add claims" }));
    setText("Source kind", "oidc_client");

    expect(
      document.querySelector('datalist option[value="docs-portal"]'),
    ).not.toBeNull();
  });

  it("refuses a name the API reserves before step-up", async () => {
    render(<CustomClaims />);

    fireEvent.click(screen.getByRole("button", { name: "Edit admin" }));
    setText("Claims (JSON)", '{ "plan_reserved": 1 }');
    fireEvent.click(screen.getByRole("button", { name: "Save claims" }));

    expect(
      await screen.findByText(/Reserved, so they cannot be set: plan_reserved/),
    ).toBeVisible();
    expect(mocks.ensureStepUp).not.toHaveBeenCalled();
    expect(mocks.setClaims).not.toHaveBeenCalled();
  });

  it("refuses a set without a source name", async () => {
    render(<CustomClaims />);

    fireEvent.click(screen.getByRole("button", { name: "Add claims" }));
    fireEvent.click(screen.getByRole("button", { name: "Save claims" }));

    expect(
      await screen.findByText(
        "Name the role or client these claims belong to.",
      ),
    ).toBeVisible();
    expect(mocks.setClaims).not.toHaveBeenCalled();
  });

  it("shows why the API refused a write", async () => {
    mocks.setClaims.mockImplementation((_request, options) =>
      options.onError(new ApiError("Source not found", 404)),
    );
    render(<CustomClaims />);

    fireEvent.click(screen.getByRole("button", { name: "Edit admin" }));
    fireEvent.click(screen.getByRole("button", { name: "Save claims" }));

    expect(await screen.findByText("Source not found")).toBeVisible();
  });

  it("does not write when step-up is refused", async () => {
    mocks.ensureStepUp.mockResolvedValue(false);
    render(<CustomClaims />);

    fireEvent.click(screen.getByRole("button", { name: "Edit admin" }));
    fireEvent.click(screen.getByRole("button", { name: "Save claims" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete admin" }));

    await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalledTimes(2));
    expect(mocks.setClaims).not.toHaveBeenCalled();
    expect(mocks.deleteClaims).not.toHaveBeenCalled();
  });

  it("deletes a set behind a confirmation, and shows a refusal", async () => {
    mocks.deleteClaims.mockImplementation((_source, options) =>
      options.onError(new ApiError("Custom claims not found", 404)),
    );
    render(<CustomClaims />);

    fireEvent.click(screen.getByRole("button", { name: "Delete admin" }));

    await waitFor(() =>
      expect(mocks.deleteClaims).toHaveBeenCalledWith(
        { sourceKind: "instance_role", sourceName: "admin" },
        expect.anything(),
      ),
    );
    expect(await screen.findByText("Custom claims not found")).toBeVisible();
  });

  it("hides write controls from a read-only admin", () => {
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: false,
    });
    render(<CustomClaims />);

    expect(screen.getByText("Read-only access")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Add claims" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit admin" })).toBeNull();
  });

  it("says the API needs upgrading on a 404", () => {
    mocks.useCustomClaims.mockReturnValue({
      isError: true,
      error: new ApiError("Not found", 404),
    });
    render(<CustomClaims />);

    expect(screen.getByText("Needs Seamless Auth API v0.23")).toBeVisible();
  });

  it("shows a skeleton and a load failure", () => {
    mocks.useCustomClaims.mockReturnValue({ isLoading: true });
    const { unmount } = render(<CustomClaims />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    unmount();

    const refetch = vi.fn();
    mocks.useCustomClaims.mockReturnValue({
      isError: true,
      error: new ApiError("The API had a problem", 500),
      refetch,
    });
    render(<CustomClaims />);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });
});
