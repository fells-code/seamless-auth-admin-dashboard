/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ToastProvider from "./ToastProvider";
import { useToast } from "../hooks/useToast";

function ToastTrigger() {
  const toast = useToast();

  return (
    <button
      onClick={() =>
        toast.success("User deleted", "The account was removed from auth.")
      }
    >
      Notify
    </button>
  );
}

describe("ToastProvider", () => {
  it("renders and dismisses toast notifications", async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Notify" }));

    expect(screen.getByText("User deleted")).toBeInTheDocument();
    expect(
      screen.getByText("The account was removed from auth."),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Dismiss notification" }),
    );

    expect(screen.queryByText("User deleted")).not.toBeInTheDocument();
  });
});
