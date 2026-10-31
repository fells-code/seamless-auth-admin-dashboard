/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OidcApplication } from "@seamless-auth/types";
import Applications from "./Applications";

const mocks = vi.hoisted(() => ({
  useOidcApplications: vi.fn(),
  useOidcApplicationResources: vi.fn(),
  useOidcResources: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  rotate: vi.fn(),
  setKeys: vi.fn(),
  setResources: vi.fn(),
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

vi.mock("../hooks/useOidcApplications", () => ({
  useOidcApplications: mocks.useOidcApplications,
  useOidcApplicationResources: mocks.useOidcApplicationResources,
  useCreateOidcApplication: mutation(mocks.create),
  useUpdateOidcApplication: mutation(mocks.update),
  useDeleteOidcApplication: mutation(mocks.remove),
  useRotateOidcApplicationSecret: mutation(mocks.rotate),
  useSetOidcApplicationKeys: mutation(mocks.setKeys),
  useSetOidcApplicationResources: mutation(mocks.setResources),
}));

vi.mock("../hooks/useOidcResources", () => ({
  useOidcResources: mocks.useOidcResources,
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

const legacy: OidcApplication = {
  id: "client_legacy",
  name: "Legacy",
  clientType: "confidential",
  applicationType: "web",
  firstParty: false,
  tokenEndpointAuthMethod: "client_secret_basic",
  redirectUris: ["https://legacy.example.com/cb"],
  postLogoutRedirectUris: [],
  grantTypes: ["authorization_code"],
  deviceFlowEnabled: false,
  noticesEnabled: false,
  jwks: null,
  jwksUri: null,
  hasSecret: true,
  backchannelLogoutUri: null,
  accessTokenTtlSeconds: null,
  idTokenTtlSeconds: null,
  refreshTokenTtlSeconds: null,
  disabled: false,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

const resource = {
  id: "00000000-0000-4000-8000-000000000001",
  identifier: "https://orders.example.com",
  name: "Orders",
  scopes: ["orders:read"],
  accessTokenTtlSeconds: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

describe("Applications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useOidcApplications.mockReturnValue({
      data: { applications: [legacy] },
      isLoading: false,
    });
    mocks.useOidcResources.mockReturnValue({
      data: { resources: [resource] },
      isLoading: false,
    });
    mocks.useOidcApplicationResources.mockReturnValue({
      data: { resources: [] },
      isLoading: false,
    });
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: true,
    });
    mocks.ensureStepUp.mockResolvedValue(true);
    mocks.confirm.mockResolvedValue(true);
  });

  it("marks a shared-secret client as weaker", () => {
    render(<Applications />);

    expect(
      screen.getByRole("heading", { name: "Applications", level: 1 }),
    ).toBeVisible();
    expect(screen.getAllByText("Weaker").length).toBeGreaterThan(0);
  });

  it("shows a loading skeleton and a load failure", () => {
    mocks.useOidcApplications.mockReturnValue({ isLoading: true });
    const { unmount } = render(<Applications />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    unmount();

    mocks.useOidcApplications.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error("boom"),
      refetch: vi.fn(),
    });
    render(<Applications />);
    expect(screen.getByText("Could not load applications")).toBeVisible();
  });

  it("creates an application after step-up and shows its secret", async () => {
    mocks.create.mockImplementation((_request, options) =>
      options.onSuccess({ application: legacy, clientSecret: "shh" }),
    );
    render(<Applications />);

    fireEvent.click(screen.getByRole("button", { name: "New application" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Reports" },
    });
    fireEvent.change(screen.getByLabelText("Redirect URIs (one per line)"), {
      target: { value: "https://reports.example.com/cb" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create application" }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalled());
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ name: "Reports" });
    expect(await screen.findByDisplayValue("shh")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByDisplayValue("shh")).toBeNull();
  });

  it("does not write when step-up fails", async () => {
    mocks.ensureStepUp.mockResolvedValue(false);
    render(<Applications />);

    fireEvent.click(screen.getByRole("button", { name: "Delete Legacy" }));

    await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("reports a failed update", async () => {
    mocks.update.mockImplementation((_request, options) =>
      options.onError(new Error("conflict")),
    );
    render(<Applications />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Legacy" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Application update failed",
        "conflict",
      ),
    );
  });

  it("rotates the secret and deletes behind confirmations", async () => {
    mocks.rotate.mockImplementation((_id, options) =>
      options.onSuccess({ application: legacy, clientSecret: "new" }),
    );
    mocks.remove.mockImplementation((_id, options) => options.onSuccess());
    render(<Applications />);

    fireEvent.click(screen.getByRole("button", { name: "Rotate secret" }));
    expect(await screen.findByDisplayValue("new")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    fireEvent.click(screen.getByRole("button", { name: "Delete Legacy" }));
    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "Application deleted",
        "Legacy was deleted.",
      ),
    );
    expect(mocks.confirm).toHaveBeenCalledTimes(2);
  });

  it("saves the allowed resources", async () => {
    mocks.setResources.mockImplementation((_input, options) =>
      options.onSuccess(),
    );
    render(<Applications />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Allow Orders" }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Orders scope orders:read" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save resources" }));

    await waitFor(() =>
      expect(mocks.setResources).toHaveBeenCalledWith(
        {
          id: "client_legacy",
          resources: [{ resourceId: resource.id, scopes: ["orders:read"] }],
        },
        expect.any(Object),
      ),
    );
  });

  it("hides write controls from a read-only admin", () => {
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: false,
    });
    render(<Applications />);

    expect(
      screen.queryByRole("button", { name: "New application" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Rotate secret" })).toBeNull();
  });
});
