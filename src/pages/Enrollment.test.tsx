/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Enrollment from "./Enrollment";

const mocks = vi.hoisted(() => ({
  useEnrollment: vi.fn(),
  useSendEnrollmentInvites: vi.fn(),
  useOrganizations: vi.fn(),
  useAdminPermissions: vi.fn(),
  useToast: vi.fn(),
  useConfirm: vi.fn(),
  sendInvites: vi.fn(),
  confirm: vi.fn(),
  toastSuccess: vi.fn(),
  toastInfo: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("../hooks/useEnrollment", () => ({
  useEnrollment: mocks.useEnrollment,
  useSendEnrollmentInvites: mocks.useSendEnrollmentInvites,
}));

vi.mock("../hooks/useOrganizations", () => ({
  useOrganizations: mocks.useOrganizations,
}));

vi.mock("../hooks/useAdminPermissions", () => ({
  useAdminPermissions: mocks.useAdminPermissions,
}));

vi.mock("../hooks/useToast", () => ({
  useToast: mocks.useToast,
}));

vi.mock("../hooks/useConfirm", () => ({
  useConfirm: mocks.useConfirm,
}));

const users = [
  {
    id: "user-1",
    email: "ada@example.com",
    imported: true,
    credentialCount: 0,
    status: "none",
    lastLogin: null,
    enrollmentInvitedAt: null,
  },
  {
    id: "user-2",
    email: "grace@example.com",
    imported: false,
    credentialCount: 1,
    status: "one",
    lastLogin: "2026-10-01T12:00:00.000Z",
    enrollmentInvitedAt: "2026-10-02T12:00:00.000Z",
  },
];

type MutateOptions = {
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
};

function respondWith(result: unknown) {
  mocks.sendInvites.mockImplementation(
    (_input: unknown, options: MutateOptions) => options.onSuccess?.(result),
  );
}

describe("Enrollment", () => {
  beforeEach(() => {
    mocks.sendInvites.mockReset();
    mocks.useEnrollment.mockReturnValue({
      data: {
        summary: { total: 4, none: 1, one: 2, twoOrMore: 1 },
        users,
        total: 2,
      },
      isLoading: false,
      isError: false,
      isFetching: false,
    });
    mocks.useOrganizations.mockReturnValue({
      data: {
        organizations: [{ id: "org-1", name: "Acme", slug: "acme" }],
        total: 1,
      },
    });
    mocks.useSendEnrollmentInvites.mockReturnValue({
      mutate: mocks.sendInvites,
      isPending: false,
      isError: false,
      error: null,
    });
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: true,
    });
    mocks.confirm.mockReset();
    mocks.confirm.mockResolvedValue(true);
    mocks.useConfirm.mockReturnValue(mocks.confirm);
    mocks.toastSuccess.mockReset();
    mocks.toastInfo.mockReset();
    mocks.toastError.mockReset();
    mocks.useToast.mockReturnValue({
      success: mocks.toastSuccess,
      info: mocks.toastInfo,
      error: mocks.toastError,
    });
  });

  it("renders the summary and the users", () => {
    render(<Enrollment />);

    expect(
      screen.getByRole("heading", { name: "Passkey enrollment" }),
    ).toBeVisible();
    expect(screen.getByText("Not Enrolled").nextSibling).toHaveTextContent("1");
    expect(screen.getByText("One Authenticator").nextSibling).toHaveTextContent(
      "2",
    );
    expect(screen.getByText("Two Or More").nextSibling).toHaveTextContent("1");
    expect(screen.getByText("Coverage").nextSibling).toHaveTextContent("75%");
    expect(screen.getByText("ada@example.com")).toBeVisible();
    expect(screen.getByText("Imported")).toBeVisible();
    expect(screen.getByText("Not invited")).toBeVisible();
  });

  it("asks for the first page with no filters on mount", () => {
    render(<Enrollment />);

    expect(mocks.useEnrollment).toHaveBeenLastCalledWith({
      limit: 50,
      offset: 0,
      organizationId: undefined,
      status: undefined,
      imported: undefined,
      search: "",
    });
  });

  it("sends the chosen filters", async () => {
    render(<Enrollment />);

    fireEvent.change(screen.getByLabelText("Organization"), {
      target: { value: "org-1" },
    });
    fireEvent.change(screen.getByLabelText("Enrollment status"), {
      target: { value: "none" },
    });
    fireEvent.click(screen.getByLabelText("Imported users only"));
    fireEvent.change(screen.getByPlaceholderText("Search by email"), {
      target: { value: "ada" },
    });

    await waitFor(() =>
      expect(mocks.useEnrollment).toHaveBeenLastCalledWith({
        limit: 50,
        offset: 0,
        organizationId: "org-1",
        status: "none",
        imported: true,
        search: "ada",
      }),
    );
  });

  it("invites the selected users after confirmation", async () => {
    respondWith({
      sent: 1,
      skipped: 0,
      results: [{ userId: "user-1", status: "sent" }],
    });
    render(<Enrollment />);

    fireEvent.click(screen.getByLabelText("Select ada@example.com"));
    fireEvent.click(screen.getByRole("button", { name: "Invite selected" }));

    await waitFor(() =>
      expect(mocks.sendInvites).toHaveBeenCalledWith(
        { userIds: ["user-1"] },
        expect.any(Object),
      ),
    );
    expect(mocks.confirm).toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Enrollment invites sent",
      "1 sent, 0 skipped.",
    );
  });

  // The API skips anyone above the status threshold, which defaults to users
  // with no passkey, so a selected user with one authenticator needs it raised.
  it("raises the threshold when a selected user has one authenticator", async () => {
    respondWith({ sent: 2, skipped: 0, results: [] });
    render(<Enrollment />);

    fireEvent.click(screen.getByLabelText("Select all rows"));
    fireEvent.click(screen.getByRole("button", { name: "Invite selected" }));

    await waitFor(() =>
      expect(mocks.sendInvites).toHaveBeenCalledWith(
        { userIds: ["user-1", "user-2"], status: "one" },
        expect.any(Object),
      ),
    );
  });

  it("sends nothing when the confirmation is declined", async () => {
    mocks.confirm.mockResolvedValue(false);
    render(<Enrollment />);

    fireEvent.click(screen.getByLabelText("Select ada@example.com"));
    fireEvent.click(screen.getByRole("button", { name: "Invite selected" }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.sendInvites).not.toHaveBeenCalled();
  });

  it("invites an organization and reports how many remain", async () => {
    respondWith({
      sent: 200,
      skipped: 2,
      remaining: 35,
      results: [
        { userId: "user-3", status: "skipped", reason: "recently_invited" },
        { userId: "user-4", status: "skipped", reason: "recently_invited" },
      ],
    });
    render(<Enrollment />);

    expect(
      screen.queryByRole("button", { name: /Invite all not enrolled/ }),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Organization"), {
      target: { value: "org-1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Invite all not enrolled in Acme" }),
    );

    await waitFor(() =>
      expect(mocks.sendInvites).toHaveBeenCalledWith(
        { organizationId: "org-1" },
        expect.any(Object),
      ),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Enrollment invites sent",
      "200 sent, 2 skipped (2 invited in the last 24 hours). 35 members still need an invite. Run it again to continue.",
    );
  });

  it("hides invite controls from read-only admins", () => {
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: false,
    });
    render(<Enrollment />);

    fireEvent.change(screen.getByLabelText("Organization"), {
      target: { value: "org-1" },
    });

    expect(screen.getByText("Read-only access")).toBeVisible();
    expect(
      screen.queryByLabelText("Select ada@example.com"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Invite all not enrolled/ }),
    ).not.toBeInTheDocument();
  });

  it("shows why the API refused to send", async () => {
    const message =
      "Enrollment invites are unavailable while only passkey sign-in is allowed";
    mocks.sendInvites.mockImplementation(
      (_input: unknown, options: MutateOptions) =>
        options.onError?.(new Error(message)),
    );
    mocks.useSendEnrollmentInvites.mockReturnValue({
      mutate: mocks.sendInvites,
      isPending: false,
      isError: true,
      error: new Error(message),
    });
    render(<Enrollment />);

    expect(screen.getByRole("alert")).toHaveTextContent(message);

    fireEvent.click(screen.getByLabelText("Select ada@example.com"));
    fireEvent.click(screen.getByRole("button", { name: "Invite selected" }));

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Invites not sent",
        message,
      ),
    );
  });

  it("shows a loading skeleton", () => {
    mocks.useEnrollment.mockReturnValue({ isLoading: true });
    render(<Enrollment />);

    expect(
      screen.queryByRole("heading", { name: "Passkey enrollment" }),
    ).not.toBeInTheDocument();
  });

  it("shows the load error with a retry", () => {
    const refetch = vi.fn();
    mocks.useEnrollment.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error("boom"),
      refetch,
    });
    render(<Enrollment />);

    expect(screen.getByText("Could not load passkey enrollment")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("explains an empty filtered result", () => {
    mocks.useEnrollment.mockReturnValue({
      data: {
        summary: { total: 0, none: 0, one: 0, twoOrMore: 0 },
        users: [],
        total: 0,
      },
      isLoading: false,
      isError: false,
      isFetching: false,
    });
    render(<Enrollment />);

    expect(screen.getByText("No users yet")).toBeVisible();
    expect(screen.getByText("Coverage").nextSibling).toHaveTextContent("0%");
  });
});
