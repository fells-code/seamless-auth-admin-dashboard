/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAdminPermissions } from "./useAdminPermissions";

const authState = vi.hoisted(() => ({
  value: { user: undefined as unknown },
}));

vi.mock("@seamless-auth/react", () => ({
  useAuth: () => authState.value,
}));

function permissionsFor(user: unknown) {
  authState.value = { user };
  return renderHook(() => useAdminPermissions()).result.current;
}

describe("useAdminPermissions", () => {
  it("grants read only for an admin:read role", () => {
    expect(permissionsFor({ roles: ["admin:read"] })).toEqual({
      canRead: true,
      canWrite: false,
    });
  });

  it("treats admin:write as covering read", () => {
    expect(permissionsFor({ roles: ["admin:write"] })).toEqual({
      canRead: true,
      canWrite: true,
    });
  });

  it("grants both through a wildcard admin role", () => {
    expect(permissionsFor({ roles: ["admin:*"] })).toEqual({
      canRead: true,
      canWrite: true,
    });
  });

  it("denies everything for unrelated roles", () => {
    expect(permissionsFor({ roles: ["support:read"] })).toEqual({
      canRead: false,
      canWrite: false,
    });
  });

  it("denies everything when there is no signed-in user", () => {
    expect(permissionsFor(undefined)).toEqual({
      canRead: false,
      canWrite: false,
    });
  });
});
