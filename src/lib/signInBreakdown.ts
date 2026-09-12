/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type {
  SignInBreakdownRow,
  SignInMetricsResponse,
} from "../hooks/useSignInMetrics";

export type BreakdownDimension = "method" | "deviceClass" | "mailProvider";

export interface BreakdownEntry {
  key: string;
  label: string;
  success: number;
  failed: number;
  total: number;
  /** `success / total`. */
  rate: number;
}

const LABELS: Record<string, string> = {
  passkey: "Passkey",
  otp: "One-time code",
  magic_link: "Magic link",
  oauth: "OAuth",
  totp: "Authenticator app",
  ios: "iOS",
  android: "Android",
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
  chromeos: "ChromeOS",
  bot: "Bots and scanners",
  gmail: "Gmail",
  outlook: "Outlook",
  yahoo: "Yahoo",
  icloud: "iCloud",
  proton: "Proton",
  aol: "AOL",
  fastmail: "Fastmail",
  gmx: "GMX",
  zoho: "Zoho",
  yandex: "Yandex",
  other: "Other domains",
};

// A null dimension is a row written before the column existed, or one whose
// subject was not known. Both read as "unknown" rather than vanishing.
export function labelFor(value: string | null): string {
  if (value === null) return "Unknown";

  return LABELS[value] ?? value;
}

/**
 * Sums the flat rows over one dimension, busiest first.
 *
 * Ties break on the label so the order is stable between refreshes; a list
 * that reshuffles every minute reads as change when nothing changed.
 */
export function pivotBreakdown(
  rows: SignInBreakdownRow[],
  dimension: BreakdownDimension,
): BreakdownEntry[] {
  const totals = new Map<string, { success: number; failed: number }>();

  for (const row of rows) {
    const key = row[dimension] ?? "";
    const entry = totals.get(key) ?? { success: 0, failed: 0 };

    entry.success += row.success;
    entry.failed += row.failed;
    totals.set(key, entry);
  }

  return [...totals]
    .map(([key, { success, failed }]) => {
      const total = success + failed;

      return {
        key,
        label: labelFor(key || null),
        success,
        failed,
        total,
        rate: total > 0 ? success / total : 0,
      };
    })
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

/**
 * Where attempts stopped, from the four step counts.
 *
 * Each step is a subset of the one before it in the ordinary case, but the
 * window cuts across attempts (a start before `from`, a factor inside it), so a
 * later step can exceed an earlier one at the edges. Clamped rather than shown
 * as a negative number of people.
 */
export function describeDropOff(attempts: SignInMetricsResponse["attempts"]) {
  return {
    /** Started and never presented a factor. */
    abandoned: Math.max(attempts.started - attempts.presented, 0),
    /** Presented a factor and never got in. */
    stopped: Math.max(attempts.presented - attempts.completed, 0),
  };
}
