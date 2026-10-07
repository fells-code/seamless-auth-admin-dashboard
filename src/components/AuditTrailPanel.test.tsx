/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuditTrailPanel from "./AuditTrailPanel";

const mocks = vi.hoisted(() => ({
  useVerifyAuditTrail: vi.fn(),
  useExportAuditTrail: vi.fn(),
  ensureStepUp: vi.fn(),
  verify: vi.fn(),
  exportTrail: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("../hooks/useAuditTrail", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../hooks/useAuditTrail")>()),
  useVerifyAuditTrail: mocks.useVerifyAuditTrail,
  useExportAuditTrail: mocks.useExportAuditTrail,
}));
vi.mock("../hooks/useStepUpGuard", () => ({
  useStepUpGuard: () => mocks.ensureStepUp,
}));
vi.mock("../hooks/useToast", () => ({
  useToast: () => ({ success: mocks.toastSuccess }),
}));

const HEAD = "ab".repeat(32);

function verifyState(overrides: Record<string, unknown> = {}) {
  return {
    mutate: mocks.verify,
    isPending: false,
    isError: false,
    data: undefined,
    ...overrides,
  };
}

describe("AuditTrailPanel", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.useVerifyAuditTrail.mockReturnValue(verifyState());
    mocks.useExportAuditTrail.mockReturnValue({
      mutate: mocks.exportTrail,
      isPending: false,
      isError: false,
    });
    mocks.ensureStepUp.mockResolvedValue(true);
  });

  it("runs the integrity check on request", () => {
    render(<AuditTrailPanel />);

    fireEvent.click(screen.getByRole("button", { name: /verify integrity/i }));

    expect(mocks.verify).toHaveBeenCalled();
  });

  it("shows a verified trail with the head to record elsewhere", () => {
    mocks.useVerifyAuditTrail.mockReturnValue(
      verifyState({
        data: {
          verified: true,
          checkedAt: "2026-10-07T12:00:00.000Z",
          rowsChecked: 1200,
          firstSeq: 1,
          lastSeq: 1200,
          anchorHash: null,
          head: { seq: 1200, hash: HEAD },
          firstFailure: null,
        },
      }),
    );

    render(<AuditTrailPanel />);

    expect(
      screen.getByText(/audit trail verified: 1200 events/i),
    ).toBeInTheDocument();
    expect(screen.getByText(`event 1200, ${HEAD}`)).toBeInTheDocument();
    expect(screen.getByText("start of the trail")).toBeInTheDocument();
  });

  it("explains a broken trail as an incident", () => {
    mocks.useVerifyAuditTrail.mockReturnValue(
      verifyState({
        data: {
          verified: false,
          checkedAt: "2026-10-07T12:00:00.000Z",
          rowsChecked: 1200,
          firstSeq: 1,
          lastSeq: 1200,
          anchorHash: null,
          head: { seq: 1200, hash: HEAD },
          firstFailure: { seq: 42, id: "event-42", reason: "hash_mismatch" },
        },
      }),
    );

    render(<AuditTrailPanel />);

    expect(
      screen.getByText("Audit trail failed verification at event 42"),
    ).toBeInTheDocument();
    expect(screen.getByText(/was edited/)).toBeInTheDocument();
  });

  it("steps up before exporting, then exports the chosen days", async () => {
    render(<AuditTrailPanel />);

    fireEvent.change(screen.getByLabelText("From (UTC)"), {
      target: { value: "2026-01-01" },
    });
    fireEvent.change(screen.getByLabelText("To (UTC, included)"), {
      target: { value: "2026-01-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: /export events/i }));

    await waitFor(() => expect(mocks.exportTrail).toHaveBeenCalled());
    expect(mocks.ensureStepUp).toHaveBeenCalled();
    expect(mocks.exportTrail.mock.calls[0]![0]).toEqual({
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-02-01T00:00:00.000Z",
    });
  });

  it("does not export when step-up is not completed", async () => {
    mocks.ensureStepUp.mockResolvedValue(false);
    render(<AuditTrailPanel />);

    fireEvent.click(screen.getByRole("button", { name: /export events/i }));

    await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalled());
    expect(mocks.exportTrail).not.toHaveBeenCalled();
  });

  it("refuses a period that ends before it starts", () => {
    render(<AuditTrailPanel />);

    fireEvent.change(screen.getByLabelText("To (UTC, included)"), {
      target: { value: "2026-01-01" },
    });
    fireEvent.change(screen.getByLabelText("From (UTC)"), {
      target: { value: "2026-02-01" },
    });

    expect(
      screen.getByRole("button", { name: /export events/i }),
    ).toBeDisabled();
  });

  it("reports an export failure", () => {
    mocks.useExportAuditTrail.mockReturnValue({
      mutate: mocks.exportTrail,
      isPending: false,
      isError: true,
      error: new Error("Step-up required"),
    });

    render(<AuditTrailPanel />);

    expect(screen.getByText("Export failed")).toBeInTheDocument();
  });
});
