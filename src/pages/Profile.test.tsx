/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
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

function renderPage() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  );
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
});
