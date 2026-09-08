/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Sessions from "./Sessions";

const mocks = vi.hoisted(() => ({
  useSessions: vi.fn(),
  useRevokeSession: vi.fn(),
  useAdminPermissions: vi.fn(),
  useStepUpGuard: vi.fn(),
  useToast: vi.fn(),
  useConfirm: vi.fn(),
  revokeMutate: vi.fn(),
  revokeMutateAsync: vi.fn(),
  ensureStepUp: vi.fn(),
  confirm: vi.fn(),
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

vi.mock("../hooks/useConfirm", () => ({
  useConfirm: mocks.useConfirm,
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

const baseSession = {
  id: "session_base",
  ipAddress: "10.0.0.9",
  userAgent: "Mozilla/5.0 Firefox/125.0",
  lastUsedAt: new Date(now - 60_000).toISOString(),
  expiresAt: new Date(now + 86_400_000).toISOString(),
};

function renderPage(rows?: typeof sessions) {
  if (rows) {
    mocks.useSessions.mockReturnValue({
      data: { sessions: rows, total: rows.length },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
      isFetching: false,
      dataUpdatedAt: now,
    });
  }

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
    mocks.confirm.mockResolvedValue(true);
    mocks.useConfirm.mockReturnValue(mocks.confirm);
    mocks.useToast.mockReturnValue({
      success: mocks.toastSuccess,
      error: mocks.toastError,
    });
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
    renderPage();

    fireEvent.click(screen.getAllByTitle("Revoke")[0]);

    await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
    expect(mocks.revokeMutate).toHaveBeenCalledWith(
      "session_1",
      expect.any(Object),
    );
  });

  it("does not revoke when the confirmation is dismissed", async () => {
    mocks.confirm.mockResolvedValue(false);

    renderPage();

    fireEvent.click(screen.getAllByTitle("Revoke")[0]);

    await waitFor(() => expect(mocks.revokeMutate).not.toHaveBeenCalled());
    expect(mocks.ensureStepUp).not.toHaveBeenCalled();
  });

  it("does not revoke when step-up verification fails", async () => {
    mocks.ensureStepUp.mockResolvedValue(false);

    renderPage();

    fireEvent.click(screen.getAllByTitle("Revoke")[0]);

    await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
    expect(mocks.revokeMutate).not.toHaveBeenCalled();
  });

  it("reports the outcome of a revoke through toasts", async () => {
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

  it("steps back a page when a revoke empties the current one", async () => {
    // A second page holding exactly one session, which the revoke removes.
    mocks.useSessions.mockReturnValue({
      data: { sessions: [baseSession], total: 51 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
      isFetching: false,
      dataUpdatedAt: now,
    });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(mocks.useSessions).toHaveBeenLastCalledWith({
      limit: 50,
      offset: 50,
    });

    fireEvent.click(screen.getAllByRole("button", { name: /revoke/i })[0]);
    await waitFor(() => expect(mocks.revokeMutate).toHaveBeenCalled());

    mocks.revokeMutate.mock.calls[0][1].onSuccess();

    // Without this the next fetch asks for an offset past the end of the
    // result set and the screen renders an empty page.
    await waitFor(() =>
      expect(mocks.useSessions).toHaveBeenLastCalledWith({
        limit: 50,
        offset: 0,
      }),
    );
  });

  it("labels an Edge session as Edge rather than Chrome", () => {
    renderPage([
      {
        ...baseSession,
        id: "session_edge",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      },
    ]);

    // Edge and most Chromium user agents also contain "Chrome", which was
    // matched first.
    expect(screen.getByText("Edge")).toBeInTheDocument();
    expect(screen.queryByText("Chrome")).not.toBeInTheDocument();
  });

  it("excludes expired sessions from the active count", () => {
    const now = Date.now();

    renderPage([
      {
        ...baseSession,
        id: "live",
        expiresAt: new Date(now + 60 * 60 * 1000).toISOString(),
      },
      {
        ...baseSession,
        id: "dead",
        expiresAt: new Date(now - 60 * 60 * 1000).toISOString(),
      },
    ]);

    const card = screen
      .getByText("Active On Page")
      .closest("div")!.parentElement!;

    expect(card).toHaveTextContent("1");
    expect(card).toHaveTextContent("1 expired session excluded");
  });

  it("asks the server for an explicit window instead of its default page", () => {
    renderPage();

    expect(mocks.useSessions).toHaveBeenCalledWith({ limit: 50, offset: 0 });
  });

  it("reports the deployment total rather than the size of the loaded page", () => {
    mocks.useSessions.mockReturnValue({
      data: { sessions, total: 137 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
      isFetching: false,
      dataUpdatedAt: now,
    });

    renderPage();

    const card = screen
      .getByText("Total Sessions")
      .closest("div")!.parentElement!;

    expect(card).toHaveTextContent("137");
    expect(screen.getByText("Showing 1-2 of 137")).toBeInTheDocument();
  });

  it("fetches the next server page rather than paging the loaded rows", () => {
    mocks.useSessions.mockReturnValue({
      data: { sessions, total: 137 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
      isFetching: false,
      dataUpdatedAt: now,
    });

    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(mocks.useSessions).toHaveBeenLastCalledWith({
      limit: 50,
      offset: 50,
    });
  });

  it("says when a search or filter only narrowed the loaded page", () => {
    mocks.useSessions.mockReturnValue({
      data: { sessions, total: 137 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
      isFetching: false,
      dataUpdatedAt: now,
    });

    renderPage();

    fireEvent.change(
      screen.getByPlaceholderText("Search this page by IP or device"),
      { target: { value: "10.0.0.1" } },
    );

    expect(
      screen.getByText("Showing 1 of 2 sessions on this page"),
    ).toBeInTheDocument();

    // The pager keeps describing the deployment, so the operator can tell the
    // difference between "not on this page" and "not in the deployment".
    expect(screen.getByText("Showing 1-2 of 137")).toBeInTheDocument();
  });

  it("keeps the current page when a filter changes", () => {
    mocks.useSessions.mockReturnValue({
      data: { sessions, total: 137 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
      isFetching: false,
      dataUpdatedAt: now,
    });

    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /Recent/ }));

    expect(mocks.useSessions).toHaveBeenLastCalledWith({
      limit: 50,
      offset: 50,
    });
  });
});
