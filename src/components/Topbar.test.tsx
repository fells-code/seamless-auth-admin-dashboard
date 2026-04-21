/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Topbar from "./Topbar";

vi.mock("./UserMenu", () => ({
  default: () => <div>User menu</div>,
}));

describe("Topbar", () => {
  it("renders the user controls area", () => {
    render(<Topbar />);

    expect(screen.getByText("User menu")).toBeInTheDocument();
  });
});
