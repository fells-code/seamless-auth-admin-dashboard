/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { FormEvent, ReactNode } from "react";
import { useId, useMemo, useState } from "react";
import type {
  OidcApplicationGrantType,
  OidcClientType,
  OidcTokenEndpointAuthMethod,
} from "@seamless-auth/types";
import Dialog from "./Dialog";
import {
  type ApplicationForm,
  AUTH_METHOD_LABELS,
  authMethodsFor,
  checkRedirectUris,
  GRANT_LABELS,
  isSharedSecretMethod,
  lacksCodeBinding,
  NO_CODE_BINDING_WARNING,
  REDIRECT_KIND_LABELS,
  validateApplicationForm,
} from "../lib/oidcApplications";

const inputClass =
  "w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-60";

const GRANTS: OidcApplicationGrantType[] = [
  "authorization_code",
  "refresh_token",
  "client_credentials",
];

export default function OidcApplicationDialog({
  mode,
  initial,
  isPending,
  onSubmit,
  onClose,
}: {
  mode: "create" | "edit";
  initial: ApplicationForm;
  isPending: boolean;
  onSubmit: (form: ApplicationForm) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState(false);
  const problems = useMemo(() => validateApplicationForm(form), [form]);
  const shownProblems = touched ? problems : [];
  const redirectChecks = useMemo(
    () => checkRedirectUris(form.redirectUris),
    [form.redirectUris],
  );

  const set = <K extends keyof ApplicationForm>(
    key: K,
    value: ApplicationForm[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const setClientType = (clientType: OidcClientType) =>
    setForm((current) => ({
      ...current,
      clientType,
      tokenEndpointAuthMethod: authMethodsFor(clientType)[0],
      grantTypes:
        clientType === "public"
          ? current.grantTypes.filter((grant) => grant !== "client_credentials")
          : current.grantTypes,
      pkceRequired: clientType === "public" ? true : current.pkceRequired,
      nonceRequired: clientType === "public" ? true : current.nonceRequired,
    }));

  // The API refuses PKCE back on while the nonce is off, so turning PKCE on
  // restores the nonce requirement with it.
  const setPkceRequired = (on: boolean) =>
    setForm((current) => ({
      ...current,
      pkceRequired: on,
      nonceRequired: on ? true : current.nonceRequired,
    }));

  const toggleGrant = (grant: OidcApplicationGrantType, on: boolean) =>
    set(
      "grantTypes",
      on
        ? [...form.grantTypes, grant]
        : form.grantTypes.filter((value) => value !== grant),
    );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (problems.length > 0) return;
    onSubmit(form);
  };

  return (
    <Dialog
      title={mode === "create" ? "New application" : `Edit ${initial.name}`}
      description="An OpenID Connect client that signs users in through the login edge."
      onClose={onClose}
      className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit}
        onChange={() => setTouched(true)}
      >
        <Field label="Name">
          <input
            value={form.name}
            onChange={(event) => set("name", event.target.value)}
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client type">
            <select
              value={form.clientType}
              onChange={(event) =>
                setClientType(event.target.value as OidcClientType)
              }
              disabled={mode === "edit"}
              className={inputClass}
            >
              <option value="confidential">Confidential (server)</option>
              <option value="public">Public (browser or native)</option>
            </select>
          </Field>

          <Field label="Client authentication">
            <select
              value={form.tokenEndpointAuthMethod}
              onChange={(event) =>
                set(
                  "tokenEndpointAuthMethod",
                  event.target.value as OidcTokenEndpointAuthMethod,
                )
              }
              className={inputClass}
            >
              {authMethodsFor(form.clientType).map((method) => (
                <option key={method} value={method}>
                  {AUTH_METHOD_LABELS[method]}
                  {isSharedSecretMethod(method) ? ", weaker" : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {isSharedSecretMethod(form.tokenEndpointAuthMethod) && (
          <p className="rounded-md border border-[color:var(--highlight)]/35 bg-surface-alt p-3 text-xs text-muted">
            A shared secret is weaker than a registered key: anyone who reads it
            can act as this client. Prefer private key JWT where the client can
            hold a key. The instance must also allow client secrets, under
            OpenID Provider on the System page.
          </p>
        )}

        <Field label="Redirect URIs (one per line)">
          <textarea
            value={form.redirectUris}
            onChange={(event) => set("redirectUris", event.target.value)}
            rows={3}
            placeholder={
              "https://app.example.com/callback\nhttp://127.0.0.1/callback\ncom.example.app:/callback"
            }
            className={`${inputClass} font-mono`}
          />
        </Field>
        {redirectChecks.length > 0 && (
          <ul className="space-y-1 text-xs" aria-label="Redirect URI checks">
            {redirectChecks.map((check) => (
              <li key={check.uri} className="flex flex-wrap gap-2">
                <span className="font-mono text-primary">{check.uri}</span>
                {check.kind ? (
                  <span className="rounded-full border border-subtle px-2 text-muted">
                    {REDIRECT_KIND_LABELS[check.kind]}
                  </span>
                ) : (
                  <span className="text-[var(--highlight)]">
                    {check.problem}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">
          Loopback redirects use 127.0.0.1 or [::1] and match any port. Native
          apps can use a private-use scheme in reverse domain form.
        </p>

        <Field label="Post-logout redirect URIs (one per line)">
          <textarea
            value={form.postLogoutRedirectUris}
            onChange={(event) =>
              set("postLogoutRedirectUris", event.target.value)
            }
            rows={2}
            className={`${inputClass} font-mono`}
          />
        </Field>

        <fieldset className="space-y-2">
          <legend className="text-xs uppercase tracking-[0.18em] text-muted">
            Grants
          </legend>
          {GRANTS.map((grant) => (
            <Check
              key={grant}
              label={GRANT_LABELS[grant]}
              checked={form.grantTypes.includes(grant)}
              disabled={
                grant === "client_credentials" && form.clientType === "public"
              }
              onChange={(on) => toggleGrant(grant, on)}
            />
          ))}
          <Check
            label="Device authorization grant (first-party only)"
            checked={form.deviceFlowEnabled}
            disabled={!form.firstParty}
            onChange={(on) => set("deviceFlowEnabled", on)}
          />
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-xs uppercase tracking-[0.18em] text-muted">
            Trust
          </legend>
          <Check
            label="First-party (skips consent)"
            checked={form.firstParty}
            onChange={(on) =>
              setForm((current) => ({
                ...current,
                firstParty: on,
                deviceFlowEnabled: on ? current.deviceFlowEnabled : false,
              }))
            }
          />
          <Check
            label="May send account notices to its users"
            checked={form.noticesEnabled}
            onChange={(on) => set("noticesEnabled", on)}
          />
          {mode === "edit" && (
            <Check
              label="Disabled (cannot sign anyone in or get tokens)"
              checked={form.disabled}
              onChange={(on) => set("disabled", on)}
            />
          )}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-xs uppercase tracking-[0.18em] text-muted">
            Code binding
          </legend>
          {form.clientType === "public" ? (
            <p className="text-xs text-muted">
              Public clients always use PKCE.
            </p>
          ) : (
            <>
              <Check
                label="Require PKCE"
                checked={form.pkceRequired}
                onChange={setPkceRequired}
              />
              {!form.pkceRequired && (
                <>
                  <p className="text-xs text-muted">
                    Without PKCE the client must send a nonce whenever it asks
                    for an ID token.
                  </p>
                  <Check
                    label="Require a nonce"
                    checked={form.nonceRequired}
                    onChange={(on) => set("nonceRequired", on)}
                  />
                </>
              )}
              {lacksCodeBinding(form) && (
                <p
                  role="alert"
                  className="rounded-md border border-[color:var(--highlight)]/35 bg-surface-alt p-3 text-xs text-[var(--highlight)]"
                >
                  {NO_CODE_BINDING_WARNING}
                </p>
              )}
            </>
          )}
        </fieldset>

        <Field label="Back-channel logout URI">
          <input
            value={form.backchannelLogoutUri}
            onChange={(event) =>
              set("backchannelLogoutUri", event.target.value)
            }
            placeholder="https://app.example.com/logout"
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Access token TTL (s)">
            <input
              inputMode="numeric"
              value={form.accessTokenTtlSeconds}
              onChange={(event) =>
                set("accessTokenTtlSeconds", event.target.value)
              }
              placeholder="Default"
              className={inputClass}
            />
          </Field>
          <Field label="ID token TTL (s)">
            <input
              inputMode="numeric"
              value={form.idTokenTtlSeconds}
              onChange={(event) => set("idTokenTtlSeconds", event.target.value)}
              placeholder="Default"
              className={inputClass}
            />
          </Field>
          <Field label="Refresh token TTL (s)">
            <input
              inputMode="numeric"
              value={form.refreshTokenTtlSeconds}
              onChange={(event) =>
                set("refreshTokenTtlSeconds", event.target.value)
              }
              placeholder="Default"
              className={inputClass}
            />
          </Field>
        </div>

        {shownProblems.length > 0 && (
          <ul
            role="alert"
            className="space-y-1 rounded-md border border-subtle bg-surface-alt p-3 text-xs text-[var(--highlight)]"
          >
            {shownProblems.map((problem) => (
              <li key={`${problem.field}:${problem.message}`}>
                {problem.label ? `${problem.label}: ` : ""}
                {problem.message}
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || shownProblems.length > 0}
            className="btn btn-primary disabled:opacity-50"
          >
            {isPending
              ? "Saving..."
              : mode === "create"
                ? "Create application"
                : "Save"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="block text-xs uppercase tracking-[0.18em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function Check({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();

  return (
    <div className="flex items-center gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <label htmlFor={id} className={disabled ? "text-muted" : "text-primary"}>
        {label}
      </label>
    </div>
  );
}
