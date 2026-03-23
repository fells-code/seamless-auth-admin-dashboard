import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

import Overview from "./pages/Overview";
import Users from "./pages/Users";
import Sessions from "./pages/Sessions";
import Events from "./pages/Events";
import Security from "./pages/Security";
import UserDetail from "./pages/UserDetail";
import SystemConfig from "./pages/SystemConfig";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/users" element={<Users />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/events" element={<Events />} />
        <Route path="/security" element={<Security />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="/system" element={<SystemConfig />} />
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
