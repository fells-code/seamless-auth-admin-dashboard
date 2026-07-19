/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useAuth } from "@seamless-auth/react";
import { Navigate, useLocation } from "react-router-dom";
import AuthLoading from "./AuthLoading";
import { useState, useEffect } from "react";
import { saveLastProtectedRoute } from "../lib/lastRoute";
import { hasScopedRole } from "../lib/scopedRoles";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user, loading } = useAuth();
  const [ready, setReady] = useState(false);
  const location = useLocation();

  const currentPath = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    if (user === undefined) {
      return;
    }

    // Flip on the next animation frame so the opacity-0 state paints first and
    // the fade-in transition actually runs, rather than relying on a fixed delay.
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [user]);

  useEffect(() => {
    saveLastProtectedRoute(currentPath);
  }, [currentPath]);

  if (loading || user === undefined) {
    return <AuthLoading />;
  }

  // UX-only guard: the Seamless Auth API is the real enforcement point. This
  // redirect just avoids showing an admin shell to users who cannot use it.
  if (!isAuthenticated || !hasScopedRole(user?.roles, "admin:read")) {
    return (
      <Navigate to="/unauthenticated" replace state={{ from: currentPath }} />
    );
  }

  return (
    <div
      className={`transition-opacity duration-300 ${
        ready ? "opacity-100" : "opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
