/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateUserModal from "./CreateUserModal";

const mutate = vi.hoisted(() => vi.fn());
const ensureStepUp = vi.hoisted(() => vi.fn());
const rolesQuery = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));
const createUserState = vi.hoisted(() => ({ isPending: false }));

vi.mock("../hooks/useRoles", () => ({
  useRoles: () => rolesQuery.current,
}));

vi.mock("../hooks/useCreateUser", () => ({
  useCreateUser: () => ({
    mutate,
    get isPending() {
      return createUserState.isPending;
    },
  }),
}));

vi.mock("../hooks/useStepUpGuard", () => ({
  useStepUpGuard: () => ensureStepUp,
}));

describe("CreateUserModal", () => {
  beforeEach(() => {
    mutate.mockReset();
    ensureStepUp.mockReset();
    ensureStepUp.mockResolvedValue(true);
    createUserState.isPending = false;
    rolesQuery.current = {
      data: { roles: ["admin", "operator"] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
  });

  it("submits the new user values and closes on success", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    mutate.mockImplementation((_payload, options) => {
      options?.onSuccess?.();
    });

    render(<CreateUserModal onClose={onClose} />);

    const [emailInput, phoneInput] = screen.getAllByRole("textbox");

    await user.type(emailInput, "new.user@example.com");
    await user.type(phoneInput, "+15551234567");
    await user.click(screen.getByRole("button", { name: "admin" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        {
          email: "new.user@example.com",
          phone: "+15551234567",
          roles: ["admin"],
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
        }),
      ),
    );
    expect(ensureStepUp).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("does not create a user when step-up fails", async () => {
    const user = userEvent.setup();
    ensureStepUp.mockResolvedValue(false);

    render(<CreateUserModal onClose={vi.fn()} />);

    const [emailInput] = screen.getAllByRole("textbox");
    await user.type(emailInput, "new.user@example.com");
    await user.click(screen.getByRole("button", { name: "admin" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(ensureStepUp).toHaveBeenCalled());
    expect(mutate).not.toHaveBeenCalled();
  });

  it("closes from cancel and backdrop actions", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<CreateUserModal onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(container.querySelector(".absolute.inset-0")!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("associates every field with its visible label", () => {
    render(<CreateUserModal onClose={vi.fn()} />);

    // getByLabelText resolves the accessible name the way a screen reader does,
    // so this fails if the label is rendered but not associated with the input.
    for (const name of [/email/i, /phone/i]) {
      const field = screen.getByLabelText(name);
      expect(field.tagName).toBe("INPUT");
    }
  });

  it("surfaces a roles load failure with a retry", async () => {
    const refetch = vi.fn();
    rolesQuery.current = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Roles endpoint unreachable"),
      refetch,
    };

    const user = userEvent.setup();
    render(<CreateUserModal onClose={vi.fn()} />);

    // Previously this rendered an empty roles area and a disabled submit with
    // no explanation, leaving the dialog unusable and unrecoverable.
    expect(screen.getByText("Roles could not be loaded")).toBeInTheDocument();
    expect(screen.getByText("Roles endpoint unreachable")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("distinguishes an empty role set from a failed load", () => {
    rolesQuery.current = {
      data: { roles: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    render(<CreateUserModal onClose={vi.fn()} />);

    expect(screen.getByText("No roles are configured")).toBeInTheDocument();
    expect(
      screen.queryByText("Roles could not be loaded"),
    ).not.toBeInTheDocument();
  });

  it("shows progress for the request itself, not just verification", () => {
    createUserState.isPending = true;

    render(<CreateUserModal onClose={vi.fn()} />);

    // The control used to return to its normal label while the request was in
    // flight, so the dialog looked stalled.
    expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
  });
});
