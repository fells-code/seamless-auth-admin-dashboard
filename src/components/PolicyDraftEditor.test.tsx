/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PolicyDraftEditor from "./PolicyDraftEditor";
import { makePolicy } from "../test/policyFixtures";

describe("PolicyDraftEditor", () => {
  it("edits a top-level setting", () => {
    const onChange = vi.fn();
    render(<PolicyDraftEditor value={makePolicy()} onChange={onChange} />);

    fireEvent.click(
      screen.getByRole("checkbox", { name: /phishing-resistant only/i }),
    );

    expect(onChange).toHaveBeenCalledWith(
      makePolicy({ phishing_resistant_only: true }),
    );
  });

  it("edits one field of a nested setting and keeps the rest", () => {
    const onChange = vi.fn();
    const policy = makePolicy();
    render(<PolicyDraftEditor value={policy} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Max Failures"), {
      target: { value: "5" },
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: /^account recovery/i }),
    );
    fireEvent.change(screen.getByLabelText("Recovery Delay"), {
      target: { value: "48h" },
    });

    expect(onChange).toHaveBeenCalledWith(
      makePolicy({
        lockout_policy: { ...policy.lockout_policy, maxFailures: 5 },
      }),
    );
    expect(onChange).toHaveBeenCalledWith(
      makePolicy({ account_recovery: { enabled: true, delay: "24h" } }),
    );
    expect(onChange).toHaveBeenCalledWith(
      makePolicy({ account_recovery: { enabled: false, delay: "48h" } }),
    );
  });

  it("edits the authenticator policy", () => {
    const onChange = vi.fn();
    const policy = makePolicy();
    render(<PolicyDraftEditor value={policy} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Synced Passkeys"), {
      target: { value: "block" },
    });

    expect(onChange).toHaveBeenCalledWith(
      makePolicy({
        authenticator_policy: {
          ...policy.authenticator_policy,
          syncedPasskeys: "block",
        },
      }),
    );
  });

  it("disables every control when read only", () => {
    render(
      <PolicyDraftEditor value={makePolicy()} onChange={vi.fn()} disabled />,
    );

    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).toBeDisabled();
    }
  });
});
