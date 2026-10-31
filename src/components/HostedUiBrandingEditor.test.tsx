/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import type { HostedUi } from "@seamless-auth/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HostedUiForm } from "../lib/hostedUi";
import HostedUiBrandingEditor from "./HostedUiBrandingEditor";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  useUpdateSystemConfig: vi.fn(),
}));

vi.mock("../hooks/useUpdateSystemConfig", () => ({
  useUpdateSystemConfig: mocks.useUpdateSystemConfig,
}));

const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
const confirm = vi.fn();
const ensureStepUp = vi.fn();

function Harness({
  stored = null,
  canWrite = true,
}: {
  stored?: HostedUi | null;
  canWrite?: boolean;
}) {
  const [draft, setDraft] = useState<HostedUiForm | null>(null);

  return (
    <HostedUiBrandingEditor
      stored={stored}
      defaultAppName="Seamless Auth"
      draft={draft}
      onDraftChange={setDraft}
      canWrite={canWrite}
      ensureStepUp={ensureStepUp}
      toast={toast as never}
      confirm={confirm}
    />
  );
}

const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Save Branding" }));

describe("HostedUiBrandingEditor", () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.useUpdateSystemConfig.mockReturnValue({
      mutate: mocks.mutate,
      isPending: false,
    });
    toast.success.mockReset();
    toast.error.mockReset();
    confirm.mockReset().mockResolvedValue(true);
    ensureStepUp.mockReset().mockResolvedValue(true);
  });

  it("previews the sign-in and consent pages with the default name", () => {
    render(<Harness />);

    expect(
      screen.getByRole("figure", { name: "Sign-in page preview" }),
    ).toHaveTextContent("Sign in to Seamless Auth");
    expect(
      screen.getByRole("figure", { name: "Consent page preview" }),
    ).toHaveTextContent("Signed in to Seamless Auth");
  });

  it("updates the preview as the brand name changes", () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText("Brand Name"), {
      target: { value: "Acme" },
    });

    expect(
      screen.getByRole("figure", { name: "Sign-in page preview" }),
    ).toHaveTextContent("Sign in to Acme");
  });

  it("sends the whole branding object after step-up", async () => {
    render(<Harness stored={{ appName: "Acme", colors: { text: "#111" } }} />);

    fireEvent.change(screen.getByLabelText("Primary"), {
      target: { value: "#0b3d91" },
    });
    save();

    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));
    expect(ensureStepUp).toHaveBeenCalled();
    expect(mocks.mutate.mock.calls[0][0]).toEqual({
      hosted_ui: {
        appName: "Acme",
        colors: { text: "#111", primary: "#0b3d91" },
      },
    });

    mocks.mutate.mock.calls[0][1].onSuccess();
    expect(toast.success).toHaveBeenCalledWith(
      "Branding saved",
      expect.any(String),
    );
  });

  it("sets a color from the picker and keeps the hex field in step", () => {
    render(<Harness />);

    fireEvent.input(screen.getByLabelText("Surface color picker"), {
      target: { value: "#fafafa" },
    });

    expect(screen.getByLabelText("Surface")).toHaveValue("#fafafa");
  });

  it("shows field errors and does not save an invalid form", async () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText("Logo URL"), {
      target: { value: "http://cdn.acme.test/logo.png" },
    });
    fireEvent.change(screen.getByLabelText("Muted Text"), {
      target: { value: "grey" },
    });
    save();

    expect(
      await screen.findByText(
        "Enter an https URL of 2048 characters or fewer.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Muted Text")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(ensureStepUp).not.toHaveBeenCalled();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("clears a field error once that field is edited", async () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText("Text"), {
      target: { value: "nope" },
    });
    save();
    expect(await screen.findByText(/Use a hex color/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Text"), {
      target: { value: "#222" },
    });

    expect(screen.queryByText(/Use a hex color/)).not.toBeInTheDocument();
  });

  it("does not save when step-up is declined", async () => {
    ensureStepUp.mockResolvedValue(false);
    render(<Harness />);

    fireEvent.change(screen.getByLabelText("Brand Name"), {
      target: { value: "Acme" },
    });
    save();

    await waitFor(() => expect(ensureStepUp).toHaveBeenCalled());
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("reports a failed save", async () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText("Brand Name"), {
      target: { value: "Acme" },
    });
    save();

    await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
    mocks.mutate.mock.calls[0][1].onError(new Error("boom"));

    expect(toast.error).toHaveBeenCalledWith(
      "Could not save branding",
      expect.any(String),
    );
  });

  it("warns about low contrast without blocking the save", async () => {
    render(<Harness />);

    expect(screen.queryByText(/below WCAG 2.2 AA/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Primary"), {
      target: { value: "#ffd400" },
    });

    expect(
      screen.getByText("2 color pairs are below WCAG 2.2 AA"),
    ).toBeInTheDocument();
    const checks = screen.getByRole("list", { name: "Contrast checks" });
    expect(checks).toHaveTextContent(/On primary text on primary.*below 4.5:1/);
    expect(checks).toHaveTextContent(/Primary controls on surface.*below 3:1/);

    save();
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
  });

  it("says custom colors turn off the dark palette", () => {
    render(<Harness />);

    expect(
      screen.getByText(/follow the visitor's dark mode preference/),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Background"), {
      target: { value: "#fff" },
    });

    expect(
      screen.getByText(/built-in dark palette is turned off/),
    ).toBeInTheDocument();
  });

  it("previews a valid logo and explains one that fails to load", () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText("Logo URL"), {
      target: { value: "https://cdn.acme.test/logo.svg" },
    });

    const preview = screen.getByRole("img", { name: "Logo preview" });
    expect(preview).toHaveAttribute("src", "https://cdn.acme.test/logo.svg");
    expect(
      screen.getAllByRole("img", { name: "Seamless Auth logo" }),
    ).toHaveLength(2);

    fireEvent.error(preview);

    expect(
      screen.getByText(/The logo could not be loaded here/),
    ).toBeInTheDocument();
  });

  it("does not load a logo URL the API would refuse", () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText("Logo URL"), {
      target: { value: "http://cdn.acme.test/logo.svg" },
    });

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("undoes unsaved edits", () => {
    render(<Harness stored={{ appName: "Acme" }} />);

    fireEvent.change(screen.getByLabelText("Brand Name"), {
      target: { value: "Other" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Undo Branding Edits" }),
    );

    expect(screen.getByLabelText("Brand Name")).toHaveValue("Acme");
    expect(
      screen.getByRole("button", { name: "Save Branding" }),
    ).toBeDisabled();
  });

  it("resets to defaults by writing null after confirmation", async () => {
    render(<Harness stored={{ appName: "Acme" }} />);

    fireEvent.click(screen.getByRole("button", { name: "Reset to Defaults" }));

    await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Reset branding" }),
    );
    expect(mocks.mutate.mock.calls[0][0]).toEqual({ hosted_ui: null });
  });

  it("does not reset when the confirmation is declined", async () => {
    confirm.mockResolvedValue(false);
    render(<Harness stored={{ appName: "Acme" }} />);

    fireEvent.click(screen.getByRole("button", { name: "Reset to Defaults" }));

    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(ensureStepUp).not.toHaveBeenCalled();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("offers no reset while the defaults are already in use", () => {
    render(<Harness />);

    expect(
      screen.getByRole("button", { name: "Reset to Defaults" }),
    ).toBeDisabled();
  });

  it("is read only without write access", () => {
    render(<Harness stored={{ appName: "Acme" }} canWrite={false} />);

    expect(screen.getByLabelText("Brand Name")).toBeDisabled();
    expect(screen.getByLabelText("Primary")).toBeDisabled();
    expect(screen.getByLabelText("Primary color picker")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Save Branding" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Reset to Defaults" }),
    ).toBeDisabled();
  });
});
