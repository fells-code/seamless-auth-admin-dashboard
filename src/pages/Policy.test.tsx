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
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { PolicyDryRunResponse } from "@seamless-auth/types";
import Policy from "./Policy";
import { ApiError } from "../lib/api";
import { makePolicy, makePolicyVersion } from "../test/policyFixtures";

const mocks = vi.hoisted(() => ({
  usePolicyState: vi.fn(),
  usePolicyVersions: vi.fn(),
  saveDraft: vi.fn(),
  discardDraft: vi.fn(),
  publish: vi.fn(),
  rollback: vi.fn(),
  dryRun: vi.fn(),
  dryRunReset: vi.fn(),
  dryRunState: { data: undefined as unknown, isPending: false },
  refetch: vi.fn(),
  refetchVersions: vi.fn(),
  useAdminPermissions: vi.fn(),
  ensureStepUp: vi.fn(),
  confirm: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("../hooks/usePolicy", () => ({
  usePolicyState: mocks.usePolicyState,
  usePolicyVersions: mocks.usePolicyVersions,
  useSavePolicyDraft: () => ({ mutate: mocks.saveDraft, isPending: false }),
  useDiscardPolicyDraft: () => ({
    mutate: mocks.discardDraft,
    isPending: false,
  }),
  usePublishPolicy: () => ({ mutate: mocks.publish, isPending: false }),
  useRollbackPolicy: () => ({ mutate: mocks.rollback, isPending: false }),
  usePolicyDryRun: () => ({
    mutate: mocks.dryRun,
    reset: mocks.dryRunReset,
    ...mocks.dryRunState,
  }),
}));
vi.mock("../hooks/useAdminPermissions", () => ({
  useAdminPermissions: mocks.useAdminPermissions,
}));
vi.mock("../hooks/useStepUpGuard", () => ({
  useStepUpGuard: () => mocks.ensureStepUp,
}));
vi.mock("../hooks/useConfirm", () => ({ useConfirm: () => mocks.confirm }));
vi.mock("../hooks/useToast", () => ({ useToast: () => mocks.toast }));

const published = makePolicyVersion({
  version: 2,
  source: "publish",
  publishedBy: "admin-user-1234",
  publishedAt: "2026-10-20T12:00:00.000Z",
});
const bootstrap = makePolicyVersion({
  version: 1,
  policy: makePolicy({
    lockout_policy: { ...makePolicy().lockout_policy, maxFailures: 3 },
  }),
});

const draftPolicy = makePolicy({
  login_methods: ["passkey"],
  passkey_login_fallback_enabled: false,
});

function withState({ draft = null as null | { basedOnVersion: number } } = {}) {
  mocks.usePolicyState.mockReturnValue({
    data: {
      published,
      draft: draft
        ? {
            policy: draftPolicy,
            basedOnVersion: draft.basedOnVersion,
            updatedAt: "2026-10-21T12:00:00.000Z",
            updatedBy: "admin-user-1234",
          }
        : null,
    },
    isLoading: false,
    isError: false,
    refetch: mocks.refetch,
  });
}

function renderPage() {
  const router = createMemoryRouter(
    [{ path: "/policy", element: <Policy /> }],
    {
      initialEntries: ["/policy"],
    },
  );
  return render(<RouterProvider router={router} />);
}

const report: PolicyDryRunResponse = {
  window: {
    from: "2026-10-14T12:00:00.000Z",
    to: "2026-10-21T12:00:00.000Z",
  },
  signInsEvaluated: 120,
  usersEvaluated: 40,
  wouldFail: [
    {
      userId: "user-locked",
      email: "locked@example.com",
      signIns: 6,
      reasons: ["method_disabled"],
      lockedOut: true,
    },
    {
      userId: "user-ok",
      email: "fallback@example.com",
      signIns: 2,
      reasons: ["fallback_disabled"],
      lockedOut: false,
    },
  ],
  usersLockedOut: 1,
  breakGlassAccounts: 2,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.dryRunState.data = undefined;
  mocks.dryRunState.isPending = false;
  mocks.usePolicyVersions.mockReturnValue({
    data: { versions: [published, bootstrap] },
    isLoading: false,
    isError: false,
    refetch: mocks.refetchVersions,
  });
  mocks.useAdminPermissions.mockReturnValue({ canRead: true, canWrite: true });
  mocks.ensureStepUp.mockResolvedValue(true);
  mocks.confirm.mockResolvedValue(true);
  withState();
});

describe("Policy", () => {
  it("shows a loading state", () => {
    mocks.usePolicyState.mockReturnValue({ isLoading: true });
    renderPage();

    expect(screen.queryByText("Sign-in Policy")).not.toBeInTheDocument();
  });

  it("reports a failed load", () => {
    mocks.usePolicyState.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error("boom"),
      refetch: mocks.refetch,
    });
    renderPage();

    expect(
      screen.getByText("Could not load the sign-in policy"),
    ).toBeInTheDocument();
  });

  it("links to System Configuration and says its saves are versioned", () => {
    renderPage();

    expect(
      screen.getByRole("link", { name: "System Configuration" }),
    ).toHaveAttribute("href", "/system");
  });

  it("starts a draft from the published policy and saves it", async () => {
    renderPage();

    expect(
      screen.getByText(/Start a draft to stage a policy change/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start Draft" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /email otp/i }));

    const diff = screen.getByRole("table", {
      name: /policy changes from published v2 to unsaved edits/i,
    });
    expect(within(diff).getByText("Login methods")).toBeInTheDocument();
    expect(
      within(diff).getByText("passkey, magic_link, email_otp"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    expect(mocks.saveDraft).toHaveBeenCalledWith(
      makePolicy({ login_methods: ["passkey", "magic_link", "email_otp"] }),
      expect.any(Object),
    );
  });

  it("shows the draft against the published policy", () => {
    withState({ draft: { basedOnVersion: 2 } });
    renderPage();

    const diff = screen.getByRole("table", {
      name: /policy changes from published v2 to draft/i,
    });
    expect(within(diff).getByText("Passkey fallback")).toBeInTheDocument();
    expect(within(diff).getByText("Off")).toBeInTheDocument();
    expect(
      screen.queryByText("The draft is behind the published policy"),
    ).not.toBeInTheDocument();
  });

  it("warns when the draft was started from an older version", () => {
    withState({ draft: { basedOnVersion: 1 } });
    renderPage();

    expect(
      screen.getByText("The draft is behind the published policy"),
    ).toBeInTheDocument();
  });

  it("publishes after confirmation and step-up, against the reviewed version", async () => {
    withState({ draft: { basedOnVersion: 2 } });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() =>
      expect(mocks.publish).toHaveBeenCalledWith(
        { expectedVersion: 2 },
        expect.any(Object),
      ),
    );
    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining("version 3"),
      }),
    );
    expect(mocks.ensureStepUp).toHaveBeenCalled();
  });

  it("does not publish when step-up fails", async () => {
    withState({ draft: { basedOnVersion: 2 } });
    mocks.ensureStepUp.mockResolvedValue(false);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it("reloads and tells the operator when another version was published", async () => {
    withState({ draft: { basedOnVersion: 2 } });
    mocks.publish.mockImplementation((_input, { onError }) =>
      onError(
        new ApiError(
          "Version 3 is the published policy now. Review it and retry.",
          409,
          "policy_version_conflict",
        ),
      ),
    );
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() =>
      expect(
        screen.getByText("Another version was published"),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/Version 3 is the published policy now/),
    ).toBeInTheDocument();
    expect(mocks.toast.warning).toHaveBeenCalled();
    expect(mocks.refetch).toHaveBeenCalled();
    expect(mocks.refetchVersions).toHaveBeenCalled();
  });

  it("reports any other publish failure as an error", async () => {
    withState({ draft: { basedOnVersion: 2 } });
    mocks.publish.mockImplementation((_input, { onError }) =>
      onError(new ApiError("The Seamless Auth API had a problem.", 500)),
    );
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith(
        "Publish failed",
        "The Seamless Auth API had a problem.",
      ),
    );
  });

  it("discards the draft after confirmation", async () => {
    withState({ draft: { basedOnVersion: 2 } });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Discard Draft" }));

    await waitFor(() => expect(mocks.discardDraft).toHaveBeenCalled());
  });

  it("runs a dry run of the saved draft over the chosen days", () => {
    withState({ draft: { basedOnVersion: 2 } });
    renderPage();

    fireEvent.change(screen.getByLabelText("Days of sign-ins"), {
      target: { value: "14" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Run Dry Run" }));

    expect(mocks.dryRun).toHaveBeenCalledWith({ days: 14 }, expect.any(Object));
  });

  it("refuses a window outside 1 to 30 days", () => {
    withState({ draft: { basedOnVersion: 2 } });
    renderPage();

    fireEvent.change(screen.getByLabelText("Days of sign-ins"), {
      target: { value: "31" },
    });

    expect(screen.getByRole("button", { name: "Run Dry Run" })).toBeDisabled();
    expect(
      screen.getByText("Enter a whole number from 1 to 30."),
    ).toBeInTheDocument();
  });

  it("dry runs unsaved edits as they are", () => {
    withState({ draft: { basedOnVersion: 2 } });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Edit Draft" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /^magic links/i }));
    fireEvent.click(screen.getByRole("button", { name: "Run Dry Run" }));

    expect(mocks.dryRun).toHaveBeenCalledWith(
      {
        days: 7,
        policy: { ...draftPolicy, login_methods: ["passkey", "magic_link"] },
      },
      expect.any(Object),
    );
  });

  it("shows who the draft would refuse, with break-glass accounts apart", () => {
    withState({ draft: { basedOnVersion: 2 } });
    mocks.dryRunState.data = report;
    renderPage();

    expect(screen.getByText("No remaining method")).toBeInTheDocument();
    expect(screen.getByText("2 break-glass accounts")).toBeInTheDocument();
    expect(
      screen.getByText("This draft would lock accounts out"),
    ).toBeInTheDocument();

    const table = screen.getByRole("table", {
      name: "Accounts the draft would refuse",
    });
    expect(
      within(table).getByRole("link", { name: "locked@example.com" }),
    ).toHaveAttribute("href", "/users/user-locked");
    expect(
      within(table).getByText("Method no longer enabled"),
    ).toBeInTheDocument();
    expect(within(table).getByText("None left")).toBeInTheDocument();
    expect(
      screen.queryByText("The dry run may have reached its account limit"),
    ).not.toBeInTheDocument();
  });

  it("says so when the dry run reached the account limit", () => {
    withState({ draft: { basedOnVersion: 2 } });
    mocks.dryRunState.data = {
      ...report,
      usersEvaluated: 9_998,
      breakGlassAccounts: 2,
    };
    renderPage();

    expect(
      screen.getByText("The dry run may have reached its account limit"),
    ).toBeInTheDocument();
  });

  it("honours a cap flag if the API sends one", () => {
    withState({ draft: { basedOnVersion: 2 } });
    mocks.dryRunState.data = { ...report, capped: true };
    renderPage();

    expect(
      screen.getByText("The dry run may have reached its account limit"),
    ).toBeInTheDocument();
  });

  it("lists versions with source, time and author", () => {
    renderPage();

    const table = screen.getByRole("table", { name: "Policy versions" });
    expect(within(table).getByText("v2")).toBeInTheDocument();
    expect(within(table).getByText("In force")).toBeInTheDocument();
    expect(within(table).getByText("Published draft")).toBeInTheDocument();
    expect(within(table).getByText("Initial policy")).toBeInTheDocument();
    expect(within(table).getByText("System")).toBeInTheDocument();
    expect(
      within(table).getByRole("link", { name: "admin-us..." }),
    ).toHaveAttribute("href", "/users/admin-user-1234");
  });

  it("reviews an earlier version and rolls back to it with step-up", async () => {
    renderPage();

    const table = screen.getByRole("table", { name: "Policy versions" });
    const reviewButtons = within(table).getAllByRole("button", {
      name: /review/i,
    });
    fireEvent.click(reviewButtons[1]!);

    const diff = screen.getByRole("table", {
      name: /policy changes from in force v2 to version 1/i,
    });
    expect(within(diff).getByText("maxFailures")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Roll Back To v1" }));

    await waitFor(() =>
      expect(mocks.rollback).toHaveBeenCalledWith(
        { version: 1, expectedVersion: 2 },
        expect.any(Object),
      ),
    );
    expect(mocks.ensureStepUp).toHaveBeenCalled();
  });

  it("does not roll back when the confirmation is declined", async () => {
    mocks.confirm.mockResolvedValue(false);
    renderPage();

    const table = screen.getByRole("table", { name: "Policy versions" });
    fireEvent.click(
      within(table).getAllByRole("button", { name: /review/i })[1]!,
    );
    fireEvent.click(screen.getByRole("button", { name: "Roll Back To v1" }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.ensureStepUp).not.toHaveBeenCalled();
    expect(mocks.rollback).not.toHaveBeenCalled();
  });

  it("offers a read-only admin review and dry run, but no writes", () => {
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: false,
    });
    withState({ draft: { basedOnVersion: 2 } });
    renderPage();

    expect(screen.getByText("Read-only access")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit Draft" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Publish" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run Dry Run" })).toBeEnabled();

    const table = screen.getByRole("table", { name: "Policy versions" });
    fireEvent.click(
      within(table).getAllByRole("button", { name: /review/i })[1]!,
    );
    expect(
      screen.queryByRole("button", { name: "Roll Back To v1" }),
    ).not.toBeInTheDocument();
  });
});
