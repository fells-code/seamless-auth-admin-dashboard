// src/types/user.ts

export type User = {
  id: string;
  email: string;
  phone?: string | null;
  roles: string[];
  verified: boolean;
};

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
