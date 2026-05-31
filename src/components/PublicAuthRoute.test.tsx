/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import PublicAuthRoute from "./PublicAuthRoute";

type AuthState = {
  isAuthenticated: boolean;
  user: unknown;
  loading: boolean;
};

const authState = vi.hoisted(() => ({
  value: {
    isAuthenticated: false,
    user: null,
    loading: false,
  } as AuthState,
}));

vi.mock("@seamless-auth/react", () => ({
  useAuth: () => authState.value,
}));

vi.mock("./AuthLoading", () => ({
  default: () => <div>Auth Loading</div>,
}));

function Marker({ label }: { label: string }) {
  const location = useLocation();

  return <div>{`${label}:${location.state?.from ?? "none"}`}</div>;
}

function renderRoute(from?: string) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/login", state: { from } }]}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicAuthRoute>
              <div>Public sign-in</div>
            </PublicAuthRoute>
          }
        />
        <Route path="/users" element={<Marker label="Users" />} />
        <Route path="/sessions" element={<Marker label="Sessions" />} />
        <Route
          path="/unauthenticated"
          element={<Marker label="Unauthenticated" />}
        />
        <Route path="/" element={<Marker label="Overview" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PublicAuthRoute", () => {
  afterEach(() => {
    authState.value = {
      isAuthenticated: false,
      user: null,
      loading: false,
    };
    sessionStorage.clear();
  });

  it("renders public auth content for unauthenticated visitors", () => {
    renderRoute("/users");

    expect(screen.getByText("Public sign-in")).toBeInTheDocument();
  });

  it("shows the auth loading state while auth is unresolved", () => {
    authState.value = {
      isAuthenticated: false,
      user: undefined,
      loading: true,
    };

    renderRoute("/users");

    expect(screen.getByText("Auth Loading")).toBeInTheDocument();
  });

  it("redirects authenticated admins to the protected destination", () => {
    authState.value = {
      isAuthenticated: true,
      user: { id: "1", roles: ["admin:read"] },
      loading: false,
    };

    renderRoute("/users");

    expect(screen.getByText("Users:none")).toBeInTheDocument();
  });

  it("redirects authenticated non-admins to the access-required page", () => {
    authState.value = {
      isAuthenticated: true,
      user: { id: "1", roles: ["user"] },
      loading: false,
    };

    renderRoute("/sessions");

    expect(screen.getByText("Unauthenticated:/sessions")).toBeInTheDocument();
  });

  it("does not redirect authenticated admins back to public auth pages", () => {
    authState.value = {
      isAuthenticated: true,
      user: { id: "1", roles: ["admin:read"] },
      loading: false,
    };
    sessionStorage.setItem("last-protected-route", "/login");

    renderRoute("/verify-magiclink?token=abc");

    expect(screen.getByText("Overview:none")).toBeInTheDocument();
  });
});
