/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "./ErrorBoundary";

function Boom({ shouldThrow }: { shouldThrow: boolean }): React.ReactElement {
  if (shouldThrow) {
    throw new Error("render exploded");
  }

  return <div>Screen content</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React logs the caught error itself, which would otherwise flood the run.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders its children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Screen content")).toBeInTheDocument();
  });

  it("shows a recoverable state instead of unmounting the tree", () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>,
    );

    // Without a boundary this render error blanks the whole console.
    expect(
      screen.getByText("This screen could not be displayed"),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  it("recovers when retried after the cause is gone", () => {
    function Harness() {
      const [shouldThrow, setShouldThrow] = React.useState(true);

      return (
        <>
          <button onClick={() => setShouldThrow(false)}>Fix it</button>
          <ErrorBoundary>
            <Boom shouldThrow={shouldThrow} />
          </ErrorBoundary>
        </>
      );
    }

    render(<Harness />);

    expect(
      screen.getByText("This screen could not be displayed"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fix it" }));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("Screen content")).toBeInTheDocument();
  });

  it("clears a caught error when the reset key changes", () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/system">
        <Boom shouldThrow />
      </ErrorBoundary>,
    );

    expect(
      screen.getByText("This screen could not be displayed"),
    ).toBeInTheDocument();

    // Navigating away must not leave the console pinned to the broken screen.
    rerender(
      <ErrorBoundary resetKey="/users">
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Screen content")).toBeInTheDocument();
  });
});
