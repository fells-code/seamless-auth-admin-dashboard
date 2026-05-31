/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QueryErrorState, ReadOnlyNotice, StateMessage } from "./StateMessage";
import { getErrorMessage } from "../lib/errorMessage";

describe("StateMessage", () => {
  it("renders an informational state message", () => {
    render(
      <StateMessage
        title="No sessions"
        description="This user has no active sessions."
      />,
    );

    expect(screen.getByText("No sessions")).toBeInTheDocument();
    expect(
      screen.getByText("This user has no active sessions."),
    ).toBeInTheDocument();
  });

  it("renders query errors with retry actions", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();

    render(
      <QueryErrorState error={new Error("API unavailable")} onRetry={retry} />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("API unavailable");
    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(retry).toHaveBeenCalled();
  });

  it("renders read-only permission notices", () => {
    render(<ReadOnlyNotice />);

    expect(screen.getByText("Read-only access")).toBeInTheDocument();
  });

  it("normalizes unknown errors", () => {
    expect(getErrorMessage("Nope")).toBe("Nope");
    expect(getErrorMessage(null)).toMatch(/request failed/i);
  });
});
