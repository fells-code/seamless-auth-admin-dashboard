/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AuthLoading from "./AuthLoading";

describe("AuthLoading", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fades in after the auth delay", () => {
    vi.useFakeTimers();

    const { container } = render(<AuthLoading />);

    expect(container.firstChild).toHaveClass("opacity-0");

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(container.firstChild).toHaveClass("opacity-100");
  });
});
