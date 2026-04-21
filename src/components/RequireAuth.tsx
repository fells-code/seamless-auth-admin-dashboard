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

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user, hasRole, loading } = useAuth();
  const [ready, setReady] = useState(false);
  const location = useLocation();

  const currentPath = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    if (user !== undefined) {
      setTimeout(() => setReady(true), 100);
    }
  }, [user]);

  useEffect(() => {
    saveLastProtectedRoute(currentPath);
  }, [currentPath]);

  if (loading || user === undefined) {
    return <AuthLoading />;
  }

  if (!isAuthenticated || !hasRole("admin")) {
    return (
      <Navigate
        to="/unauthenticated"
        replace
        state={{ from: currentPath }}
      />
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
