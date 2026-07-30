/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Unauthenticated from "./Unauthenticated";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock("@seamless-auth/react", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("../components/LayoutSkeleton", () => ({
  default: () => <div>Layout Skeleton</div>,
}));

function renderPage(state?: { from?: string }) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: "/unauthenticated", state: state ?? null }]}
    >
      <Routes>
        <Route path="/unauthenticated" element={<Unauthenticated />} />
        <Route path="/users" element={<div>Users Page</div>} />
        <Route path="/" element={<div>Root Page</div>} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Unauthenticated", () => {
  beforeEach(() => {
    mocks.useAuth.mockReset();
    sessionStorage.clear();
  });

  it("shows the skeleton while auth is still resolving", () => {
    mocks.useAuth.mockReturnValue({
      isAuthenticated: false,
      user: undefined,
      loading: true,
    });

    renderPage();

    expect(screen.getByText("Layout Skeleton")).toBeInTheDocument();
    expect(screen.queryByText("Access Required")).not.toBeInTheDocument();
  });

  it("sends an authenticated admin back to where they came from", () => {
    mocks.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: "1", roles: ["admin:read"] },
      loading: false,
    });

    renderPage({ from: "/users" });

    expect(screen.getByText("Users Page")).toBeInTheDocument();
  });

  it("tells an authenticated non-admin that they lack access", () => {
    mocks.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: "1", roles: ["support:read"] },
      loading: false,
    });

    renderPage();

    expect(
      screen.getByText("Your account does not have admin access."),
    ).toBeInTheDocument();
    // Signing in again as the same account would not help, so the action is
    // switching accounts rather than a plain Sign In.
    expect(
      screen.queryByRole("button", { name: "Sign In" }),
    ).not.toBeInTheDocument();
  });

  it("lets an account without admin access sign out and switch", async () => {
    const logout = vi.fn().mockResolvedValue({ data: null, error: null });
    mocks.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: "1", roles: ["support:read"] },
      loading: false,
      logout,
    });

    renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Use a different account" }),
    );

    // This screen renders outside the app layout, so there is no account menu
    // here; without this the only escape was clearing cookies.
    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(await screen.findByText("Login Page")).toBeInTheDocument();
  });

  it("offers sign in to a signed-out visitor", () => {
    mocks.useAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: false,
    });

    renderPage();

    expect(
      screen.getByText("Sign in with an admin account to continue."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });
});
