/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LoginHook } from "@seamless-auth/types";
import { ApiError } from "../lib/api";
import LoginHooks from "./LoginHooks";

const mocks = vi.hoisted(() => ({
  useLoginHooks: vi.fn(),
  useLoginHookInvocations: vi.fn(),
  setHook: vi.fn(),
  deleteHook: vi.fn(),
  rotate: vi.fn(),
  test: vi.fn(),
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

vi.mock("../hooks/useLoginHooks", () => ({
  useLoginHooks: mocks.useLoginHooks,
  useLoginHookInvocations: mocks.useLoginHookInvocations,
  useSetLoginHook: mutation(mocks.setHook),
  useDeleteLoginHook: mutation(mocks.deleteHook),
  useRotateLoginHookSecret: mutation(mocks.rotate),
  useTestLoginHook: mutation(mocks.test),
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

const SECRET = `whsec_${"B".repeat(43)}=`;

const postLogin: LoginHook = {
  trigger: "post_login",
  url: "https://hooks.example.com/sign-in",
  timeoutMs: 2000,
  failureMode: "closed",
  enabled: true,
  previousSecretExpiresAt: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

describe("LoginHooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useLoginHooks.mockReturnValue({
      data: { hooks: [postLogin] },
      isLoading: false,
    });
    mocks.useLoginHookInvocations.mockImplementation((trigger: string) => ({
      data: {
        invocations:
          trigger === "post_login"
            ? [
                {
                  id: "inv-1",
                  trigger,
                  userId: "user_1",
                  outcome: "failed_closed",
                  failure: "timed_out",
                  statusCode: null,
                  durationMs: 2000,
                  createdAt: "2026-11-01T00:00:00.000Z",
                },
              ]
            : [],
      },
      isLoading: false,
    }));
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: true,
    });
    mocks.ensureStepUp.mockResolvedValue(true);
    mocks.confirm.mockResolvedValue(true);
  });

  it("explains each trigger, the failure mode and the break-glass exemption", () => {
    render(<LoginHooks />);

    expect(screen.getByText(/It cannot add claims/)).toBeVisible();
    expect(screen.getByText(/It is not called on refresh/)).toBeVisible();
    expect(
      screen.getByText(/skip every login hook, so a hook that is down/),
    ).toBeVisible();
    expect(screen.getByText(/the sign-in fails and the user/)).toBeVisible();
    expect(screen.getByText("2000 ms, one attempt")).toBeVisible();
  });

  it("shows each trigger's invocation log", () => {
    render(<LoginHooks />);

    const log = screen.getByRole("table", { name: "post_login invocations" });
    expect(log).toHaveTextContent("Failed, sign-in refused");
    expect(log).toHaveTextContent("The destination did not answer in time.");

    fireEvent.change(screen.getByLabelText("post_login invocation outcome"), {
      target: { value: "denied" },
    });
    expect(mocks.useLoginHookInvocations).toHaveBeenLastCalledWith(
      "post_login",
      "denied",
    );
  });

  it("sets up a hook after step-up and shows its secret once", async () => {
    mocks.setHook.mockImplementation((_request, options) =>
      options.onSuccess({
        hook: { ...postLogin, trigger: "pre_token" },
        secret: SECRET,
      }),
    );
    render(<LoginHooks />);

    fireEvent.click(screen.getByRole("button", { name: "Set up pre_token" }));
    expect(
      screen.getByText(/break-glass sign-ins and recovery sessions never call/),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://hooks.example.com/claims" },
    });
    fireEvent.change(screen.getByLabelText("Timeout (ms)"), {
      target: { value: "750" },
    });
    fireEvent.click(screen.getByLabelText(/Fail open/));
    fireEvent.click(screen.getByRole("button", { name: "Create hook" }));

    await waitFor(() =>
      expect(mocks.setHook).toHaveBeenCalledWith(
        {
          trigger: "pre_token",
          hook: {
            url: "https://hooks.example.com/claims",
            timeoutMs: 750,
            failureMode: "open",
            enabled: true,
          },
        },
        expect.anything(),
      ),
    );
    expect(mocks.ensureStepUp).toHaveBeenCalled();
    expect(screen.getByDisplayValue(SECRET)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByDisplayValue(SECRET)).toBeNull();
  });

  it.each([["50"], ["5001"]])(
    "refuses a %s ms timeout before step-up",
    async (timeout) => {
      render(<LoginHooks />);

      fireEvent.click(screen.getByRole("button", { name: "Edit post_login" }));
      fireEvent.change(screen.getByLabelText("Timeout (ms)"), {
        target: { value: timeout },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(await screen.findByText(/timeoutMs/)).toBeVisible();
      expect(mocks.ensureStepUp).not.toHaveBeenCalled();
      expect(mocks.setHook).not.toHaveBeenCalled();
    },
  );

  it("keeps the settings when turning a hook off", async () => {
    render(<LoginHooks />);

    fireEvent.click(
      screen.getByRole("button", { name: "Turn off post_login" }),
    );

    await waitFor(() =>
      expect(mocks.setHook).toHaveBeenCalledWith(
        {
          trigger: "post_login",
          hook: {
            url: postLogin.url,
            timeoutMs: 2000,
            failureMode: "closed",
            enabled: false,
          },
        },
        expect.anything(),
      ),
    );
  });

  it("does not write when step-up is refused", async () => {
    mocks.ensureStepUp.mockResolvedValue(false);
    render(<LoginHooks />);

    fireEvent.click(
      screen.getByRole("button", { name: "Send test post_login" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Turn off post_login" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete post_login" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Rotate secret post_login" }),
    );

    await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalledTimes(4));
    expect(mocks.test).not.toHaveBeenCalled();
    expect(mocks.setHook).not.toHaveBeenCalled();
    expect(mocks.deleteHook).not.toHaveBeenCalled();
    expect(mocks.rotate).not.toHaveBeenCalled();
  });

  it("rotates the secret and shows it with the overlap", async () => {
    mocks.rotate.mockImplementation((_trigger, options) =>
      options.onSuccess({
        secret: SECRET,
        previousSecretExpiresAt: "2026-11-08T00:00:00.000Z",
      }),
    );
    render(<LoginHooks />);

    fireEvent.click(
      screen.getByRole("button", { name: "Rotate secret post_login" }),
    );

    expect(await screen.findByDisplayValue(SECRET)).toBeVisible();
    expect(screen.getByText(/for 24 hours/)).toBeVisible();
  });

  it("shows a test call result and a refused write", async () => {
    mocks.test.mockImplementation((_trigger, options) =>
      options.onSuccess({
        ok: false,
        failure: "invalid_response",
        statusCode: 200,
        durationMs: 20,
      }),
    );
    mocks.deleteHook.mockImplementation((_trigger, options) =>
      options.onError(new ApiError("Login hook not found", 404)),
    );
    render(<LoginHooks />);

    fireEvent.click(
      screen.getByRole("button", { name: "Send test post_login" }),
    );
    expect(
      await screen.findByText(/a body the API could not use/),
    ).toBeVisible();
    expect(screen.getByText(/not recorded as an invocation/)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Delete post_login" }));
    expect(await screen.findByText("Login hook not found")).toBeVisible();
  });

  it("hides write controls from a read-only admin", () => {
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: false,
    });
    render(<LoginHooks />);

    expect(screen.getByText("Read-only access")).toBeVisible();
    expect(screen.queryByRole("button", { name: /^Set up / })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
    expect(
      screen.getByRole("table", { name: "post_login invocations" }),
    ).toBeVisible();
  });

  it("says the API needs upgrading on a 404", () => {
    mocks.useLoginHooks.mockReturnValue({
      isError: true,
      error: new ApiError("Not found", 404),
    });
    render(<LoginHooks />);

    expect(screen.getByText("Needs Seamless Auth API v0.23")).toBeVisible();
    expect(mocks.useLoginHookInvocations).not.toHaveBeenCalled();
  });

  it("shows a skeleton and a load failure", () => {
    mocks.useLoginHooks.mockReturnValue({ isLoading: true });
    const { unmount } = render(<LoginHooks />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    unmount();

    const refetch = vi.fn();
    mocks.useLoginHooks.mockReturnValue({
      isError: true,
      error: new ApiError("The API had a problem", 500),
      refetch,
    });
    render(<LoginHooks />);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });
});
