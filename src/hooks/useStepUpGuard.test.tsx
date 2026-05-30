/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStepUpGuard } from "./useStepUpGuard";

const authState = vi.hoisted(() => ({
  value: {
    refreshStepUpStatus: vi.fn(),
    stepUpStatus: null as { fresh: boolean } | null,
    verifyStepUpWithPasskey: vi.fn(),
  },
}));

vi.mock("@seamless-auth/react", () => ({
  useAuth: () => authState.value,
}));

describe("useStepUpGuard", () => {
  beforeEach(() => {
    authState.value.stepUpStatus = null;
    authState.value.refreshStepUpStatus.mockReset();
    authState.value.verifyStepUpWithPasskey.mockReset();
  });

  it("allows the action immediately when step-up is already fresh", async () => {
    authState.value.stepUpStatus = { fresh: true };

    const { result } = renderHook(() => useStepUpGuard());

    await expect(result.current()).resolves.toBe(true);
    expect(authState.value.refreshStepUpStatus).not.toHaveBeenCalled();
    expect(authState.value.verifyStepUpWithPasskey).not.toHaveBeenCalled();
  });

  it("refreshes step-up status before starting a passkey challenge", async () => {
    authState.value.refreshStepUpStatus.mockResolvedValue({ fresh: true });

    const { result } = renderHook(() => useStepUpGuard());

    await expect(result.current()).resolves.toBe(true);
    expect(authState.value.refreshStepUpStatus).toHaveBeenCalled();
    expect(authState.value.verifyStepUpWithPasskey).not.toHaveBeenCalled();
  });

  it("runs passkey step-up when no fresh status is available", async () => {
    authState.value.refreshStepUpStatus.mockResolvedValue({ fresh: false });
    authState.value.verifyStepUpWithPasskey.mockResolvedValue({
      success: true,
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
});
