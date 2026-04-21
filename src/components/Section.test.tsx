/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Section } from "./Section";

describe("Section", () => {
  it("renders title, description, actions, and content", () => {
    render(
      <Section
        title="Signals"
        description="Review recent security indicators."
        actions={<button>Refresh</button>}
      >
        <div>Section body</div>
      </Section>,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Signals" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Review recent security indicators."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.getByText("Section body")).toBeInTheDocument();
  });
});
