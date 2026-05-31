/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useAuth } from "@seamless-auth/react";
import { Navigate, useLocation } from "react-router-dom";
import AuthLoading from "./AuthLoading";
import { getLastProtectedRoute, resolveProtectedRoute } from "../lib/lastRoute";
import { hasScopedRole } from "../lib/scopedRoles";

export default function PublicAuthRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  const redirectTo = resolveProtectedRoute(
    (location.state as { from?: unknown } | null)?.from,
    getLastProtectedRoute(),
  );

  if (loading || user === undefined) {
    return <AuthLoading />;
  }

  if (isAuthenticated && hasScopedRole(user?.roles, "admin:read")) {
    return <Navigate to={redirectTo} replace />;
  }

  if (isAuthenticated) {
    return (
      <Navigate to="/unauthenticated" replace state={{ from: redirectTo }} />
    );
  }

  return children;
}
