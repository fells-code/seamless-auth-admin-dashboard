/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStepUpGuard } from "./useStepUpGuard";
import { TotpPromptContext } from "../lib/totpPromptContext";

const authState = vi.hoisted(() => ({
  value: {
    credentials: [{ id: "cred_1" }] as { id: string }[],
    refreshStepUpStatus: vi.fn(),
    stepUpStatus: null as { fresh: boolean } | null,
    verifyStepUpWithPasskey: vi.fn(),
    verifyStepUpWithTotp: vi.fn(),
  },
}));

const clientState = vi.hoisted(() => ({
  getTotpStatus: vi.fn(),
  webAuthnDetail: vi.fn(),
}));

const promptForTotp = vi.hoisted(() => vi.fn());

vi.mock("@seamless-auth/react", () => ({
  useAuth: () => authState.value,
  useAuthClient: () => ({ getTotpStatus: clientState.getTotpStatus }),
  getWebAuthnErrorDetail: (error: unknown) => clientState.webAuthnDetail(error),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();

  return {
    ...actual,
    useContext: (context: unknown) =>
      context === TotpPromptContext
        ? promptForTotp
        : actual.useContext(context as never),
  };
});

describe("useStepUpGuard", () => {
  beforeEach(() => {
    authState.value.stepUpStatus = null;
    authState.value.credentials = [{ id: "cred_1" }];
    authState.value.refreshStepUpStatus.mockReset();
    authState.value.verifyStepUpWithPasskey.mockReset();
    authState.value.verifyStepUpWithTotp.mockReset();
    clientState.getTotpStatus.mockReset();
    clientState.getTotpStatus.mockResolvedValue({
      data: { enabled: false },
      error: null,
    });
    clientState.webAuthnDetail.mockReset();
    clientState.webAuthnDetail.mockReturnValue(undefined);
    promptForTotp.mockReset();
  });

  it("allows the action immediately when step-up is already fresh", async () => {
    authState.value.stepUpStatus = { fresh: true };

    const { result } = renderHook(() => useStepUpGuard());

    await expect(result.current()).resolves.toBe(true);
    expect(authState.value.refreshStepUpStatus).not.toHaveBeenCalled();
    expect(authState.value.verifyStepUpWithPasskey).not.toHaveBeenCalled();
  });

  it("refreshes step-up status before starting a passkey challenge", async () => {
    authState.value.refreshStepUpStatus.mockResolvedValue({
      data: { fresh: true },
      error: null,
    });

    const { result } = renderHook(() => useStepUpGuard());

    await expect(result.current()).resolves.toBe(true);
    expect(authState.value.refreshStepUpStatus).toHaveBeenCalled();
    expect(authState.value.verifyStepUpWithPasskey).not.toHaveBeenCalled();
  });

  it("runs passkey step-up when no fresh status is available", async () => {
    authState.value.refreshStepUpStatus.mockResolvedValue({
      data: { fresh: false },
      error: null,
    });
    authState.value.verifyStepUpWithPasskey.mockResolvedValue({
      data: { fresh: true },
      error: null,
    });

    const { result } = renderHook(() => useStepUpGuard());

    await expect(result.current()).resolves.toBe(true);
    expect(authState.value.verifyStepUpWithPasskey).toHaveBeenCalled();
  });

  it("blocks the action when step-up fails or errors", async () => {
    authState.value.refreshStepUpStatus.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useStepUpGuard());

    await expect(result.current()).resolves.toBe(false);
  });

  it("never launches a passkey ceremony for an account with no credential", async () => {
    authState.value.credentials = [];
    authState.value.refreshStepUpStatus.mockResolvedValue({
      data: { fresh: false },
      error: null,
    });
    clientState.getTotpStatus.mockResolvedValue({
      data: { enabled: true },
      error: null,
    });
    promptForTotp.mockResolvedValue("123456");
    authState.value.verifyStepUpWithTotp.mockResolvedValue({
      data: { fresh: true },
      error: null,
    });

    const { result } = renderHook(() => useStepUpGuard());

    await expect(result.current()).resolves.toBe(true);

    // /step-up/webauthn/start returns an empty allowCredentials for this
    // account, so the ceremony could only ever throw.
    expect(authState.value.verifyStepUpWithPasskey).not.toHaveBeenCalled();
    expect(authState.value.verifyStepUpWithTotp).toHaveBeenCalledWith("123456");
  });

  it("guides enrolment when the account has no usable factor at all", async () => {
    authState.value.credentials = [];
    authState.value.refreshStepUpStatus.mockResolvedValue({
      data: { fresh: false },
      error: null,
    });
    clientState.getTotpStatus.mockResolvedValue({
      data: { enabled: false },
      error: null,
    });

    const { result } = renderHook(() => useStepUpGuard());

    await expect(result.current()).resolves.toBe(false);
    expect(authState.value.verifyStepUpWithPasskey).not.toHaveBeenCalled();
    expect(promptForTotp).not.toHaveBeenCalled();
  });

  it("blocks without verifying when the operator cancels the code prompt", async () => {
    authState.value.credentials = [];
    authState.value.refreshStepUpStatus.mockResolvedValue({
      data: { fresh: false },
      error: null,
    });
    clientState.getTotpStatus.mockResolvedValue({
      data: { enabled: true },
      error: null,
    });
    promptForTotp.mockResolvedValue(null);

    const { result } = renderHook(() => useStepUpGuard());

    await expect(result.current()).resolves.toBe(false);
    expect(authState.value.verifyStepUpWithTotp).not.toHaveBeenCalled();
  });

  it("stops on a dismissed passkey prompt rather than falling through", async () => {
    authState.value.refreshStepUpStatus.mockResolvedValue({
      data: { fresh: false },
      error: null,
    });
    authState.value.verifyStepUpWithPasskey.mockResolvedValue({
      data: null,
      error: new Error("cancelled"),
    });
    clientState.webAuthnDetail.mockReturnValue({
      name: "NotAllowedError",
      message: "cancelled",
    });

    const { result } = renderHook(() => useStepUpGuard());

    await expect(result.current()).resolves.toBe(false);
    // A dismissed prompt is the user's own choice, so it must not escalate to
    // asking for a code they did not choose to use.
    expect(clientState.getTotpStatus).not.toHaveBeenCalled();
  });

  it("falls back to TOTP when a passkey is enrolled but unusable here", async () => {
    authState.value.refreshStepUpStatus.mockResolvedValue({
      data: { fresh: false },
      error: null,
    });
    authState.value.verifyStepUpWithPasskey.mockResolvedValue({
      data: null,
      error: new Error("no credential on this device"),
    });
    clientState.getTotpStatus.mockResolvedValue({
      data: { enabled: true },
      error: null,
    });
    promptForTotp.mockResolvedValue("654321");
    authState.value.verifyStepUpWithTotp.mockResolvedValue({
      data: { fresh: true },
      error: null,
    });

    const { result } = renderHook(() => useStepUpGuard());

    await expect(result.current()).resolves.toBe(true);
  });
});
