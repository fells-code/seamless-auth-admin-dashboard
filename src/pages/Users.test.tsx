/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Users from "./Users";

const mocks = vi.hoisted(() => ({
  useUsers: vi.fn(),
  useDeleteUser: vi.fn(),
  useAdminPermissions: vi.fn(),
  useStepUpGuard: vi.fn(),
  useToast: vi.fn(),
  useConfirm: vi.fn(),
  navigate: vi.fn(),
  deleteMutate: vi.fn(),
  ensureStepUp: vi.fn(),
  confirm: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("../hooks/useUsers", () => ({
  useUsers: mocks.useUsers,
}));

vi.mock("../hooks/useDeleteUser", () => ({
  useDeleteUser: mocks.useDeleteUser,
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

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => mocks.navigate,
}));

const users = [
  {
    id: "user_1",
    email: "ada@example.com",
    roles: ["admin:read"],
    verified: true,
    lastLogin: new Date().toISOString(),
  },
  {
    id: "user_2",
    email: "grace@example.com",
    roles: ["member"],
    verified: false,
    lastLogin: null,
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <Users />
    </MemoryRouter>,
  );
}

describe("Users", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset?.());

    mocks.useUsers.mockReturnValue({
      data: { users, total: 2 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
    });
    mocks.useDeleteUser.mockReturnValue({ mutate: mocks.deleteMutate });
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: true,
    });
    mocks.ensureStepUp.mockResolvedValue(true);
    mocks.useStepUpGuard.mockReturnValue(mocks.ensureStepUp);
    mocks.confirm.mockResolvedValue(true);
    mocks.useConfirm.mockReturnValue(mocks.confirm);
    mocks.useToast.mockReturnValue({
      success: mocks.toastSuccess,
      error: mocks.toastError,
    });
  });

  it("lists the users returned by the query", () => {
    renderPage();

    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("grace@example.com")).toBeInTheDocument();
  });

  it("surfaces a load failure with a retry", () => {
    mocks.useUsers.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("The request was invalid."),
      refetch: mocks.refetch,
    });

    renderPage();

    expect(screen.getByText("Could not load users")).toBeInTheDocument();
    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();
  });

  it("hides destructive controls and warns when access is read-only", () => {
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: false,
    });

    renderPage();

    expect(screen.getByText("Read-only access")).toBeInTheDocument();
    expect(screen.queryByTitle("Delete")).not.toBeInTheDocument();
  });

  it("requires confirmation and step-up before deleting a user", async () => {
    renderPage();

    fireEvent.click(screen.getAllByTitle("Delete")[0]);

    await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
    expect(mocks.deleteMutate).toHaveBeenCalledWith(
      "user_1",
      expect.any(Object),
    );
  });

  it("does not delete when the confirmation is dismissed", async () => {
    mocks.confirm.mockResolvedValue(false);

    renderPage();

    fireEvent.click(screen.getAllByTitle("Delete")[0]);

    await waitFor(() => expect(mocks.deleteMutate).not.toHaveBeenCalled());
    expect(mocks.ensureStepUp).not.toHaveBeenCalled();
  });

  it("does not delete when step-up verification fails", async () => {
    mocks.ensureStepUp.mockResolvedValue(false);

    renderPage();

    fireEvent.click(screen.getAllByTitle("Delete")[0]);

    await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
    expect(mocks.deleteMutate).not.toHaveBeenCalled();
  });

  it("reports the outcome of a delete through toasts", async () => {
    renderPage();

    fireEvent.click(screen.getAllByTitle("Delete")[0]);

    await waitFor(() => expect(mocks.deleteMutate).toHaveBeenCalled());

    const callbacks = mocks.deleteMutate.mock.calls[0][1] as {
      onSuccess: () => void;
      onError: (error: Error) => void;
    };

    callbacks.onSuccess();
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "User deleted",
      "ada@example.com was removed.",
    );

    callbacks.onError(new Error("Not allowed"));
    expect(mocks.toastError).toHaveBeenCalledWith(
      "User deletion failed",
      "Not allowed",
    );
  });
});
