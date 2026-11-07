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

// TODO(seamless-auth-types#148): use the published shapes once the schemas carry them.
/**
 * The v0.23 API adds these to every application. An older API leaves them out,
 * which is how the console tells it cannot write them.
 */
export type OidcApplicationView = OidcApplication & {
  noticeActionOrigins?: string[];
  /** Applications this one acts for. */
  links?: string[];
  /** Applications that act for this one. */
  linkedFrom?: string[];
};

export type OidcApplicationListView = { applications: OidcApplicationView[] };

export type OidcApplicationLink = {
  /** The confidential application that acts. */
  clientId: string;
  /** The public application it acts for. */
  linkedClientId: string;
  createdBy: string | null;
  createdAt: string;
};

export type OidcApplicationLinksResponse = {
  links: OidcApplicationLink[];
  linkedFrom: OidcApplicationLink[];
};

export type ApplicationFeatures = {
  sessionExchange: boolean;
  noticeActionOrigins: boolean;
};

/** An API older than v0.23 sends neither field, and refuses both on a write. */
export function applicationFeatures(
  app: OidcApplicationView,
): ApplicationFeatures {
  return {
    sessionExchange:
      typeof (app as { sessionExchangeEnabled?: unknown })
        .sessionExchangeEnabled === "boolean",
    noticeActionOrigins: Array.isArray(app.noticeActionOrigins),
  };
}

/**
 * What a new application can carry. With no application to go by, the fields
 * are offered, and they are only sent when set, so an older API sees no change
 * unless they are used.
 */
export function instanceApplicationFeatures(
  applications: OidcApplicationView[],
): ApplicationFeatures {
  if (applications.length === 0) {
    return { sessionExchange: true, noticeActionOrigins: true };
  }

  const features = applications.map(applicationFeatures);
  return {
    sessionExchange: features.some((f) => f.sessionExchange),
    noticeActionOrigins: features.some((f) => f.noticeActionOrigins),
  };
}

/**
 * The public applications `app` may act for under the API's rules (ADR 0002,
 * N4). The API checks again, including `third_party_clients_enabled`.
 */
export function linkCandidates(
  app: OidcApplicationView,
  applications: OidcApplicationView[],
  linked: string[],
) {
  if (app.clientType !== "confidential") return [];

  return applications.filter(
    (other) =>
      other.id !== app.id &&
      other.clientType === "public" &&
      other.firstParty === app.firstParty &&
      !linked.includes(other.id),
  );
}

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

export const NO_CODE_BINDING_WARNING =
  "PKCE and the nonce are both off. This application relies only on state and client authentication against authorization code injection. Keep this only for a client that needs it, such as an OpenID certification test client.";

/** True when neither PKCE nor a nonce binds the authorization code to the client's request. */
export function lacksCodeBinding(
  app: Pick<OidcApplication, "pkceRequired" | "nonceRequired">,
) {
  return !app.pkceRequired && !app.nonceRequired;
}

/** Shared secrets are allowed but weaker than keys: anyone who reads one can act as the client. */
export function isSharedSecretMethod(method: OidcTokenEndpointAuthMethod) {
  return method === "client_secret_basic" || method === "client_secret_post";
}

/**
 * ADR 0003: only a first-party public client with a loopback or private-use
 * redirect URI may exchange a provider sign-in for a first-party session.
 */
export function canUseSessionExchange(
  form: Pick<ApplicationForm, "firstParty" | "clientType" | "redirectUris">,
) {
  return (
    form.firstParty &&
    form.clientType === "public" &&
    parseLines(form.redirectUris).some((uri) => {
      const kind = oidcRedirectUriKind(uri);
      return kind === "loopback" || kind === "private_use";
    })
  );
}

const LOOPBACK_HOST = /^(127(\.\d{1,3}){3}|\[::1\]|localhost|.+\.localhost)$/i;

/** The API's rule for a notice action origin, so a refusal shows before step-up. */
export function noticeActionOriginProblem(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "notice action origin must be an absolute https origin";
  }
  if (url.protocol !== "https:") return "notice action origins must be https";
  if (LOOPBACK_HOST.test(url.hostname)) {
    return "notice action origins cannot be loopback";
  }
  if (url.origin !== value) {
    return "notice action origins are bare origins, such as https://app.example.com";
  }
  return null;
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
  sessionExchangeEnabled: boolean;
  noticeActionOrigins: string;
  pkceRequired: boolean;
  nonceRequired: boolean;
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
    sessionExchangeEnabled: false,
    noticeActionOrigins: "",
    pkceRequired: true,
    nonceRequired: true,
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

export function applicationToForm(app: OidcApplicationView): ApplicationForm {
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
    sessionExchangeEnabled: app.sessionExchangeEnabled ?? false,
    noticeActionOrigins: (app.noticeActionOrigins ?? []).join("\n"),
    pkceRequired: app.pkceRequired,
    nonceRequired: app.nonceRequired,
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
    pkceRequired: form.pkceRequired,
    nonceRequired: form.nonceRequired,
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
  sessionExchangeEnabled: "Session exchange",
  noticeActionOrigins: "Notice action origin",
  pkceRequired: "PKCE",
  nonceRequired: "Nonce",
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
    sessionExchangeEnabled: form.sessionExchangeEnabled,
    clientType: form.clientType,
  });

  const problems = result.success
    ? []
    : result.error.issues.map((issue) => {
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

  return [...problems, ...noticeActionOriginProblems(form)];
}

function noticeActionOriginProblems(form: ApplicationForm): FormProblem[] {
  const origins = parseLines(form.noticeActionOrigins);
  const problems: FormProblem[] = origins.flatMap((origin, index) => {
    const message = noticeActionOriginProblem(origin);
    return message
      ? [
          {
            field: "noticeActionOrigins",
            label: `${FIELD_LABELS.noticeActionOrigins} ${index + 1}`,
            message,
          },
        ]
      : [];
  });

  if (new Set(origins).size !== origins.length) {
    problems.push({
      field: "noticeActionOrigins",
      label: "Notice action origins",
      message: "Origins must be unique",
    });
  }
  if (origins.length > 20) {
    problems.push({
      field: "noticeActionOrigins",
      label: "Notice action origins",
      message: "At most 20 origins",
    });
  }

  return problems;
}

export type ApplicationCreateBody = OidcApplicationCreateRequest & {
  noticeActionOrigins?: string[];
};

export type ApplicationUpdateBody = OidcApplicationUpdateRequest & {
  noticeActionOrigins?: string[];
};

/**
 * The v0.23 fields go out only when they are used, so creating an ordinary
 * application keeps working against an older API, whose schema is strict.
 */
export function createRequestFromForm(
  form: ApplicationForm,
): ApplicationCreateBody {
  const { sessionExchangeEnabled, ...request } =
    OidcApplicationCreateRequestSchema.parse({
      ...settingsFromForm(form),
      sessionExchangeEnabled: form.sessionExchangeEnabled,
      clientType: form.clientType,
    });
  const noticeActionOrigins = parseLines(form.noticeActionOrigins);

  return {
    ...request,
    ...(sessionExchangeEnabled ? { sessionExchangeEnabled } : {}),
    ...(noticeActionOrigins.length ? { noticeActionOrigins } : {}),
  } as ApplicationCreateBody;
}

/** Each v0.23 field is sent only to an API that returned it on the application. */
export function updateRequestFromForm(
  form: ApplicationForm,
  features: ApplicationFeatures = {
    sessionExchange: false,
    noticeActionOrigins: false,
  },
): ApplicationUpdateBody {
  return {
    ...settingsFromForm(form),
    ...(features.sessionExchange
      ? { sessionExchangeEnabled: form.sessionExchangeEnabled }
      : {}),
    ...(features.noticeActionOrigins
      ? { noticeActionOrigins: parseLines(form.noticeActionOrigins) }
      : {}),
    disabled: form.disabled,
  };
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
