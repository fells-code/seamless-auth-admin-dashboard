/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditUserModal from "./EditUserModal";

const mutate = vi.hoisted(() => vi.fn());

vi.mock("../hooks/useRoles", () => ({
  useRoles: () => ({
    data: {
      roles: ["admin", "operator"],
    },
  }),
}));

vi.mock("../hooks/useUpdateUser", () => ({
  useUpdateUser: () => ({
    mutate,
  }),
}));

describe("EditUserModal", () => {
  beforeEach(() => {
    mutate.mockReset();
  });

  it("renders initial user values and saves edits", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    mutate.mockImplementation((_payload, options) => {
      options?.onSuccess?.();
    });

    render(
      <EditUserModal
        user={
          {
            id: "user_1",
            email: "alex@example.com",
            phone: "",
            roles: ["operator"],
          } as never
        }
        onClose={onClose}
      />,
    );

    const [emailInput, phoneInput] = screen.getAllByRole("textbox");

    expect(emailInput).toHaveDisplayValue("alex@example.com");

    await user.clear(emailInput);
    await user.type(emailInput, "alex.admin@example.com");
    await user.type(phoneInput, "+15550001111");
    await user.click(screen.getByRole("button", { name: "admin" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mutate).toHaveBeenCalledWith(
      {
        email: "alex.admin@example.com",
        phone: "+15550001111",
        roles: ["operator", "admin"],
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("closes without saving when cancel is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <EditUserModal
        user={
          {
            id: "user_1",
            email: "alex@example.com",
            phone: "",
            roles: ["operator"],
          } as never
        }
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });
});
