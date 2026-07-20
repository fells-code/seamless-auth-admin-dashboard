/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Sessions from "./Sessions";

const mocks = vi.hoisted(() => ({
  useSessions: vi.fn(),
  useRevokeSession: vi.fn(),
  useAdminPermissions: vi.fn(),
  useStepUpGuard: vi.fn(),
  useToast: vi.fn(),
  revokeMutate: vi.fn(),
  revokeMutateAsync: vi.fn(),
  ensureStepUp: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("../hooks/useSessions", () => ({
  useSessions: mocks.useSessions,
}));

vi.mock("../hooks/useRevokeSession", () => ({
  useRevokeSession: mocks.useRevokeSession,
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

const now = Date.now();

const sessions = [
  {
    id: "session_1",
    ipAddress: "10.0.0.1",
    userAgent: "Mozilla/5.0 Firefox/125.0",
    lastUsedAt: new Date(now - 60_000).toISOString(),
    expiresAt: new Date(now + 86_400_000).toISOString(),
  },
  {
    id: "session_2",
    ipAddress: "10.0.0.2",
    userAgent: "Mozilla/5.0 Chrome/124.0",
    lastUsedAt: new Date(now - 60_000).toISOString(),
    expiresAt: new Date(now + 86_400_000).toISOString(),
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <Sessions />
    </MemoryRouter>,
  );
}

describe("Sessions", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset?.());

    mocks.useSessions.mockReturnValue({
      data: { sessions, total: sessions.length },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
    });
    mocks.useRevokeSession.mockReturnValue({
      mutate: mocks.revokeMutate,
      mutateAsync: mocks.revokeMutateAsync,
    });
    mocks.revokeMutateAsync.mockResolvedValue(undefined);
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

  it("lists the active sessions", () => {
    renderPage();

    expect(screen.getByText("10.0.0.1")).toBeInTheDocument();
    expect(screen.getByText("10.0.0.2")).toBeInTheDocument();
  });

  it("surfaces a load failure", () => {
    mocks.useSessions.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("The request was invalid."),
      refetch: mocks.refetch,
    });

    renderPage();

    expect(screen.getByText("Could not load sessions")).toBeInTheDocument();
  });

  it("hides revoke controls and warns when access is read-only", () => {
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: false,
    });

    renderPage();

    expect(screen.getByText("Read-only access")).toBeInTheDocument();
    expect(screen.queryByTitle("Revoke")).not.toBeInTheDocument();
  });

  it("requires confirmation and step-up before revoking a session", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );

    renderPage();

    fireEvent.click(screen.getAllByTitle("Revoke")[0]);

    await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
    expect(mocks.revokeMutate).toHaveBeenCalledWith(
      "session_1",
      expect.any(Object),
    );
  });

  it("does not revoke when the confirmation is dismissed", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );

    renderPage();

    fireEvent.click(screen.getAllByTitle("Revoke")[0]);

    await waitFor(() => expect(mocks.revokeMutate).not.toHaveBeenCalled());
    expect(mocks.ensureStepUp).not.toHaveBeenCalled();
  });

  it("does not revoke when step-up verification fails", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    mocks.ensureStepUp.mockResolvedValue(false);

    renderPage();

    fireEvent.click(screen.getAllByTitle("Revoke")[0]);

    await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
    expect(mocks.revokeMutate).not.toHaveBeenCalled();
  });

  it("reports the outcome of a revoke through toasts", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );

    renderPage();

    fireEvent.click(screen.getAllByTitle("Revoke")[0]);

    await waitFor(() => expect(mocks.revokeMutate).toHaveBeenCalled());

    const callbacks = mocks.revokeMutate.mock.calls[0][1] as {
      onSuccess: () => void;
      onError: (error: Error) => void;
    };

    callbacks.onSuccess();
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Session revoked",
      "The selected session was revoked.",
    );

    callbacks.onError(new Error("Not allowed"));
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Session revoke failed",
      "Not allowed",
    );
  });

  it("falls back to a valid page when a revoke empties the current one", () => {
    // 11 sessions over a page size of 10, so the last page holds exactly one.
    const many = Array.from({ length: 11 }, (_, index) => ({
      id: `session_${index + 1}`,
      ipAddress: `10.0.0.${index + 1}`,
      userAgent: "Mozilla/5.0 Firefox/125.0",
      lastUsedAt: new Date(now - 60_000).toISOString(),
      expiresAt: new Date(now + 86_400_000).toISOString(),
    }));

    mocks.useSessions.mockReturnValue({
      data: { sessions: many, total: many.length },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
    });

    const { rerender } = renderPage();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    // The eleventh session is alone on the second page.
    expect(screen.getByText("10.0.0.11")).toBeInTheDocument();

    // Revoking it shrinks the list so that page no longer exists.
    mocks.useSessions.mockReturnValue({
      data: { sessions: many.slice(0, 10), total: 10 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
    });

    rerender(
      <MemoryRouter>
        <Sessions />
      </MemoryRouter>,
    );

    // Rows are shown rather than an empty view contradicting the row count.
    expect(
      screen.queryByText("No sessions match this view"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("10.0.0.1")).toBeInTheDocument();
  });
});
