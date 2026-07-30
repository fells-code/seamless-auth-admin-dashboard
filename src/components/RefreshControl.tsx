/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { RefreshCw } from "lucide-react";

/**
 * Manual refresh for the monitoring screens.
 *
 * None of them refreshed on an interval or offered a way to ask for current
 * data, so figures and "time ago" values went stale while the screen stayed
 * open, and the only way to update them was to navigate away and back.
 */
export default function RefreshControl({
  onRefresh,
  isRefreshing = false,
  updatedAt,
  label = "Refresh",
}: {
  onRefresh: () => void;
  isRefreshing?: boolean;
  updatedAt?: number;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {updatedAt !== undefined && (
        <span className="text-xs text-muted" aria-live="polite">
          Updated {new Date(updatedAt).toLocaleTimeString()}
        </span>
      )}

      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="btn btn-secondary disabled:opacity-50"
      >
        <RefreshCw
          size={14}
          className={isRefreshing ? "animate-spin" : undefined}
          aria-hidden="true"
        />
        {isRefreshing ? "Refreshing..." : label}
      </button>
    </div>
  );
}
