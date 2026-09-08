/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { tabId, tabPanelId } from "../lib/tabIds";
import Tabs from "./Tabs";

const TABS = ["Profile", "Security", "Sessions"];

function renderTabs(onChange = vi.fn(), active = "Profile") {
  render(
    <Tabs idBase="user" tabs={TABS} active={active} onChange={onChange} />,
  );

  return onChange;
}

/** Arrow keys move focus, so the strip needs to reflect the selection it drives. */
function ControlledTabs() {
  const [active, setActive] = useState("Profile");

  return (
    <>
      <Tabs idBase="user" tabs={TABS} active={active} onChange={setActive} />
      <div
        id={tabPanelId("user")}
        role="tabpanel"
        aria-labelledby={tabId("user", active)}
      >
        {active} panel
      </div>
    </>
  );
}

describe("Tabs", () => {
  it("exposes the strip as a tablist with the active tab selected", () => {
    renderTabs();

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);

    expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Security" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("points each tab at the panel it controls", () => {
    renderTabs();

    expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute(
      "id",
      tabId("user", "Profile"),
    );
    expect(screen.getByRole("tab", { name: "Security" })).toHaveAttribute(
      "aria-controls",
      tabPanelId("user"),
    );
  });

  it("keeps only the active tab in the tab order", () => {
    renderTabs(vi.fn(), "Security");

    expect(screen.getByRole("tab", { name: "Security" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("falls back to the first tab when the active value is unknown", () => {
    renderTabs(vi.fn(), "Unknown");

    expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute(
      "tabindex",
      "0",
    );
  });

  it("changes the active tab on click", async () => {
    const user = userEvent.setup();
    const onChange = renderTabs();

    await user.click(screen.getByRole("tab", { name: "Security" }));

    expect(onChange).toHaveBeenCalledWith("Security");
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveClass(
      "bg-surface",
    );
  });

  it("moves through the tabs with the arrow keys, wrapping at both ends", async () => {
    const user = userEvent.setup();

    render(<ControlledTabs />);

    await user.tab();
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Security" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Security" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Sessions" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveFocus();
  });

  it("jumps to the first and last tab with Home and End", async () => {
    const user = userEvent.setup();

    render(<ControlledTabs />);

    await user.tab();
    await user.keyboard("{End}");

    expect(screen.getByRole("tab", { name: "Sessions" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Sessions");

    await user.keyboard("{Home}");

    expect(screen.getByRole("tab", { name: "Profile" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Profile");
  });

  it("leaves other keys alone", async () => {
    const user = userEvent.setup();
    const onChange = renderTabs();

    await user.tab();
    await user.keyboard("{ArrowDown}");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveFocus();
  });
});
