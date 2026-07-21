/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ConfirmProvider from "./ConfirmProvider";
import { useConfirm } from "../hooks/useConfirm";
import type { ConfirmOptions } from "../lib/confirmContext";

function Harness({
  options,
  onResult,
}: {
  options: ConfirmOptions;
  onResult: (confirmed: boolean) => void;
}) {
  const confirm = useConfirm();

  return (
    <button type="button" onClick={() => confirm(options).then(onResult)}>
      trigger
    </button>
  );
}

function renderHarness(
  options: ConfirmOptions,
  onResult: (confirmed: boolean) => void = vi.fn(),
) {
  render(
    <ConfirmProvider>
      <Harness options={options} onResult={onResult} />
    </ConfirmProvider>,
  );

  fireEvent.click(screen.getByRole("button", { name: "trigger" }));
}

describe("ConfirmProvider", () => {
  it("renders the title, description, and custom labels", async () => {
    renderHarness({
      title: "Delete user",
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Keep",
    });

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Delete user")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep" })).toBeInTheDocument();
  });

  it("falls back to Confirm and Cancel labels", async () => {
    renderHarness({ title: "Proceed?" });

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("resolves true and closes when confirmed", async () => {
    const onResult = vi.fn();
    renderHarness({ title: "Proceed?", confirmLabel: "Yes" }, onResult);

    fireEvent.click(await screen.findByRole("button", { name: "Yes" }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("resolves false when cancelled", async () => {
    const onResult = vi.fn();
    renderHarness({ title: "Proceed?", cancelLabel: "No" }, onResult);

    fireEvent.click(await screen.findByRole("button", { name: "No" }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("resolves false when dismissed with Escape", async () => {
    const onResult = vi.fn();
    renderHarness({ title: "Proceed?" }, onResult);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });

  it("styles the confirm control as destructive for the danger tone", async () => {
    renderHarness({ title: "Delete", confirmLabel: "Delete", tone: "danger" });

    expect(await screen.findByRole("button", { name: "Delete" })).toHaveClass(
      "btn-danger",
    );
  });
});
