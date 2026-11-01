/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import type { OidcApplication } from "@seamless-auth/types";
import {
  applicationToForm,
  authMethodsFor,
  checkRedirectUris,
  createRequestFromForm,
  emptyApplicationForm,
  isSharedSecretMethod,
  lacksCodeBinding,
  parseJwks,
  parseList,
  updateRequestFromForm,
  validateApplicationForm,
} from "./oidcApplications";

const app: OidcApplication = {
  id: "client_1",
  name: "Docs",
  clientType: "confidential",
  applicationType: "web",
  firstParty: true,
  tokenEndpointAuthMethod: "private_key_jwt",
  redirectUris: ["https://docs.example.com/cb", "http://127.0.0.1/cb"],
  postLogoutRedirectUris: [],
  grantTypes: ["authorization_code"],
  deviceFlowEnabled: false,
  noticesEnabled: true,
  pkceRequired: true,
  nonceRequired: true,
  jwks: null,
  jwksUri: null,
  hasSecret: false,
  backchannelLogoutUri: null,
  accessTokenTtlSeconds: 600,
  idTokenTtlSeconds: null,
  refreshTokenTtlSeconds: null,
  disabled: false,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

describe("oidcApplications", () => {
  it("treats only the client_secret methods as shared secrets", () => {
    expect(isSharedSecretMethod("client_secret_basic")).toBe(true);
    expect(isSharedSecretMethod("client_secret_post")).toBe(true);
    expect(isSharedSecretMethod("private_key_jwt")).toBe(false);
    expect(isSharedSecretMethod("none")).toBe(false);
  });

  it("offers public clients no credential and confidential clients keys first", () => {
    expect(authMethodsFor("public")).toEqual(["none"]);
    expect(authMethodsFor("confidential")[0]).toBe("private_key_jwt");
  });

  it("splits scope lists on spaces and commas without duplicates", () => {
    expect(parseList(" a:read, b:write  a:read\n")).toEqual([
      "a:read",
      "b:write",
    ]);
  });

  it("classifies each redirect URI by its RFC 8252 form", () => {
    const checks = checkRedirectUris(
      "https://app.example.com/cb\nhttp://[::1]/cb\ncom.example.app:/cb\nhttp://localhost/cb\n",
    );

    expect(checks.map((check) => check.kind)).toEqual([
      "https",
      "loopback",
      "private_use",
      null,
    ]);
    expect(checks[3].problem).toMatch(/localhost is not a redirect host/);
  });

  it("finds the cross-field problems the API would refuse", () => {
    const form = {
      ...emptyApplicationForm(),
      name: "Mobile",
      clientType: "public" as const,
      tokenEndpointAuthMethod: "none" as const,
      deviceFlowEnabled: true,
    };

    const fields = validateApplicationForm(form).map((p) => p.field);
    expect(fields).toContain("redirectUris");
    expect(fields).toContain("deviceFlowEnabled");
  });

  it("names the field and the position of a bad redirect URI", () => {
    const problems = validateApplicationForm({
      ...emptyApplicationForm(),
      redirectUris: "https://ok.example.com/cb\nhttp://localhost/cb",
    });

    expect(problems).toContainEqual({
      field: "name",
      label: "Name",
      message: "A name is required.",
    });
    expect(problems).toContainEqual(
      expect.objectContaining({ label: "Redirect URI 2" }),
    );
  });

  it("refuses a TTL that is not a number", () => {
    const problems = validateApplicationForm({
      ...applicationToForm(app),
      accessTokenTtlSeconds: "soon",
    });

    expect(problems.map((p) => p.field)).toContain("accessTokenTtlSeconds");
  });

  it("round-trips an application through the form", () => {
    const form = applicationToForm(app);

    expect(validateApplicationForm(form)).toEqual([]);
    expect(createRequestFromForm(form)).toMatchObject({
      name: "Docs",
      clientType: "confidential",
      redirectUris: app.redirectUris,
      accessTokenTtlSeconds: 600,
      idTokenTtlSeconds: null,
      backchannelLogoutUri: null,
    });
    expect(updateRequestFromForm({ ...form, disabled: true })).toMatchObject({
      noticesEnabled: true,
      disabled: true,
    });
    expect(updateRequestFromForm(form)).not.toHaveProperty("clientType");
  });

  it("flags an application only when PKCE and the nonce are both off", () => {
    expect(lacksCodeBinding(app)).toBe(false);
    expect(lacksCodeBinding({ pkceRequired: false, nonceRequired: true })).toBe(
      false,
    );
    expect(
      lacksCodeBinding({ pkceRequired: false, nonceRequired: false }),
    ).toBe(true);
  });

  it("refuses the PKCE and nonce opt-outs the API would refuse", () => {
    const publicForm = {
      ...applicationToForm(app),
      clientType: "public" as const,
      tokenEndpointAuthMethod: "none" as const,
      pkceRequired: false,
    };
    expect(validateApplicationForm(publicForm)).toContainEqual(
      expect.objectContaining({ field: "pkceRequired", label: "PKCE" }),
    );

    const nonceOnly = { ...applicationToForm(app), nonceRequired: false };
    expect(validateApplicationForm(nonceOnly)).toContainEqual(
      expect.objectContaining({ field: "nonceRequired", label: "Nonce" }),
    );

    const both = {
      ...applicationToForm(app),
      pkceRequired: false,
      nonceRequired: false,
    };
    expect(validateApplicationForm(both)).toEqual([]);
    expect(updateRequestFromForm(both)).toMatchObject({
      pkceRequired: false,
      nonceRequired: false,
    });
  });

  it("parses a public key set and refuses private members or bad JSON", () => {
    const jwks = { keys: [{ kty: "EC", kid: "k", alg: "ES256" }] };

    expect(parseJwks(JSON.stringify(jwks))).toEqual({ ok: true, jwks });
    expect(parseJwks("{")).toEqual({
      ok: false,
      message: "The key set is not valid JSON.",
    });

    const privateKey = parseJwks(
      JSON.stringify({ keys: [{ kty: "EC", kid: "k", alg: "ES256", d: "x" }] }),
    );
    expect(privateKey.ok).toBe(false);
    expect(parseJwks(JSON.stringify({ keys: [] })).ok).toBe(false);
  });
});
