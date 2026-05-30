/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout";

import Overview from "./pages/Overview";
import Users from "./pages/Users";
import Sessions from "./pages/Sessions";
import Events from "./pages/Events";
import Security from "./pages/Security";
import Organizations from "./pages/Organizations";
import UserDetail from "./pages/UserDetail";
import SystemConfig from "./pages/SystemConfig";
import { AuthProvider, AuthRoutes } from "@seamless-auth/react";
import { API_URL } from "./lib/api";
import RequireAuth from "./components/RequireAuth";
import Unauthenticated from "./pages/Unauthenticated";
import Profile from "./pages/Profile";

const AUTH_ROUTE_PATHS = [
  "/login",
  "/passKeyLogin",
  "/verifyPhoneOTP",
  "/verifyEmailOTP",
  "/verify-magiclink",
  "/registerPasskey",
  "/magiclinks-sent",
];

export default function App() {
  return (
    <AuthProvider apiHost={API_URL}>
      <Routes>
        <Route path="/unauthenticated" element={<Unauthenticated />} />

        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Overview />} />
          <Route path="/users" element={<Users />} />
          <Route path="/organizations" element={<Organizations />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/events" element={<Events />} />
          <Route path="/security" element={<Security />} />
          <Route path="/users/:id" element={<UserDetail />} />
          <Route path="/system" element={<SystemConfig />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<PublicAuthRoutes />} />
      </Routes>
    </AuthProvider>
  );
}

function PublicAuthRoutes() {
  const { pathname } = useLocation();
  const isAuthRoute = AUTH_ROUTE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  return isAuthRoute ? <AuthRoutes /> : <Navigate to="/" replace />;
}
