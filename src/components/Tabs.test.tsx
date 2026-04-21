/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Tabs from "./Tabs";

describe("Tabs", () => {
  it("renders tabs and changes the active tab", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Tabs
        tabs={["Profile", "Security", "Sessions"]}
        active="Profile"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Security" }));

    expect(onChange).toHaveBeenCalledWith("Security");
    expect(screen.getByRole("button", { name: "Profile" })).toHaveClass(
      "bg-surface",
    );
  });
});
