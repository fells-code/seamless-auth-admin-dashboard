/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { NavLink, useLocation } from "react-router-dom";
import {
  X,
  LayoutDashboard,
  Users,
  Shield,
  Activity,
  KeyRound,
  Settings,
} from "lucide-react";
import packageJson from "../../package.json";

const navItems = [
  { name: "Overview", path: "/", icon: LayoutDashboard },
  { name: "Users", path: "/users", icon: Users },
  { name: "Sessions", path: "/sessions", icon: KeyRound },
  { name: "Events", path: "/events", icon: Activity },
  { name: "Security", path: "/security", icon: Shield },
  { name: "System", path: "/system", icon: Settings },
];

type SidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

type SidebarContentProps = {
  onNavigate?: () => void;
  showBranding?: boolean;
};

function SidebarContent({
  onNavigate,
  showBranding = true,
}: SidebarContentProps) {
  const location = useLocation();

  return (
    <>
      {showBranding && (
        <div className="mb-8 px-2">
          <div className="text-lg font-semibold tracking-tight">
            Seamless Auth
          </div>
          <div className="mt-1 text-xs text-muted">Control plane</div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
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
        v{packageJson.version}
      </div>
    </>
  );
}

export default function Sidebar({
  mobileOpen = false,
  onClose,
}: SidebarProps) {
  return (
    <>
      <aside className="hidden h-full w-64 flex-col border-r border-subtle bg-surface px-4 py-5 xl:flex">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal>
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close navigation menu"
            onClick={onClose}
          />

          <aside className="relative z-10 flex h-full w-[min(20rem,85vw)] flex-col border-r border-subtle bg-surface px-4 py-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between px-2">
              <div>
                <div className="text-lg font-semibold tracking-tight">
                  Seamless Auth
                </div>
                <div className="mt-1 text-xs text-muted">Control plane</div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-subtle bg-surface-alt p-2 text-muted transition hover:text-primary"
                aria-label="Close navigation menu"
              >
                <X size={18} />
              </button>
            </div>

            <SidebarContent onNavigate={onClose} showBranding={false} />
          </aside>
        </div>
      )}
    </>
  );
}
