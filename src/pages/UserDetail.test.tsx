/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UserDetail from "./UserDetail";

const mocks = vi.hoisted(() => ({
  useUserDetail: vi.fn(),
  useUserAnomalies: vi.fn(),
  useUserTimeseries: vi.fn(),
  useRevokeSession: vi.fn(),
  useRevokeAllUserSessions: vi.fn(),
  useDeleteUser: vi.fn(),
  useDeviceReplacementRecovery: vi.fn(),
  useAdminPermissions: vi.fn(),
  useStepUpGuard: vi.fn(),
  useToast: vi.fn(),
  deleteMutate: vi.fn(),
  revokeAllMutate: vi.fn(),
  revokeSessionMutate: vi.fn(),
  revokeSessionMutateAsync: vi.fn(),
  deviceReplacementMutate: vi.fn(),
  ensureStepUp: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  refetch: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("../hooks/useUserDetail", () => ({
  useUserDetail: mocks.useUserDetail,
}));
vi.mock("../hooks/useUserAnomalies", () => ({
  useUserAnomalies: mocks.useUserAnomalies,
}));
vi.mock("../hooks/useUserTimeseries", () => ({
  useUserTimeseries: mocks.useUserTimeseries,
}));
vi.mock("../hooks/useRevokeSession", () => ({
  useRevokeSession: mocks.useRevokeSession,
}));
vi.mock("../hooks/useRevokeAllUserSessions", () => ({
  useRevokeAllUserSessions: mocks.useRevokeAllUserSessions,
}));
vi.mock("../hooks/useDeleteUser", () => ({
  useDeleteUser: mocks.useDeleteUser,
}));
vi.mock("../hooks/useDeviceReplacementRecovery", () => ({
  useDeviceReplacementRecovery: mocks.useDeviceReplacementRecovery,
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

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => mocks.navigate,
  useParams: () => ({ id: "user_1" }),
}));

const detail = {
  user: {
    id: "user_1",
    email: "ada@example.com",
    roles: ["admin:read"],
    verified: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  sessions: [
    {
      id: "session_1",
      ipAddress: "10.0.0.1",
      userAgent: "Mozilla/5.0 Firefox/125.0",
      lastUsedAt: "2026-07-01T00:00:00.000Z",
      expiresAt: "2026-08-01T00:00:00.000Z",
    },
  ],
  credentials: [],
  events: [],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <UserDetail />
    </MemoryRouter>,
  );
}

/** Click one of the top-level destructive buttons. */
function clickAction(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

describe("UserDetail", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset?.());

    mocks.useUserDetail.mockReturnValue({
      data: detail,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
    });
    mocks.useUserAnomalies.mockReturnValue({
      data: { suspiciousEvents: [], relatedIps: [], relatedAgents: [] },
      isError: false,
      error: null,
    });
    mocks.useUserTimeseries.mockReturnValue({
      data: { timeseries: [] },
      isError: false,
      error: null,
    });
    mocks.useRevokeSession.mockReturnValue({
      mutate: mocks.revokeSessionMutate,
      mutateAsync: mocks.revokeSessionMutateAsync,
    });
    mocks.useRevokeAllUserSessions.mockReturnValue({
      mutate: mocks.revokeAllMutate,
    });
    mocks.useDeleteUser.mockReturnValue({ mutate: mocks.deleteMutate });
    mocks.useDeviceReplacementRecovery.mockReturnValue({
      mutate: mocks.deviceReplacementMutate,
      isPending: false,
    });
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: true,
    });
    mocks.ensureStepUp.mockResolvedValue(true);
    mocks.useStepUpGuard.mockReturnValue(mocks.ensureStepUp);
    mocks.useToast.mockReturnValue({
      success: mocks.toastSuccess,
      error: mocks.toastError,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the user being inspected", () => {
    renderPage();

    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("surfaces a load failure", () => {
    mocks.useUserDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("The requested resource was not found."),
      refetch: mocks.refetch,
    });

    renderPage();

    expect(screen.getByText("Could not load user detail")).toBeInTheDocument();
  });

  it("hides destructive controls when access is read-only", () => {
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: false,
    });

    renderPage();

    expect(
      screen.queryByRole("button", { name: "Delete User" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Revoke Sessions" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Device Replacement" }),
    ).not.toBeInTheDocument();
  });

  // Every destructive control on this page goes through the same confirm and
  // step-up gate, so the guard is exercised for each rather than just one.
  const destructiveActions = [
    { button: "Delete User", mutation: "deleteMutate" },
    { button: "Revoke Sessions", mutation: "revokeAllMutate" },
    { button: "Device Replacement", mutation: "deviceReplacementMutate" },
  ] as const;

  describe.each(destructiveActions)("$button", ({ button, mutation }) => {
    it("runs after confirmation and step-up", async () => {
      vi.stubGlobal(
        "confirm",
        vi.fn(() => true),
      );

      renderPage();
      clickAction(button);

      await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
      expect(mocks[mutation]).toHaveBeenCalled();
    });

    it("is abandoned when the confirmation is dismissed", async () => {
      vi.stubGlobal(
        "confirm",
        vi.fn(() => false),
      );

      renderPage();
      clickAction(button);

      await waitFor(() => expect(mocks[mutation]).not.toHaveBeenCalled());
      expect(mocks.ensureStepUp).not.toHaveBeenCalled();
    });

    it("is abandoned when step-up verification fails", async () => {
      vi.stubGlobal(
        "confirm",
        vi.fn(() => true),
      );
      mocks.ensureStepUp.mockResolvedValue(false);

      renderPage();
      clickAction(button);

      await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
      expect(mocks[mutation]).not.toHaveBeenCalled();
    });
  });

  it("reports device replacement results in the success toast", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );

    renderPage();
    clickAction("Device Replacement");

    await waitFor(() =>
      expect(mocks.deviceReplacementMutate).toHaveBeenCalled(),
    );

    const callbacks = mocks.deviceReplacementMutate.mock.calls[0][1] as {
      onSuccess: (result: {
        revokedSessions: number;
        removedCredentials: number;
        disabledTotpCredentials: number;
      }) => void;
    };

    callbacks.onSuccess({
      revokedSessions: 3,
      removedCredentials: 2,
      disabledTotpCredentials: 1,
    });

    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Device replacement prepared",
      "3 sessions revoked, 2 passkeys removed, 1 TOTP credentials disabled.",
    );
  });
});
