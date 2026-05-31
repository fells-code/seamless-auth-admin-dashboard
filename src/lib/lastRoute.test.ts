/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  getLastProtectedRoute,
  resolveProtectedRoute,
  saveLastProtectedRoute,
} from "./lastRoute";

describe("lastRoute helpers", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("saves protected routes", () => {
    saveLastProtectedRoute("/users?query=alex#details");

    expect(getLastProtectedRoute()).toBe("/users?query=alex#details");
  });

  it("ignores public auth and empty paths", () => {
    saveLastProtectedRoute("/sessions");
    saveLastProtectedRoute("");
    saveLastProtectedRoute("/unauthenticated");
    saveLastProtectedRoute("/login");
    saveLastProtectedRoute("/verify-magiclink?token=abc");
    saveLastProtectedRoute("/registerPasskey");

    expect(getLastProtectedRoute()).toBe("/sessions");
  });

  it("falls back to the overview route when nothing valid is stored", () => {
    expect(getLastProtectedRoute()).toBe("/");

    sessionStorage.setItem("last-protected-route", "/unauthenticated");

    expect(getLastProtectedRoute()).toBe("/");

    sessionStorage.setItem("last-protected-route", "/login?from=/users");

    expect(getLastProtectedRoute()).toBe("/");
  });

  it("resolves route state only when it points at a protected route", () => {
    expect(resolveProtectedRoute("/users/1", "/sessions")).toBe("/users/1");
    expect(resolveProtectedRoute("/login", "/sessions")).toBe("/sessions");
    expect(resolveProtectedRoute("https://example.com", "/sessions")).toBe(
      "/sessions",
    );
    expect(resolveProtectedRoute("//example.com", "/sessions")).toBe(
      "/sessions",
    );
  });
});
