/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, Link, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUnsavedChangesGuard } from "./useUnsavedChangesGuard";

function Editor({ dirty }: { dirty: boolean }) {
  useUnsavedChangesGuard(dirty);

  return (
    <div>
      <span>Editor screen</span>
      <Link to="/elsewhere">Go elsewhere</Link>
    </div>
  );
}

function renderGuard(dirty: boolean) {
  const router = createMemoryRouter(
    [
      { path: "/editor", element: <Editor dirty={dirty} /> },
      { path: "/elsewhere", element: <div>Other screen</div> },
    ],
    { initialEntries: ["/editor"] },
  );

  return render(<RouterProvider router={router} />);
}

describe("useUnsavedChangesGuard", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lets navigation through when there is nothing staged", async () => {
    renderGuard(false);

    fireEvent.click(screen.getByRole("link", { name: "Go elsewhere" }));

    expect(await screen.findByText("Other screen")).toBeInTheDocument();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it("keeps the operator on the screen when they decline", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);

    renderGuard(true);

    fireEvent.click(screen.getByRole("link", { name: "Go elsewhere" }));

    // Navigating away previously discarded the whole staged draft with no
    // prompt at all.
    await waitFor(() => expect(window.confirm).toHaveBeenCalled());
    expect(screen.getByText("Editor screen")).toBeInTheDocument();
    expect(screen.queryByText("Other screen")).not.toBeInTheDocument();
  });

  it("proceeds when the operator accepts", async () => {
    vi.mocked(window.confirm).mockReturnValue(true);

    renderGuard(true);

    fireEvent.click(screen.getByRole("link", { name: "Go elsewhere" }));

    expect(await screen.findByText("Other screen")).toBeInTheDocument();
    expect(window.confirm).toHaveBeenCalled();
  });

  it("marks a reload as needing confirmation only while dirty", () => {
    const { unmount } = renderGuard(true);

    const dirtyEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirtyEvent);
    // beforeunload never reaches the router, so it needs its own handler.
    expect(dirtyEvent.defaultPrevented).toBe(true);

    unmount();
    renderGuard(false);

    const cleanEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);
  });
});
