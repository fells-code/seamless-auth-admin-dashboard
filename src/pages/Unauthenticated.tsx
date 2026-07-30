/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useState } from "react";
import { useAuth } from "@seamless-auth/react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import LayoutSkeleton from "../components/LayoutSkeleton";
import { getLastProtectedRoute, resolveProtectedRoute } from "../lib/lastRoute";
import { hasScopedRole } from "../lib/scopedRoles";

export default function Unauthenticated() {
  const { isAuthenticated, user, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const redirectTo = resolveProtectedRoute(
    (location.state as { from?: unknown } | null)?.from,
    getLastProtectedRoute(),
  );

  if (loading || user === undefined) {
    return <LayoutSkeleton />;
  }

  const hasAdminReadAccess = hasScopedRole(user?.roles, "admin:read");

  if (isAuthenticated && hasAdminReadAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  // Sign out regardless of what logout reports. A failed logout still means the
  // operator wants a different account, and the sign-in screen is where they
  // recover from either outcome.
  const signOutAndSwitch = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
      navigate("/login", { replace: true, state: { from: redirectTo } });
    }
  };

  return (
    <div className="relative h-screen flex items-center justify-center bg-base text-primary">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(229,127,96,0.12),transparent_60%)]" />
        <div className="absolute right-10 bottom-10 h-72 w-72 rounded-full bg-[rgba(63,98,106,0.08)] blur-3xl" />
      </div>

      <div className="relative w-full max-w-md rounded-xl border border-subtle bg-surface p-8 shadow-lg text-center space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Access Required
          </h1>

          <p className="text-muted text-sm">Seamless Auth Dashboard</p>
        </div>

        {isAuthenticated && !hasAdminReadAccess ? (
          <div role="alert" className="text-sm text-[var(--highlight)]">
            Your account does not have admin access.
          </div>
        ) : (
          <div className="text-sm text-muted">
            Sign in with an admin account to continue.
          </div>
        )}

        {/* Action. This screen renders outside the app layout, so there is no
            account menu here. Without an explicit action, someone who signed in
            with the wrong account had no in-app way out and had to clear
            cookies to try another one. */}
        {isAuthenticated ? (
          <button
            onClick={() => void signOutAndSwitch()}
            disabled={signingOut}
            className="btn btn-primary w-full disabled:opacity-50"
          >
            {signingOut ? "Signing out..." : "Use a different account"}
          </button>
        ) : (
          <button
            onClick={() => navigate("/login", { state: { from: redirectTo } })}
            className="btn btn-primary w-full"
          >
            Sign In
          </button>
        )}

        {/* Footer hint */}
        <div className="text-xs text-subtle">
          Authentication is handled by your Seamless Auth instance
        </div>
      </div>
    </div>
  );
}
