/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Resources from "./Resources";

const mocks = vi.hoisted(() => ({
  useOidcResources: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
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

vi.mock("../hooks/useOidcResources", () => ({
  useOidcResources: mocks.useOidcResources,
  useCreateOidcResource: mutation(mocks.create),
  useUpdateOidcResource: mutation(mocks.update),
  useDeleteOidcResource: mutation(mocks.remove),
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

const orders = {
  id: "00000000-0000-4000-8000-000000000001",
  identifier: "https://orders.example.com",
  name: "Orders",
  scopes: ["orders:read"],
  accessTokenTtlSeconds: 900,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

describe("Resources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useOidcResources.mockReturnValue({
      data: { resources: [orders] },
      isLoading: false,
    });
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: true,
    });
    mocks.ensureStepUp.mockResolvedValue(true);
    mocks.confirm.mockResolvedValue(true);
  });

  it("lists resources", () => {
    render(<Resources />);

    expect(screen.getByText("https://orders.example.com")).toBeVisible();
    expect(screen.getByText("900s")).toBeVisible();
  });

  it("shows a loading skeleton and a load failure", () => {
    mocks.useOidcResources.mockReturnValue({ isLoading: true });
    const { unmount } = render(<Resources />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    unmount();

    mocks.useOidcResources.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error("boom"),
      refetch: vi.fn(),
    });
    render(<Resources />);
    expect(screen.getByText("Could not load resources")).toBeVisible();
  });

  it("creates a resource after step-up", async () => {
    mocks.create.mockImplementation((_request, options) =>
      options.onSuccess({ resource: orders }),
    );
    render(<Resources />);

    fireEvent.click(screen.getByRole("button", { name: "New resource" }));
    fireEvent.change(screen.getByLabelText("Identifier"), {
      target: { value: "urn:example:billing" },
    });
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Billing" },
    });
    fireEvent.change(screen.getByLabelText("Access token TTL (s)"), {
      target: { value: "300" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create resource" }));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        {
          identifier: "urn:example:billing",
          name: "Billing",
          scopes: [],
          accessTokenTtlSeconds: 300,
        },
        expect.any(Object),
      ),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Resource created",
      "Orders was added.",
    );
  });

  it("reports a failed edit and a failed delete", async () => {
    mocks.update.mockImplementation((_request, options) =>
      options.onError(new Error("nope")),
    );
    mocks.remove.mockImplementation((_id, options) =>
      options.onError(new Error("in use")),
    );
    render(<Resources />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Orders" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Resource update failed",
        "nope",
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Orders" }));
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Resource deletion failed",
        "in use",
      ),
    );
  });

  it("does not delete when the confirmation is dismissed", async () => {
    mocks.confirm.mockResolvedValue(false);
    render(<Resources />);

    fireEvent.click(screen.getByRole("button", { name: "Delete Orders" }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
