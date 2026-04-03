/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

import Overview from "./pages/Overview";
import Users from "./pages/Users";
import Sessions from "./pages/Sessions";
import Events from "./pages/Events";
import Security from "./pages/Security";
import UserDetail from "./pages/UserDetail";
import SystemConfig from "./pages/SystemConfig";
import { AuthProvider } from "@seamless-auth/react";
import { API_URL } from "./lib/api";
import RequireAuth from "./components/RequireAuth";
import Unauthenticated from "./pages/Unauthenticated";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <AuthProvider apiHost={API_URL} mode="server">
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
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/events" element={<Events />} />
          <Route path="/security" element={<Security />} />
          <Route path="/users/:id" element={<UserDetail />} />
          <Route path="/system" element={<SystemConfig />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthProvider>
  );
}
