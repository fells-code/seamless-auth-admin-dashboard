/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SearchInput from "./SearchInput";

describe("SearchInput", () => {
  it("forwards typed values and clear actions", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <SearchInput value="" onChange={onChange} placeholder="Search users" />,
    );

    await user.type(screen.getByPlaceholderText("Search users"), "a");

    expect(onChange).toHaveBeenNthCalledWith(1, "a");

    rerender(
      <SearchInput
        value="alex"
        onChange={onChange}
        placeholder="Search users"
      />,
    );

    expect(screen.getByDisplayValue("alex")).toBeInTheDocument();

    await user.click(screen.getByRole("button"));

    expect(onChange).toHaveBeenLastCalledWith("");
  });
});
