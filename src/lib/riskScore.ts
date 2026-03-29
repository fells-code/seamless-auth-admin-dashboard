/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/lib/riskScore.ts
export function calculateRiskScore({
  suspiciousEvents,
  failedLogins,
}: {
  suspiciousEvents: number;
  failedLogins: number;
}) {
  let score = 0;

  score += suspiciousEvents * 3;
  score += failedLogins * 1;

  if (score > 15) return { level: "HIGH", color: "red" };
  if (score > 5) return { level: "MEDIUM", color: "yellow" };

  return { level: "LOW", color: "green" };
}
