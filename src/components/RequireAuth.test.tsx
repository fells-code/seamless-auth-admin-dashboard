/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import RequireAuth from "./RequireAuth";

type AuthState = {
  isAuthenticated: boolean;
  user: unknown;
  hasRole: (role: string) => boolean;
  loading: boolean;
};

const authState = vi.hoisted(() => ({
  value: {
    isAuthenticated: false,
    user: undefined,
    hasRole: () => false,
    loading: true,
  } as AuthState,
}));

const saveLastProtectedRoute = vi.hoisted(() => vi.fn());

vi.mock("@seamless-auth/react", () => ({
  useAuth: () => authState.value,
}));

vi.mock("./AuthLoading", () => ({
  default: () => <div>Auth Loading</div>,
}));

vi.mock("../lib/lastRoute", () => ({
  saveLastProtectedRoute,
}));

function UnauthenticatedMarker() {
  const location = useLocation();

  return <div>{`Redirected:${location.state?.from ?? "none"}`}</div>;
}

describe("RequireAuth", () => {
  afterEach(() => {
    vi.useRealTimers();
    saveLastProtectedRoute.mockReset();
  });

  it("shows the auth loading state while auth is unresolved", () => {
    authState.value = {
      isAuthenticated: false,
      user: undefined,
      hasRole: () => false,
      loading: true,
    };

    render(
      <MemoryRouter initialEntries={["/users?query=alex"]}>
        <Routes>
          <Route
            path="/users"
            element={
              <RequireAuth>
                <div>Secret</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Auth Loading")).toBeInTheDocument();
    expect(saveLastProtectedRoute).toHaveBeenCalledWith("/users?query=alex");
  });

  it("redirects non-admin users to the unauthenticated route", () => {
    authState.value = {
      isAuthenticated: true,
      user: { id: "1" },
      hasRole: () => false,
      loading: false,
    };

    render(
      <MemoryRouter initialEntries={["/security#signals"]}>
        <Routes>
          <Route
            path="/security"
            element={
              <RequireAuth>
                <div>Secret</div>
              </RequireAuth>
            }
          />
          <Route path="/unauthenticated" element={<UnauthenticatedMarker />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Redirected:/security#signals"),
    ).toBeInTheDocument();
  });

  it("renders admin content and fades it in after the ready delay", () => {
    vi.useFakeTimers();
    authState.value = {
      isAuthenticated: true,
      user: { id: "1" },
      hasRole: (role: string) => role === "admin",
      loading: false,
    };

    const { container } = render(
      <MemoryRouter initialEntries={["/events"]}>
        <Routes>
          <Route
            path="/events"
            element={
              <RequireAuth>
                <div>Secret</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Secret")).toBeInTheDocument();
    expect(container.querySelector(".opacity-0")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(container.querySelector(".opacity-100")).toBeInTheDocument();
  });
});
