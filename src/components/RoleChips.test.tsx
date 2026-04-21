/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RoleChips from "./RoleChips";

describe("RoleChips", () => {
  it("adds and removes selected roles", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <RoleChips
        roles={["admin", "operator"]}
        selected={["operator"]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "admin" }));

    expect(onChange).toHaveBeenCalledWith(["operator", "admin"]);

    rerender(
      <RoleChips
        roles={["admin", "operator"]}
        selected={["operator"]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "operator" }));

    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});
