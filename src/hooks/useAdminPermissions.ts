/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useAuth } from "@seamless-auth/react";
import { hasScopedRole } from "../lib/scopedRoles";

// UX-only: these flags toggle controls in the UI. The Seamless Auth API still
// authorizes every request, so a spoofed flag grants no real access.
export function useAdminPermissions() {
  const { user } = useAuth();

  return {
    canRead: hasScopedRole(user?.roles, "admin:read"),
    canWrite: hasScopedRole(user?.roles, "admin:write"),
  };
}
