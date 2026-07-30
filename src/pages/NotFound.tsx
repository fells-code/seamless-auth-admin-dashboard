/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { Compass } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-subtle bg-surface p-6 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-alt text-[var(--primary)]">
          <Compass size={22} />
        </div>

        <div className="space-y-2">
          <h1 className="text-lg font-semibold tracking-tight">
            Screen not found
          </h1>
          <p className="text-sm text-muted">
            The console has no screen at this address. Check the link, or pick a
            section from the navigation.
          </p>

          {/* The catch-all used to redirect with a history replacement, which
              discarded the address the user actually requested. */}
          <p className="break-all rounded-md border border-subtle bg-surface-alt px-3 py-2 text-xs text-muted">
            {location.pathname}
          </p>
        </div>

        <Link to="/" className="btn btn-primary mt-4">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
