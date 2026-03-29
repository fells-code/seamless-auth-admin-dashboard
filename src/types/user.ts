/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { User } from "@seamless-auth/types";

export type Session = {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  lastUsedAt: string;
  expiresAt: string;
};

export type Credential = {
  id: string;
  deviceType?: string;
  createdAt: string;
  browser: string;
  platform: string;
};

export type AuthEvent = {
  type: string;
  ip_address?: string | null;
  created_at: string;
};

export type UserDetailResponse = {
  user: User;
  sessions: Session[];
  credentials: Credential[];
  events: AuthEvent[];
};

export type UserAnomalies = {
  suspiciousEvents: AuthEvent[];
  relatedIps: string[];
  relatedAgents: string[];
};
