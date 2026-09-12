/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

/**
 * Renders a duration in seconds at the precision that reads naturally for its
 * size: a passkey sign-in finishes inside a second, a registration takes a
 * minute or two, and a first passkey can arrive days after the account.
 */
export function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return "n/a";
  }

  if (seconds < 0) return "n/a";
  if (seconds < 10) return `${seconds.toFixed(1)}s`;
  if (seconds < MINUTE) return `${Math.round(seconds)}s`;

  if (seconds < HOUR) {
    const minutes = Math.floor(seconds / MINUTE);
    const rest = Math.round(seconds % MINUTE);

    return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`;
  }

  if (seconds < DAY) {
    const hours = Math.floor(seconds / HOUR);
    const rest = Math.round((seconds % HOUR) / MINUTE);

    return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
  }

  const days = Math.floor(seconds / DAY);
  const rest = Math.round((seconds % DAY) / HOUR);

  return rest > 0 ? `${days}d ${rest}h` : `${days}d`;
}
