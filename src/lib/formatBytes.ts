/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

const UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];
const STEP = 1024;

export function formatBytes(bytes: number) {
  // A database size is never negative, and NaN or Infinity would otherwise
  // render as literal text on the dashboard.
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  // Clamp the exponent to the units available. Without the upper bound a value
  // in the terabytes indexed past the end of the list and rendered as
  // "1.09 undefined"; without the lower bound a fractional byte count did the
  // same in the other direction.
  const exponent = Math.min(
    Math.max(Math.floor(Math.log(bytes) / Math.log(STEP)), 0),
    UNITS.length - 1,
  );

  return `${(bytes / Math.pow(STEP, exponent)).toFixed(2)} ${UNITS[exponent]}`;
}
