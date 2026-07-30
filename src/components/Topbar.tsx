/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import UserMenu from "./UserMenu";

const routeTitles: Record<string, string> = {
  "/": "Overview",
  "/users": "Users",
  "/sessions": "Sessions",
  "/events": "Events",
  "/security": "Security",
  "/system": "System",
  "/organizations": "Organizations",
  "/profile": "Profile",
};

export default function Topbar({
  onMenuToggle,
}: {
  onMenuToggle?: () => void;
}) {
  const location = useLocation();
  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith("/users/")) {
      return "User Detail";
    }

    return routeTitles[location.pathname] ?? "Seamless Auth";
  }, [location.pathname]);

  // The screen name was computed for display only, so every tab, history entry,
  // and bookmark read the same generic title, several open tabs were
  // indistinguishable, and screen readers announced no change on navigation.
  useEffect(() => {
    document.title =
      pageTitle === "Seamless Auth"
        ? "Seamless Auth"
        : `${pageTitle} | Seamless Auth`;
  }, [pageTitle]);

  return (
    <header className="relative z-40 flex h-14 items-center justify-between border-b border-subtle bg-surface/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/60 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="rounded-lg border border-subtle bg-surface-alt p-2 text-muted transition hover:text-primary lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted lg:hidden">
            Seamless Auth
          </div>
          <div className="truncate text-sm font-medium text-primary">
            {pageTitle}
          </div>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
        <UserMenu />
      </div>
    </header>
  );
}
