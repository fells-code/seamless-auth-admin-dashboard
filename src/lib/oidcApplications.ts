/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  type OidcApplication,
  type OidcApplicationCreateRequest,
  OidcApplicationCreateRequestSchema,
  type OidcApplicationGrantType,
  type OidcApplicationJwks,
  OidcApplicationJwksSchema,
  type OidcApplicationUpdateRequest,
  type OidcClientType,
  oidcRedirectUriKind,
  oidcRedirectUriProblem,
  type OidcTokenEndpointAuthMethod,
} from "@seamless-auth/types";

export const AUTH_METHOD_LABELS: Record<OidcTokenEndpointAuthMethod, string> = {
  none: "None (PKCE)",
  private_key_jwt: "Private key JWT",
  client_secret_basic: "Shared secret (Basic)",
  client_secret_post: "Shared secret (POST)",
};

export const GRANT_LABELS: Record<OidcApplicationGrantType, string> = {
  authorization_code: "Authorization code",
  refresh_token: "Refresh token",
  client_credentials: "Client credentials",
};

export const REDIRECT_KIND_LABELS = {
  https: "HTTPS",
  loopback: "Loopback",
  private_use: "Private-use scheme",
} as const;

/** Shared secrets are allowed but weaker than keys: anyone who reads one can act as the client. */
export function isSharedSecretMethod(method: OidcTokenEndpointAuthMethod) {
  return method === "client_secret_basic" || method === "client_secret_post";
}

export function authMethodsFor(
  clientType: OidcClientType,
): OidcTokenEndpointAuthMethod[] {
  return clientType === "public"
    ? ["none"]
    : ["private_key_jwt", "client_secret_basic", "client_secret_post"];
}

export function parseLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\s,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export type RedirectCheck = {
  uri: string;
  kind: keyof typeof REDIRECT_KIND_LABELS | null;
  problem: string | null;
};

export function checkRedirectUris(value: string): RedirectCheck[] {
  return parseLines(value).map((uri) => ({
    uri,
    kind: oidcRedirectUriKind(uri),
    problem: oidcRedirectUriProblem(uri),
  }));
}

export type ApplicationForm = {
  name: string;
  clientType: OidcClientType;
  firstParty: boolean;
  tokenEndpointAuthMethod: OidcTokenEndpointAuthMethod;
  redirectUris: string;
  postLogoutRedirectUris: string;
  grantTypes: OidcApplicationGrantType[];
  deviceFlowEnabled: boolean;
  noticesEnabled: boolean;
  backchannelLogoutUri: string;
  accessTokenTtlSeconds: string;
  idTokenTtlSeconds: string;
  refreshTokenTtlSeconds: string;
  disabled: boolean;
};

export function emptyApplicationForm(): ApplicationForm {
  return {
    name: "",
    clientType: "confidential",
    firstParty: false,
    tokenEndpointAuthMethod: "private_key_jwt",
    redirectUris: "",
    postLogoutRedirectUris: "",
    grantTypes: ["authorization_code", "refresh_token"],
    deviceFlowEnabled: false,
    noticesEnabled: false,
    backchannelLogoutUri: "",
    accessTokenTtlSeconds: "",
    idTokenTtlSeconds: "",
    refreshTokenTtlSeconds: "",
    disabled: false,
  };
}

function ttlText(value: number | null) {
  return value === null ? "" : String(value);
}

export function applicationToForm(app: OidcApplication): ApplicationForm {
  return {
    name: app.name,
    clientType: app.clientType,
    firstParty: app.firstParty,
    tokenEndpointAuthMethod: app.tokenEndpointAuthMethod,
    redirectUris: app.redirectUris.join("\n"),
    postLogoutRedirectUris: app.postLogoutRedirectUris.join("\n"),
    grantTypes: app.grantTypes,
    deviceFlowEnabled: app.deviceFlowEnabled,
    noticesEnabled: app.noticesEnabled,
    backchannelLogoutUri: app.backchannelLogoutUri ?? "",
    accessTokenTtlSeconds: ttlText(app.accessTokenTtlSeconds),
    idTokenTtlSeconds: ttlText(app.idTokenTtlSeconds),
    refreshTokenTtlSeconds: ttlText(app.refreshTokenTtlSeconds),
    disabled: app.disabled,
  };
}

function ttlValue(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

function settingsFromForm(form: ApplicationForm) {
  return {
    name: form.name.trim(),
    firstParty: form.firstParty,
    tokenEndpointAuthMethod: form.tokenEndpointAuthMethod,
    redirectUris: parseLines(form.redirectUris),
    postLogoutRedirectUris: parseLines(form.postLogoutRedirectUris),
    grantTypes: form.grantTypes,
    deviceFlowEnabled: form.deviceFlowEnabled,
    noticesEnabled: form.noticesEnabled,
    backchannelLogoutUri: form.backchannelLogoutUri.trim() || null,
    accessTokenTtlSeconds: ttlValue(form.accessTokenTtlSeconds),
    idTokenTtlSeconds: ttlValue(form.idTokenTtlSeconds),
    refreshTokenTtlSeconds: ttlValue(form.refreshTokenTtlSeconds),
  };
}

export type FormProblem = { field: string; label: string; message: string };

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  tokenEndpointAuthMethod: "Client authentication",
  redirectUris: "Redirect URI",
  postLogoutRedirectUris: "Post-logout redirect URI",
  grantTypes: "Grants",
  deviceFlowEnabled: "Device grant",
  backchannelLogoutUri: "Back-channel logout URI",
  accessTokenTtlSeconds: "Access token TTL",
  idTokenTtlSeconds: "ID token TTL",
  refreshTokenTtlSeconds: "Refresh token TTL",
};

/**
 * Checks the form against the same rules the API runs on create, which it also
 * runs on the merged result of every update. A problem here is one the API
 * would refuse, so it is shown before the admin is asked to step up.
 */
export function validateApplicationForm(form: ApplicationForm): FormProblem[] {
  const result = OidcApplicationCreateRequestSchema.safeParse({
    ...settingsFromForm(form),
    clientType: form.clientType,
  });

  if (result.success) return [];

  return result.error.issues.map((issue) => {
    const [key, index] = issue.path;
    const label = FIELD_LABELS[String(key)] ?? String(key ?? "");

    return {
      field: String(key ?? ""),
      label: typeof index === "number" ? `${label} ${index + 1}` : label,
      message:
        key === "name" && issue.code === "too_small"
          ? "A name is required."
          : issue.message,
    };
  });
}

export function createRequestFromForm(
  form: ApplicationForm,
): OidcApplicationCreateRequest {
  return OidcApplicationCreateRequestSchema.parse({
    ...settingsFromForm(form),
    clientType: form.clientType,
  });
}

export function updateRequestFromForm(
  form: ApplicationForm,
): OidcApplicationUpdateRequest {
  return { ...settingsFromForm(form), disabled: form.disabled };
}

export type KeysInput =
  { ok: true; jwks: OidcApplicationJwks } | { ok: false; message: string };

export function parseJwks(text: string): KeysInput {
  let value: unknown;

  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, message: "The key set is not valid JSON." };
  }

  const result = OidcApplicationJwksSchema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue.path.length ? ` (${issue.path.join(".")})` : "";
    return { ok: false, message: `${issue.message}${where}` };
  }

  return { ok: true, jwks: result.data };
}
