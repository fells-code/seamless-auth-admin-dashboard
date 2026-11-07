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
import type { OidcApplication } from "@seamless-auth/types";
import Applications from "./Applications";
import { ApiError } from "../lib/api";

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
  useOidcApplicationLinks: vi.fn(),
  addLink: vi.fn(),
  removeLink: vi.fn(),
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
  useOidcApplicationLinks: mocks.useOidcApplicationLinks,
  useAddOidcApplicationLink: mutation(mocks.addLink),
  useRemoveOidcApplicationLink: mutation(mocks.removeLink),
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
  sessionExchangeEnabled: false,
  noticesEnabled: false,
  pkceRequired: true,
  nonceRequired: true,
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

const backend = {
  ...legacy,
  id: "client_backend",
  name: "Backend",
  firstParty: true,
  tokenEndpointAuthMethod: "private_key_jwt" as const,
  hasSecret: false,
  noticeActionOrigins: ["https://app.example.com"],
  links: ["client_desk"],
  linkedFrom: [],
};

const desk = {
  ...legacy,
  id: "client_desk",
  name: "Desk",
  clientType: "public" as const,
  applicationType: "native" as const,
  firstParty: true,
  tokenEndpointAuthMethod: "none" as const,
  redirectUris: ["http://127.0.0.1/callback"],
  hasSecret: false,
  sessionExchangeEnabled: true,
  noticeActionOrigins: [],
  links: [],
  linkedFrom: ["client_backend"],
};

const mobile = {
  ...desk,
  id: "client_mobile",
  name: "Mobile",
  sessionExchangeEnabled: false,
  linkedFrom: [],
};

const link = {
  clientId: "client_backend",
  linkedClientId: "client_desk",
  createdBy: null,
  createdAt: "2026-10-01T00:00:00.000Z",
};

function withApplications(...applications: OidcApplication[]) {
  mocks.useOidcApplications.mockReturnValue({
    data: { applications },
    isLoading: false,
  });
}

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
    mocks.useOidcApplicationLinks.mockReturnValue({
      data: { links: [], linkedFrom: [] },
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

  it("shows the PKCE and nonce settings and warns when both are off", () => {
    const { unmount } = render(<Applications />);
    expect(screen.getAllByText("Required")).toHaveLength(2);
    expect(screen.queryByText("No PKCE or nonce")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    unmount();

    mocks.useOidcApplications.mockReturnValue({
      data: {
        applications: [
          { ...legacy, pkceRequired: false, nonceRequired: false },
        ],
      },
      isLoading: false,
    });
    render(<Applications />);
    expect(screen.getAllByText("Not required")).toHaveLength(2);
    expect(screen.getByText("No PKCE or nonce")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "relies only on state and client authentication",
    );
  });

  it("offers the nonce only once PKCE is off, and restores it with PKCE", async () => {
    mocks.update.mockImplementation((_request, options) =>
      options.onSuccess({ application: legacy }),
    );
    render(<Applications />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Legacy" }));
    expect(screen.queryByLabelText("Require a nonce")).toBeNull();

    fireEvent.click(screen.getByLabelText("Require PKCE"));
    fireEvent.click(screen.getByLabelText("Require a nonce"));
    expect(
      within(screen.getByRole("dialog")).getByRole("alert"),
    ).toHaveTextContent("relies only on state and client authentication");

    fireEvent.click(screen.getByLabelText("Require PKCE"));
    expect(screen.queryByLabelText("Require a nonce")).toBeNull();
    fireEvent.click(screen.getByLabelText("Require PKCE"));
    expect(screen.getByLabelText("Require a nonce")).toBeChecked();

    fireEvent.click(screen.getByLabelText("Require a nonce"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    expect(mocks.ensureStepUp).toHaveBeenCalled();
    expect(mocks.update.mock.calls[0][0]).toMatchObject({
      id: "client_legacy",
      pkceRequired: false,
      nonceRequired: false,
    });
  });

  it("offers no PKCE opt-out to a public client", () => {
    render(<Applications />);
    fireEvent.click(screen.getByRole("button", { name: "New application" }));
    fireEvent.change(screen.getByLabelText("Client type"), {
      target: { value: "public" },
    });
    expect(screen.queryByLabelText("Require PKCE")).toBeNull();
    expect(screen.getByText("Public clients always use PKCE.")).toBeVisible();
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

  it("offers session exchange only to a first-party public native client", () => {
    render(<Applications />);
    fireEvent.click(screen.getByRole("button", { name: "New application" }));

    const exchange = screen.getByLabelText(
      "Session exchange for native admin tools",
    );
    expect(exchange).toBeDisabled();
    expect(
      screen.getByText(/Only a first-party public client with a loopback/),
    ).toBeVisible();

    fireEvent.change(screen.getByLabelText("Client type"), {
      target: { value: "public" },
    });
    fireEvent.click(screen.getByLabelText("First-party (skips consent)"));
    fireEvent.change(screen.getByLabelText("Redirect URIs (one per line)"), {
      target: { value: "http://127.0.0.1/callback" },
    });
    expect(exchange).toBeEnabled();

    fireEvent.click(exchange);
    fireEvent.click(screen.getByLabelText("First-party (skips consent)"));
    expect(exchange).not.toBeChecked();
    expect(exchange).toBeDisabled();
  });

  it("creates a native admin tool with session exchange on", async () => {
    render(<Applications />);
    fireEvent.click(screen.getByRole("button", { name: "New application" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Admin CLI" },
    });
    fireEvent.change(screen.getByLabelText("Client type"), {
      target: { value: "public" },
    });
    fireEvent.click(screen.getByLabelText("First-party (skips consent)"));
    fireEvent.change(screen.getByLabelText("Redirect URIs (one per line)"), {
      target: { value: "http://127.0.0.1/callback" },
    });
    fireEvent.click(
      screen.getByLabelText("Session exchange for native admin tools"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Create application" }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalled());
    expect(mocks.ensureStepUp).toHaveBeenCalled();
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      name: "Admin CLI",
      firstParty: true,
      sessionExchangeEnabled: true,
    });
  });

  it("confirms before turning session exchange off, then asks for step-up", async () => {
    withApplications(desk);
    mocks.confirm.mockResolvedValueOnce(false);
    render(<Applications />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Desk" }));
    fireEvent.click(
      screen.getByLabelText("Session exchange for native admin tools"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mocks.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Turn off session exchange" }),
      ),
    );
    expect(mocks.ensureStepUp).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    expect(mocks.update.mock.calls[0][0]).toMatchObject({
      id: "client_desk",
      sessionExchangeEnabled: false,
      noticeActionOrigins: [],
    });
  });

  it("does not send the v0.23 settings to an API that did not return them", async () => {
    const older: Partial<OidcApplication> = { ...legacy };
    delete older.sessionExchangeEnabled;
    withApplications(older as OidcApplication);
    render(<Applications />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Legacy" }));
    expect(
      screen.queryByLabelText("Session exchange for native admin tools"),
    ).toBeNull();
    expect(
      screen.getByText(/notice action origins need Seamless Auth API v0.23/),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty(
      "sessionExchangeEnabled",
    );
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty(
      "noticeActionOrigins",
    );
  });

  it("refuses a loopback notice action origin before step-up", () => {
    withApplications(backend);
    render(<Applications />);

    expect(screen.getByText("https://app.example.com")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Edit Backend" }));
    fireEvent.change(
      screen.getByLabelText("Notice action origins (one per line)"),
      { target: { value: "https://127.0.0.1" } },
    );
    expect(
      within(screen.getByRole("dialog")).getByRole("alert"),
    ).toHaveTextContent("cannot be loopback");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("lists, adds and removes the links of a confidential application", async () => {
    withApplications(backend, desk, mobile);
    mocks.useOidcApplicationLinks.mockReturnValue({
      data: { links: [link], linkedFrom: [] },
      isLoading: false,
    });
    mocks.addLink.mockImplementation((_target, options) =>
      options.onSuccess({ link }),
    );
    mocks.removeLink.mockImplementation((_target, options) =>
      options.onSuccess({ message: "Link removed" }),
    );
    render(<Applications />);

    const actsFor = screen.getByRole("list", { name: "Acts for" });
    expect(within(actsFor).getByText("Desk")).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Application to act for" }),
    ).toHaveDisplayValue("Mobile (client_mobile)");

    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    await waitFor(() =>
      expect(mocks.addLink).toHaveBeenCalledWith(
        { clientId: "client_backend", linkedClientId: "client_mobile" },
        expect.any(Object),
      ),
    );
    expect(mocks.ensureStepUp).toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Remove link with Desk" }),
    );
    await waitFor(() =>
      expect(mocks.removeLink).toHaveBeenCalledWith(
        { clientId: "client_backend", linkedClientId: "client_desk" },
        expect.any(Object),
      ),
    );
    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Remove link" }),
    );
  });

  it("shows the API's reason when it refuses a link", async () => {
    withApplications(backend, mobile);
    mocks.addLink.mockImplementation((_target, options) =>
      options.onError(
        new Error(
          "Links stay within first-party or within third-party applications",
        ),
      ),
    );
    render(<Applications />);

    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Link refused",
        "Links stay within first-party or within third-party applications",
      ),
    );
  });

  it("shows who acts for a public application", () => {
    withApplications(desk, backend);
    mocks.useOidcApplicationLinks.mockReturnValue({
      data: { links: [], linkedFrom: [link] },
      isLoading: false,
    });
    render(<Applications />);

    const actedFor = screen.getByRole("list", { name: "Acted for by" });
    expect(within(actedFor).getByText("Backend")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Add link" })).toBeNull();
  });

  it("says links need v0.23 when the API answers 404", () => {
    mocks.useOidcApplicationLinks.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new ApiError("Not found", 404),
      refetch: vi.fn(),
    });
    render(<Applications />);

    expect(screen.getByText("Needs Seamless Auth API v0.23")).toBeVisible();
  });

  it("shows links without controls to a read-only admin", () => {
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: false,
    });
    withApplications(backend, desk, mobile);
    mocks.useOidcApplicationLinks.mockReturnValue({
      data: { links: [link], linkedFrom: [] },
      isLoading: false,
    });
    render(<Applications />);

    expect(screen.getByRole("list", { name: "Acts for" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Add link" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Remove link with Desk" }),
    ).toBeNull();
  });
});
