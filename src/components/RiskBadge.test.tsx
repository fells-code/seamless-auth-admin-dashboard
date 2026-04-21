/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RiskBadge from "./RiskBadge";

describe("RiskBadge", () => {
  it("renders the supplied level and color styling", () => {
    const { container } = render(<RiskBadge level="HIGH" color="red" />);

    const badge = container.firstChild;

    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(badge).toHaveClass("text-[var(--highlight)]");
  });
});
