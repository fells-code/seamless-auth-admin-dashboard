/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateUserModal from "./CreateUserModal";

const mutate = vi.hoisted(() => vi.fn());

vi.mock("../hooks/useRoles", () => ({
  useRoles: () => ({
    data: {
      roles: ["admin", "operator"],
    },
  }),
}));

vi.mock("../hooks/useCreateUser", () => ({
  useCreateUser: () => ({
    mutate,
  }),
}));

describe("CreateUserModal", () => {
  beforeEach(() => {
    mutate.mockReset();
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

    expect(mutate).toHaveBeenCalledWith(
      {
        email: "new.user@example.com",
        phone: "+15551234567",
        roles: ["admin"],
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );
    expect(onClose).toHaveBeenCalled();
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
});
