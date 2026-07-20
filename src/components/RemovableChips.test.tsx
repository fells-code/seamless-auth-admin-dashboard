/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RemovableChips from "./RemovableChips";

describe("RemovableChips", () => {
  it("removes only through the remove control, not by clicking the chip", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();

    render(<RemovableChips values={["user", "auditor"]} onRemove={onRemove} />);

    // Clicking the chip text must not delete anything.
    await user.click(screen.getByText("auditor"));
    expect(onRemove).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Remove auditor" }));
    expect(onRemove).toHaveBeenCalledWith("auditor");
  });

  it("names each remove control after its value", () => {
    render(<RemovableChips values={["user", "auditor"]} onRemove={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Remove user" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove auditor" }),
    ).toBeInTheDocument();
  });

  it("hides the remove controls when disabled", () => {
    render(<RemovableChips values={["user"]} onRemove={vi.fn()} disabled />);

    expect(screen.getByText("user")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("explains an empty set instead of rendering nothing", () => {
    render(
      <RemovableChips
        values={[]}
        onRemove={vi.fn()}
        emptyLabel="No roles yet."
      />,
    );

    expect(screen.getByText("No roles yet.")).toBeInTheDocument();
  });
});
