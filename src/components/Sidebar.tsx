/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Shield,
  Activity,
  KeyRound,
  Settings,
} from "lucide-react";

const navItems = [
  { name: "Overview", path: "/", icon: LayoutDashboard },
  { name: "Users", path: "/users", icon: Users },
  { name: "Sessions", path: "/sessions", icon: KeyRound },
  { name: "Events", path: "/events", icon: Activity },
  { name: "Security", path: "/security", icon: Shield },
  { name: "System", path: "/system", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-64 h-full flex flex-col bg-surface border-r border-subtle px-4 py-5">
      {/* Branding */}
      <div className="mb-8 px-2">
        <div className="text-lg font-semibold tracking-tight">
          Seamless Auth
        </div>
        <div className="text-xs text-muted mt-1">Control plane</div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [
                  "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted hover:bg-surface-alt hover:text-primary",
                ].join(" ")
              }
            >
              {/* Icon */}
              <Icon
                size={18}
                className="transition-colors group-hover:text-primary"
              />

              {/* Label */}
              <span className="font-medium tracking-tight">{item.name}</span>

              {/* Active indicator */}
              <span
                className={`ml-auto h-1.5 w-1.5 rounded-full transition ${
                  location.pathname === item.path
                    ? "bg-primary"
                    : "bg-transparent"
                }`}
              />
            </NavLink>
          );
        })}
      </nav>

      {/* Footer spacer */}
      <div className="flex-1" />

      {/* Optional footer (future space for version / env) */}
      <div className="text-xs text-muted px-2 pt-4 border-t border-subtle">
        v0.0.5
      </div>
    </aside>
  );
}
