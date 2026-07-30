/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useEffect, useState } from "react";

/**
 * A reference timestamp that advances while the screen stays open.
 *
 * The monitoring screens captured `Date.now()` once at mount and fed it to
 * every relative time, so "2 minutes ago" stayed frozen at two minutes for as
 * long as the tab was left open.
 */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
