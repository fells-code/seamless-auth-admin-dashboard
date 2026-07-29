/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { Session } from "@seamless-auth/types";

type SessionWithExpiry = Pick<Session, "expiresAt">;

export function isSessionActive(
  session: SessionWithExpiry,
  referenceNow = Date.now(),
) {
  const expiresAt = new Date(session.expiresAt).getTime();

  return Number.isFinite(expiresAt) && expiresAt > referenceNow;
}

export function getActiveSessionCount(
  sessions: SessionWithExpiry[],
  referenceNow = Date.now(),
) {
  return sessions.filter((session) => isSessionActive(session, referenceNow))
    .length;
}
