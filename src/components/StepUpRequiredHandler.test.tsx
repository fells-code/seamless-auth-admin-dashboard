/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StepUpRequiredHandler from "./StepUpRequiredHandler";
import { requestStepUp } from "../lib/stepUpRequired";

const ensureStepUp = vi.hoisted(() => vi.fn());

vi.mock("../hooks/useStepUpGuard", () => ({
  useStepUpGuard: () => ensureStepUp,
}));

describe("StepUpRequiredHandler", () => {
  beforeEach(() => {
    ensureStepUp.mockReset();
  });

  it("answers a step-up request with a forced step-up", async () => {
    ensureStepUp.mockResolvedValue(true);
    const { unmount } = render(<StepUpRequiredHandler />);

    await expect(requestStepUp()).resolves.toBe(true);
    // Forced, because the API refusing the write proves the cached status is stale.
    expect(ensureStepUp).toHaveBeenCalledWith({ force: true });

    unmount();
  });

  it("declines once unmounted, so nothing waits on a prompt that cannot open", async () => {
    const { unmount } = render(<StepUpRequiredHandler />);
    unmount();

    await expect(requestStepUp()).resolves.toBe(false);
    expect(ensureStepUp).not.toHaveBeenCalled();
  });

  it("treats a step-up that throws as declined", async () => {
    ensureStepUp.mockRejectedValue(new Error("boom"));
    const { unmount } = render(<StepUpRequiredHandler />);

    await expect(requestStepUp()).resolves.toBe(false);

    unmount();
  });
});
