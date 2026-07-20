/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Dialog from "./Dialog";

function Fixture({ onClose = vi.fn() }: { onClose?: () => void }) {
  return (
    <Dialog title="Create User" description="Add a new user" onClose={onClose}>
      <>
        <input aria-label="Email" />
        <button>Cancel</button>
        <button>Create</button>
      </>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("announces itself as a modal dialog named by its heading", () => {
    render(<Fixture />);

    const dialog = screen.getByRole("dialog", { name: "Create User" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("moves focus into the dialog when it opens", () => {
    render(<Fixture />);

    expect(screen.getByLabelText("Email")).toHaveFocus();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Fixture onClose={onClose} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });

  it("closes when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<Fixture onClose={onClose} />);

    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as Element);

    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the backdrop out of the tab order", () => {
    const { container } = render(<Fixture />);

    // A focusable backdrop is a screen-sized tab stop with no visible target.
    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop?.tagName).not.toBe("BUTTON");
  });

  it("wraps focus at the end of the dialog instead of escaping to the page", async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    const email = screen.getByLabelText("Email");
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const create = screen.getByRole("button", { name: "Create" });

    expect(email).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
    await user.tab();
    expect(create).toHaveFocus();

    // Past the last control, focus returns to the first rather than leaving.
    await user.tab();
    expect(email).toHaveFocus();
  });

  it("wraps backwards from the first control", async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    expect(screen.getByLabelText("Email")).toHaveFocus();
    await user.tab({ shift: true });

    expect(screen.getByRole("button", { name: "Create" })).toHaveFocus();
  });

  it("locks page scroll while open and restores it on close", () => {
    const { unmount } = render(<Fixture />);

    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("returns focus to whatever opened it", async () => {
    const user = userEvent.setup();

    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          {open && <Fixture onClose={() => setOpen(false)} />}
        </>
      );
    }

    render(<Host />);
    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(trigger).toHaveFocus();
  });
});
