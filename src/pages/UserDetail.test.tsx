/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  useConfirm: vi.fn(),
  confirm: vi.fn(),
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
vi.mock("../hooks/useConfirm", () => ({
  useConfirm: mocks.useConfirm,
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

/** Opens the device replacement modal, fills the required proofing, and submits. */
async function submitDeviceReplacement(
  proofing: { method?: string; evidenceRef?: string; approver?: string } = {},
) {
  clickAction("Device Replacement");

  if (proofing.method) {
    fireEvent.change(screen.getByLabelText("How was identity confirmed?"), {
      target: { value: proofing.method },
    });
  }

  fireEvent.change(screen.getByLabelText("Evidence reference"), {
    target: { value: proofing.evidenceRef ?? "TICKET-1042" },
  });

  if (proofing.approver) {
    fireEvent.change(screen.getByLabelText("Approver"), {
      target: { value: proofing.approver },
    });
  }

  fireEvent.click(screen.getByRole("button", { name: "Prepare" }));
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
    mocks.confirm.mockResolvedValue(true);
    mocks.useConfirm.mockReturnValue(mocks.confirm);
    mocks.useToast.mockReturnValue({
      success: mocks.toastSuccess,
      error: mocks.toastError,
    });
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
  ] as const;

  describe.each(destructiveActions)("$button", ({ button, mutation }) => {
    it("runs after confirmation and step-up", async () => {
      renderPage();
      clickAction(button);

      await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
      expect(mocks[mutation]).toHaveBeenCalled();
    });

    it("is abandoned when the confirmation is dismissed", async () => {
      mocks.confirm.mockResolvedValue(false);

      renderPage();
      clickAction(button);

      await waitFor(() => expect(mocks[mutation]).not.toHaveBeenCalled());
      expect(mocks.ensureStepUp).not.toHaveBeenCalled();
    });

    it("is abandoned when step-up verification fails", async () => {
      mocks.ensureStepUp.mockResolvedValue(false);

      renderPage();
      clickAction(button);

      await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
      expect(mocks[mutation]).not.toHaveBeenCalled();
    });
  });

  describe("device replacement proofing", () => {
    it("does not submit until an evidence reference is given", () => {
      renderPage();
      clickAction("Device Replacement");

      expect(screen.getByRole("button", { name: "Prepare" })).toBeDisabled();
      expect(mocks.deviceReplacementMutate).not.toHaveBeenCalled();
    });

    it("requires an approver before a remote exception can be submitted", () => {
      renderPage();
      clickAction("Device Replacement");

      fireEvent.change(screen.getByLabelText("How was identity confirmed?"), {
        target: { value: "remote_exception" },
      });
      fireEvent.change(screen.getByLabelText("Evidence reference"), {
        target: { value: "TICKET-7" },
      });

      expect(screen.getByRole("button", { name: "Prepare" })).toBeDisabled();
    });

    it("sends the proofing record once it is complete", async () => {
      renderPage();
      await submitDeviceReplacement({
        method: "remote_exception",
        evidenceRef: "TICKET-7",
        approver: "j.reyes",
      });

      await waitFor(() =>
        expect(mocks.deviceReplacementMutate).toHaveBeenCalled(),
      );

      expect(mocks.deviceReplacementMutate.mock.calls[0][0]).toEqual({
        userId: "user_1",
        proofing: {
          method: "remote_exception",
          evidenceRef: "TICKET-7",
          approver: "j.reyes",
        },
      });
    });

    it("is abandoned when step-up verification fails", async () => {
      mocks.ensureStepUp.mockResolvedValue(false);

      renderPage();
      await submitDeviceReplacement();

      await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
      expect(mocks.deviceReplacementMutate).not.toHaveBeenCalled();
    });
  });

  it("reports device replacement results in the success toast", async () => {
    renderPage();
    await submitDeviceReplacement();

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

  it("disables the destructive controls while their request is in flight", () => {
    mocks.useRevokeAllUserSessions.mockReturnValue({
      mutate: mocks.revokeAllMutate,
      isPending: true,
    });
    mocks.useDeleteUser.mockReturnValue({
      mutate: mocks.deleteMutate,
      isPending: true,
    });

    renderPage();

    // Both stayed enabled while pending, so an operator who saw no feedback
    // could click again and issue duplicate revoke or delete requests. The
    // device replacement control alongside them was already correct.
    expect(screen.getByRole("button", { name: "Revoking..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deleting..." })).toBeDisabled();
  });

  it("keeps the suspicious signals tile value and hint on the same metric", () => {
    renderPage();

    // The hint used to describe failed sign-ins while the value counted
    // suspicious signals.
    expect(
      screen.queryByText(/failed logins in this detail record/),
    ).not.toBeInTheDocument();
  });
});
