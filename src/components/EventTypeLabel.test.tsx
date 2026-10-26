/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EventTypeLabel from "./EventTypeLabel";

describe("EventTypeLabel", () => {
  it("shows the readable name with the raw type beneath it", () => {
    render(<EventTypeLabel type="policy_published" />);

    expect(screen.getByText("Policy published")).toBeInTheDocument();
    expect(screen.getByText("policy_published")).toBeInTheDocument();
    expect(screen.queryByText("High severity")).not.toBeInTheDocument();
  });

  it("marks break-glass events as high severity", () => {
    render(<EventTypeLabel type="break_glass_sign_in" />);

    expect(screen.getByText("Break-glass sign-in")).toBeInTheDocument();
    expect(screen.getByText("High severity")).toBeInTheDocument();
  });

  it("marks any event the API flags as high severity", () => {
    render(
      <EventTypeLabel
        type="break_glass_enrollment"
        metadata={{ severity: "high" }}
      />,
    );

    expect(screen.getByText("High severity")).toBeInTheDocument();
  });
});
