/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ThemeProvider from "./ThemeProvider";
import UserMenu from "./UserMenu";

type MockUser = {
  email: string;
  lastLogin: string;
} | null;

type AuthMenuState = {
  user: MockUser;
  logout: ReturnType<typeof vi.fn>;
};

const authState = vi.hoisted(() => ({
  value: {
    user: {
      email: "alex.operator@example.com",
      lastLogin: "2026-04-21T15:45:00.000Z",
    },
    logout: vi.fn(),
  } as AuthMenuState,
}));

const navigate = vi.hoisted(() => vi.fn());

vi.mock("@seamless-auth/react", () => ({
  useAuth: () => authState.value,
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();

  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

describe("UserMenu", () => {
  beforeEach(() => {
    navigate.mockReset();
    authState.value.logout.mockReset();
  });

  it("does not render when there is no authenticated user", () => {
    authState.value.user = null;

    const { container } = render(
      <MemoryRouter>
        <ThemeProvider>
          <UserMenu />
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("opens the menu, changes theme, navigates, and logs out", async () => {
    authState.value.user = {
      email: "alex.operator@example.com",
      lastLogin: "2026-04-21T15:45:00.000Z",
    };

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ThemeProvider>
          <UserMenu />
        </ThemeProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /alex.operator/i }));

    expect(screen.getByText("Appearance")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Winter/i }));

    expect(document.documentElement.dataset.theme).toBe("winter");

    await user.click(screen.getByRole("button", { name: "Profile" }));

    expect(navigate).toHaveBeenCalledWith("/profile");

    await user.click(screen.getByRole("button", { name: /alex.operator/i }));
    await user.click(screen.getByRole("button", { name: "Logout" }));

    expect(authState.value.logout).toHaveBeenCalled();
  });

  it("closes when clicking outside the menu", async () => {
    authState.value.user = {
      email: "alex.operator@example.com",
      lastLogin: "2026-04-21T15:45:00.000Z",
    };

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ThemeProvider>
          <div>
            <UserMenu />
            <button>Outside</button>
          </div>
        </ThemeProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /alex.operator/i }));

    expect(screen.getByText("Appearance")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("button", { name: "Outside" }));

    expect(screen.queryByText("Appearance")).not.toBeInTheDocument();
  });
});
