/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Profile from "./Profile";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useUserDetail: vi.fn(),
  useRevokeSession: vi.fn(),
  useUpdateUser: vi.fn(),
  useStepUpGuard: vi.fn(),
  useAdminPermissions: vi.fn(),
  useToast: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("@seamless-auth/react", () => ({ useAuth: mocks.useAuth }));
vi.mock("../hooks/useUserDetail", () => ({
  useUserDetail: mocks.useUserDetail,
}));
vi.mock("../hooks/useRevokeSession", () => ({
  useRevokeSession: mocks.useRevokeSession,
}));
vi.mock("../hooks/useUpdateUser", () => ({
  useUpdateUser: mocks.useUpdateUser,
}));
vi.mock("../hooks/useStepUpGuard", () => ({
  useStepUpGuard: mocks.useStepUpGuard,
}));
vi.mock("../hooks/useAdminPermissions", () => ({
  useAdminPermissions: mocks.useAdminPermissions,
}));
vi.mock("../hooks/useToast", () => ({ useToast: mocks.useToast }));

/**
 * React Query states the page has to tell apart. A disabled query is pending
 * with no fetch in flight, which is not the same as a failure.
 */
const queryStates = {
  disabled: {
    data: undefined,
    isPending: true,
    isError: false,
    error: null,
  },
  loading: {
    data: undefined,
    isPending: true,
    isError: false,
    error: null,
  },
  failed: {
    data: undefined,
    isPending: false,
    isError: true,
    error: new Error("The Seamless Auth API had a problem."),
  },
  loaded: {
    data: { sessions: [], credentials: [] },
    isPending: false,
    isError: false,
    error: null,
  },
};

const credentials = [
  {
    id: "credential_1",
    friendlyName: "Work MacBook",
    deviceType: "singleDevice",
    browser: "Chrome",
    createdAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "credential_2",
    friendlyName: null,
    deviceType: "multiDevice",
    browser: "Chrome",
    createdAt: "2026-06-02T00:00:00.000Z",
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  );
}

/** The Device cell of a credential row, counted from the first record. */
function credentialDeviceCell(row: number) {
  const table = screen.getByRole("table", { name: "Your passkeys" });
  const rows = within(table).getAllByRole("row");

  // The first row is the header, which holds columnheaders rather than cells.
  return within(rows[row + 1]).getAllByRole("cell")[0];
}

describe("Profile", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset?.());

    mocks.useAuth.mockReturnValue({
      user: { id: "user_1", email: "ada@example.com" },
    });
    mocks.useRevokeSession.mockReturnValue({ mutate: vi.fn() });
    mocks.useUpdateUser.mockReturnValue({
      mutate: vi.fn(),
      isError: false,
      error: null,
    });
    mocks.useStepUpGuard.mockReturnValue(vi.fn().mockResolvedValue(true));
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: true,
    });
    mocks.useToast.mockReturnValue({ success: vi.fn(), error: vi.fn() });
  });

  it("does not report a failure while auth is still resolving", () => {
    // No signed-in user yet, so the query is gated off and never runs.
    mocks.useAuth.mockReturnValue({ user: undefined });
    mocks.useUserDetail.mockReturnValue({
      ...queryStates.disabled,
      refetch: mocks.refetch,
    });

    renderPage();

    expect(
      screen.queryByText("Could not load profile"),
    ).not.toBeInTheDocument();
  });

  it("shows the loading state while the profile is being fetched", () => {
    mocks.useUserDetail.mockReturnValue({
      ...queryStates.loading,
      refetch: mocks.refetch,
    });

    renderPage();

    expect(
      screen.queryByText("Could not load profile"),
    ).not.toBeInTheDocument();
  });

  it("reports a genuine failure", () => {
    mocks.useUserDetail.mockReturnValue({
      ...queryStates.failed,
      refetch: mocks.refetch,
    });

    renderPage();

    expect(screen.getByText("Could not load profile")).toBeInTheDocument();
  });

  it("renders the profile once it loads", () => {
    mocks.useUserDetail.mockReturnValue({
      ...queryStates.loaded,
      refetch: mocks.refetch,
    });

    renderPage();

    expect(
      screen.queryByText("Could not load profile"),
    ).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("ada@example.com")).toBeInTheDocument();
  });

  describe("credentials", () => {
    beforeEach(() => {
      mocks.useUserDetail.mockReturnValue({
        ...queryStates.loaded,
        data: { sessions: [], credentials },
        refetch: mocks.refetch,
      });
    });

    it("leads with the friendly name and keeps the device type beneath it", () => {
      renderPage();

      const device = credentialDeviceCell(0);

      expect(device).toHaveTextContent(/^Work MacBook/);
      expect(within(device).getByText("singleDevice")).toBeInTheDocument();
    });

    it("falls back to the device type when no friendly name is set", () => {
      renderPage();

      // Nothing but the device type, so an unnamed credential does not render
      // a blank primary line above it.
      expect(credentialDeviceCell(1)).toHaveTextContent(/^multiDevice$/);
    });
  });
});
