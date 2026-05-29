/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/hooks/useSystemConfig.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export type LoginMethod =
  | "passkey"
  | "magic_link"
  | "email_otp"
  | "phone_otp"
  | "oauth";

export type OAuthProviderConfig = {
  id: string;
  name: string;
  enabled: boolean;
  clientId: string;
  clientSecretEnv: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  redirectUri?: string;
  redirectUris: string[];
  subjectJsonPath: string;
  emailJsonPath: string;
  emailVerifiedJsonPath: string;
  nameJsonPath?: string;
  allowSignup: boolean;
  accountLinking: "email" | "disabled";
  requireEmailVerified: boolean;
};

export type LockoutPolicy = {
  enabled: boolean;
  maxFailures: number;
  windowSeconds: number;
  lockoutSeconds: number;
};

export type SystemConfig = {
  app_name: string;
  available_roles: string[];
  default_roles: string[];
  access_token_ttl: string;
  refresh_token_ttl: string;
  rate_limit: number;
  delay_after: number;
  login_methods: LoginMethod[];
  passkey_login_fallback_enabled: boolean;
  oauth_providers: OAuthProviderConfig[];
  lockout_policy: LockoutPolicy;
  rpid: string;
  origins: string[];
};

export function useSystemConfig() {
  return useQuery({
    queryKey: ["system-config"],
    queryFn: () => apiFetch<SystemConfig>("/system-config/admin"),
  });
}
