/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StatCard from "./StatCard";

describe("StatCard", () => {
  it("renders the label, value, and provided hint", () => {
    render(
      <StatCard label="Active sessions" value={14} hint="Last 24 hours" />,
    );

    expect(screen.getByText("Active sessions")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("Last 24 hours")).toBeInTheDocument();
  });

  it("falls back to the default hint when none is supplied", () => {
    render(<StatCard label="Signals" value="Live" />);

    expect(screen.getByText("Live operational signal")).toBeInTheDocument();
  });
});
