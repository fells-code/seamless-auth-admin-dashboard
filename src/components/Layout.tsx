/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-base text-primary transition-colors duration-300">
      <Sidebar />

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* subtle background treatment */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(229,127,96,0.10),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,rgba(229,127,96,0.08),transparent_60%)]" />
          <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-[rgba(63,98,106,0.08)] blur-3xl dark:bg-[rgba(90,138,148,0.08)]" />
        </div>

        <Topbar />

        <main className="relative flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
