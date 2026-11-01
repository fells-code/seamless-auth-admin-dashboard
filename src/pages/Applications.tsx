/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { AppWindow, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import type { OidcApplication, OidcResource } from "@seamless-auth/types";
import Table from "../components/Table";
import Dialog from "../components/Dialog";
import Skeleton from "../components/Skeleton";
import StatCard from "../components/StatCard";
import { Section } from "../components/Section";
import OidcApplicationDialog from "../components/OidcApplicationDialog";
import {
  QueryErrorState,
  ReadOnlyNotice,
  StateMessage,
} from "../components/StateMessage";
import { getErrorMessage } from "../lib/errorMessage";
import {
  applicationToForm,
  type ApplicationForm,
  AUTH_METHOD_LABELS,
  createRequestFromForm,
  emptyApplicationForm,
  GRANT_LABELS,
  isSharedSecretMethod,
  lacksCodeBinding,
  NO_CODE_BINDING_WARNING,
  parseJwks,
  REDIRECT_KIND_LABELS,
  updateRequestFromForm,
} from "../lib/oidcApplications";
import { oidcRedirectUriKind } from "@seamless-auth/types";
import {
  useCreateOidcApplication,
  useDeleteOidcApplication,
  useOidcApplicationResources,
  useOidcApplications,
  useRotateOidcApplicationSecret,
  useSetOidcApplicationKeys,
  useSetOidcApplicationResources,
  useUpdateOidcApplication,
} from "../hooks/useOidcApplications";
import { useOidcResources } from "../hooks/useOidcResources";
import { useAdminPermissions } from "../hooks/useAdminPermissions";
import { useStepUpGuard } from "../hooks/useStepUpGuard";
import { useToast } from "../hooks/useToast";
import { useConfirm } from "../hooks/useConfirm";

type ApplicationRow = OidcApplication & Record<string, unknown>;

type Editing = { mode: "create" } | { mode: "edit"; app: OidcApplication };

export default function Applications() {
  const { data, isLoading, isError, error, refetch } = useOidcApplications();
  const createApplication = useCreateOidcApplication();
  const updateApplication = useUpdateOidcApplication();
  const deleteApplication = useDeleteOidcApplication();
  const rotateSecret = useRotateOidcApplicationSecret();
  const { canWrite } = useAdminPermissions();
  const ensureStepUp = useStepUpGuard();
  const toast = useToast();
  const confirm = useConfirm();

  const applications = useMemo(() => data?.applications ?? [], [data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    applications.find((app) => app.id === selectedId) ??
    applications[0] ??
    null;
  const [editing, setEditing] = useState<Editing | null>(null);
  const [revealed, setRevealed] = useState<{
    name: string;
    clientId: string;
    secret: string;
  } | null>(null);

  const publicCount = applications.filter(
    (app) => app.clientType === "public",
  ).length;
  const secretCount = applications.filter((app) =>
    isSharedSecretMethod(app.tokenEndpointAuthMethod),
  ).length;

  const handleSubmit = async (form: ApplicationForm) => {
    if (!canWrite || !editing) return;
    if (!(await ensureStepUp())) return;

    if (editing.mode === "create") {
      createApplication.mutate(createRequestFromForm(form), {
        onSuccess: ({ application, clientSecret }) => {
          setEditing(null);
          setSelectedId(application.id);
          toast.success(
            "Application created",
            `${application.name} was added.`,
          );
          if (clientSecret) {
            setRevealed({
              name: application.name,
              clientId: application.id,
              secret: clientSecret,
            });
          }
        },
        onError: (err) => {
          toast.error("Application creation failed", getErrorMessage(err));
        },
      });
      return;
    }

    updateApplication.mutate(
      { id: editing.app.id, ...updateRequestFromForm(form) },
      {
        onSuccess: ({ application }) => {
          setEditing(null);
          toast.success(
            "Application updated",
            `${application.name} was saved.`,
          );
        },
        onError: (err) => {
          toast.error("Application update failed", getErrorMessage(err));
        },
      },
    );
  };

  const handleDelete = async (app: OidcApplication) => {
    if (!canWrite) return;

    if (
      !(await confirm({
        title: "Delete application",
        description: `Delete ${app.name}? It can no longer sign anyone in, and tokens it holds stop working. This cannot be undone.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    ) {
      return;
    }

    if (!(await ensureStepUp())) return;

    deleteApplication.mutate(app.id, {
      onSuccess: () => {
        if (selectedId === app.id) setSelectedId(null);
        toast.success("Application deleted", `${app.name} was deleted.`);
      },
      onError: (err) => {
        toast.error("Application deletion failed", getErrorMessage(err));
      },
    });
  };

  const handleRotateSecret = async (app: OidcApplication) => {
    if (!canWrite) return;

    if (
      app.hasSecret &&
      !(await confirm({
        title: "Rotate secret",
        description: `Issue a new secret for ${app.name}? The current secret stops working at once.`,
        confirmLabel: "Rotate",
        tone: "danger",
      }))
    ) {
      return;
    }

    if (!(await ensureStepUp())) return;

    rotateSecret.mutate(app.id, {
      onSuccess: ({ application, clientSecret }) => {
        setRevealed({
          name: application.name,
          clientId: application.id,
          secret: clientSecret,
        });
      },
      onError: (err) => {
        toast.error("Secret rotation failed", getErrorMessage(err));
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-[28px]" />
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <QueryErrorState
        title="Could not load applications"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-subtle bg-surface px-6 py-6 lg:px-8 lg:py-8">
        <div className="space-y-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
            OpenID Provider
          </div>
          <h1 className="heading-1">Applications</h1>
          <p className="max-w-2xl text-sm text-muted">
            Register the OpenID Connect clients that sign users in through
            Seamless, and choose which APIs each one may get tokens for.
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Applications"
          value={applications.length}
          hint="Registered clients"
        />
        <StatCard
          label="Public clients"
          value={publicCount}
          hint="Browser and native apps using PKCE"
        />
        <StatCard
          label="Shared secrets"
          value={secretCount}
          hint="Weaker than registered keys"
        />
      </div>

      <Section
        title="Applications"
        description="Clients registered with the OpenID Provider."
        actions={
          canWrite ? (
            <button
              type="button"
              className="btn btn-primary inline-flex items-center gap-2"
              onClick={() => setEditing({ mode: "create" })}
            >
              <Plus size={16} />
              New application
            </button>
          ) : undefined
        }
      >
        {!canWrite && <ReadOnlyNotice />}
        <Table<ApplicationRow>
          label="Applications"
          data={applications as ApplicationRow[]}
          rowLabel={(app) => app.name}
          total={applications.length}
          emptyTitle="No applications"
          emptyDescription={
            canWrite
              ? "Create an application to let it sign users in."
              : "No applications are registered."
          }
          columns={[
            {
              key: "name",
              label: "Application",
              sortable: true,
              width: "wide",
              wrap: true,
              render: (value, row) => (
                <button
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className="flex w-full flex-col text-left transition hover:opacity-80"
                >
                  <span className="font-medium text-primary">
                    {String(value)}
                  </span>
                  <span className="font-mono text-xs text-muted">{row.id}</span>
                </button>
              ),
            },
            {
              key: "clientType",
              label: "Type",
              width: "medium",
              render: (_value, row) => (
                <span className="text-sm text-primary">
                  {row.clientType === "public" ? "Public" : "Confidential"}
                  <span className="text-muted">, {row.applicationType}</span>
                </span>
              ),
            },
            {
              key: "tokenEndpointAuthMethod",
              label: "Authentication",
              width: "medium",
              wrap: true,
              render: (_value, row) => (
                <AuthMethod method={row.tokenEndpointAuthMethod} />
              ),
            },
            {
              key: "disabled",
              label: "Status",
              width: "compact",
              wrap: true,
              render: (value, row) => (
                <span className="inline-flex flex-wrap items-center gap-2 text-sm text-muted">
                  {value ? "Disabled" : "Active"}
                  {lacksCodeBinding(row) && (
                    <span
                      className="rounded-full border border-[color:var(--highlight)]/35 bg-[color:var(--highlight)]/10 px-2 py-0.5 text-xs text-[var(--highlight)]"
                      title={NO_CODE_BINDING_WARNING}
                    >
                      No PKCE or nonce
                    </span>
                  )}
                </span>
              ),
            },
          ]}
          actions={[
            {
              icon: AppWindow,
              label: "Manage",
              onClick: (row: ApplicationRow) => setSelectedId(row.id),
            },
            ...(canWrite
              ? [
                  {
                    icon: Pencil,
                    label: "Edit",
                    onClick: (row: ApplicationRow) =>
                      setEditing({ mode: "edit", app: row }),
                  },
                  {
                    icon: Trash2,
                    label: "Delete",
                    variant: "danger" as const,
                    onClick: (row: ApplicationRow) => void handleDelete(row),
                  },
                ]
              : []),
          ]}
        />
      </Section>

      {selected && (
        <div className="grid gap-8 xl:grid-cols-2">
          <Section
            title={selected.name}
            description="Settings for the selected application."
          >
            <ApplicationDetails app={selected} />
            <Credentials
              key={selected.id}
              app={selected}
              canWrite={canWrite}
              rotating={rotateSecret.isPending}
              onRotate={() => void handleRotateSecret(selected)}
            />
          </Section>
          <ApplicationResources
            key={selected.id}
            app={selected}
            canWrite={canWrite}
          />
        </div>
      )}

      {editing && (
        <OidcApplicationDialog
          mode={editing.mode}
          initial={
            editing.mode === "edit"
              ? applicationToForm(editing.app)
              : emptyApplicationForm()
          }
          isPending={createApplication.isPending || updateApplication.isPending}
          onSubmit={(form) => void handleSubmit(form)}
          onClose={() => setEditing(null)}
        />
      )}

      {revealed && (
        <Dialog
          title="Client secret"
          description={`Copy the secret for ${revealed.name} now. It is shown once and cannot be read again.`}
          onClose={() => setRevealed(null)}
        >
          <div className="space-y-3">
            <Detail label="Client ID" value={revealed.clientId} mono />
            <label className="block space-y-2">
              <span className="block text-xs uppercase tracking-[0.18em] text-muted">
                Client secret
              </span>
              <input
                readOnly
                value={revealed.secret}
                onFocus={(event) => event.target.select()}
                className="w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 font-mono text-sm"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  void navigator.clipboard?.writeText(revealed.secret)
                }
              >
                Copy
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setRevealed(null)}
              >
                Done
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function AuthMethod({
  method,
}: {
  method: OidcApplication["tokenEndpointAuthMethod"];
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-sm text-primary">
      {AUTH_METHOD_LABELS[method]}
      {isSharedSecretMethod(method) && (
        <span className="rounded-full border border-[color:var(--highlight)]/35 bg-[color:var(--highlight)]/10 px-2 py-0.5 text-xs text-[var(--highlight)]">
          Weaker
        </span>
      )}
    </span>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-xs uppercase tracking-[0.18em] text-muted">
        {label}
      </div>
      <div
        className={`text-primary ${mono ? "break-all font-mono text-sm" : "break-words"}`}
      >
        {value}
      </div>
    </div>
  );
}

function UriList({ label, uris }: { label: string; uris: string[] }) {
  return (
    <div className="min-w-0">
      <div className="text-xs uppercase tracking-[0.18em] text-muted">
        {label}
      </div>
      {uris.length === 0 ? (
        <div className="text-sm text-muted">None</div>
      ) : (
        <ul className="space-y-1">
          {uris.map((uri) => {
            const kind = oidcRedirectUriKind(uri);
            return (
              <li key={uri} className="flex flex-wrap items-center gap-2">
                <span className="break-all font-mono text-sm text-primary">
                  {uri}
                </span>
                {kind && (
                  <span className="rounded-full border border-subtle px-2 text-xs text-muted">
                    {REDIRECT_KIND_LABELS[kind]}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ApplicationDetails({ app }: { app: OidcApplication }) {
  const grants = [
    ...app.grantTypes.map((grant) => GRANT_LABELS[grant]),
    ...(app.deviceFlowEnabled ? ["Device authorization"] : []),
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Detail label="Client ID" value={app.id} mono />
      <Detail
        label="Client type"
        value={`${app.clientType === "public" ? "Public" : "Confidential"}, ${app.applicationType}${app.firstParty ? ", first-party" : ""}`}
      />
      <div className="sm:col-span-2">
        <UriList label="Redirect URIs" uris={app.redirectUris} />
      </div>
      <div className="sm:col-span-2">
        <UriList
          label="Post-logout redirect URIs"
          uris={app.postLogoutRedirectUris}
        />
      </div>
      <Detail label="Grants" value={grants.join(", ") || "None"} />
      <Detail
        label="Account notices"
        value={app.noticesEnabled ? "Allowed" : "Off"}
      />
      <Detail
        label="PKCE"
        value={app.pkceRequired ? "Required" : "Not required"}
      />
      <Detail
        label="Nonce"
        value={app.nonceRequired ? "Required" : "Not required"}
      />
      {lacksCodeBinding(app) && (
        <p
          role="alert"
          className="rounded-md border border-[color:var(--highlight)]/35 bg-[color:var(--highlight)]/10 p-3 text-sm text-[var(--highlight)] sm:col-span-2"
        >
          {NO_CODE_BINDING_WARNING}
        </p>
      )}
    </div>
  );
}

function Credentials({
  app,
  canWrite,
  rotating,
  onRotate,
}: {
  app: OidcApplication;
  canWrite: boolean;
  rotating: boolean;
  onRotate: () => void;
}) {
  const setKeys = useSetOidcApplicationKeys();
  const ensureStepUp = useStepUpGuard();
  const toast = useToast();
  const [source, setSource] = useState<"jwks" | "jwksUri">(
    app.jwksUri ? "jwksUri" : "jwks",
  );
  const [jwksText, setJwksText] = useState(
    app.jwks ? JSON.stringify(app.jwks, null, 2) : "",
  );
  const [jwksUri, setJwksUri] = useState(app.jwksUri ?? "");
  const [problem, setProblem] = useState<string | null>(null);

  const method = app.tokenEndpointAuthMethod;

  const handleSaveKeys = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite) return;

    let body:
      { jwks: NonNullable<OidcApplication["jwks"]> } | { jwksUri: string };
    if (source === "jwks") {
      const parsed = parseJwks(jwksText);
      if (!parsed.ok) {
        setProblem(parsed.message);
        return;
      }
      body = { jwks: parsed.jwks };
    } else {
      body = { jwksUri: jwksUri.trim() };
    }
    setProblem(null);

    if (!(await ensureStepUp())) return;

    setKeys.mutate(
      { id: app.id, ...body },
      {
        onSuccess: () =>
          toast.success("Keys saved", `${app.name} keys were updated.`),
        onError: (err) =>
          toast.error("Key update failed", getErrorMessage(err)),
      },
    );
  };

  return (
    <div className="mt-6 space-y-3 border-t border-subtle pt-6">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <KeyRound size={16} />
        Client authentication: <AuthMethod method={method} />
      </div>

      {method === "none" && (
        <p className="text-sm text-muted">
          A public client holds no credential. It proves each sign-in with PKCE.
        </p>
      )}

      {isSharedSecretMethod(method) && (
        <div className="space-y-2">
          <p className="text-sm text-muted">
            {app.hasSecret
              ? "A secret is set. It cannot be shown again; rotate it to issue a new one."
              : "No secret is set yet."}
          </p>
          {canWrite && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={rotating}
              onClick={onRotate}
            >
              {app.hasSecret ? "Rotate secret" : "Issue secret"}
            </button>
          )}
        </div>
      )}

      {method === "private_key_jwt" && (
        <form
          className="space-y-3"
          onSubmit={(event) => void handleSaveKeys(event)}
        >
          <p className="text-sm text-muted">
            {app.jwks || app.jwksUri
              ? "The client signs its token requests with one of these public keys."
              : "No keys are registered, so this client cannot get tokens yet."}
          </p>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`key-source-${app.id}`}
                checked={source === "jwks"}
                disabled={!canWrite}
                onChange={() => setSource("jwks")}
              />
              Public key set
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`key-source-${app.id}`}
                checked={source === "jwksUri"}
                disabled={!canWrite}
                onChange={() => setSource("jwksUri")}
              />
              JWKS URI
            </label>
          </div>
          {source === "jwks" ? (
            <textarea
              aria-label="Public key set (JWKS JSON)"
              value={jwksText}
              readOnly={!canWrite}
              onChange={(event) => setJwksText(event.target.value)}
              rows={6}
              placeholder='{"keys":[{"kty":"EC","kid":"...","alg":"ES256","crv":"P-256","x":"...","y":"..."}]}'
              className="w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 font-mono text-xs"
            />
          ) : (
            <input
              aria-label="JWKS URI"
              value={jwksUri}
              readOnly={!canWrite}
              onChange={(event) => setJwksUri(event.target.value)}
              placeholder="https://app.example.com/.well-known/jwks.json"
              className="w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm"
            />
          )}
          {problem && (
            <p role="alert" className="text-sm text-[var(--highlight)]">
              {problem}
            </p>
          )}
          {canWrite && (
            <button
              type="submit"
              className="btn btn-primary"
              disabled={setKeys.isPending}
            >
              Save keys
            </button>
          )}
        </form>
      )}
    </div>
  );
}

type Grants = Record<string, string[]>;

function ApplicationResources({
  app,
  canWrite,
}: {
  app: OidcApplication;
  canWrite: boolean;
}) {
  const resourcesQuery = useOidcResources();
  const linkedQuery = useOidcApplicationResources(app.id);
  const setResources = useSetOidcApplicationResources();
  const ensureStepUp = useStepUpGuard();
  const toast = useToast();
  const [draft, setDraft] = useState<Grants | null>(null);

  const resources = resourcesQuery.data?.resources ?? [];
  const saved = useMemo<Grants>(
    () =>
      Object.fromEntries(
        (linkedQuery.data?.resources ?? []).map((link) => [
          link.resourceId,
          link.scopes,
        ]),
      ),
    [linkedQuery.data],
  );
  const grants = draft ?? saved;

  const update = (next: Grants) => setDraft(next);

  const toggleResource = (resource: OidcResource, on: boolean) => {
    const next = { ...grants };
    if (on) next[resource.id] = [];
    else delete next[resource.id];
    update(next);
  };

  const toggleScope = (resource: OidcResource, scope: string, on: boolean) => {
    const current = grants[resource.id] ?? [];
    update({
      ...grants,
      [resource.id]: on
        ? [...current, scope]
        : current.filter((value) => value !== scope),
    });
  };

  const handleSave = async () => {
    if (!canWrite) return;
    if (!(await ensureStepUp())) return;

    setResources.mutate(
      {
        id: app.id,
        resources: Object.entries(grants).map(([resourceId, scopes]) => ({
          resourceId,
          scopes,
        })),
      },
      {
        onSuccess: () => {
          setDraft(null);
          toast.success(
            "Resources saved",
            `${app.name} resources were updated.`,
          );
        },
        onError: (err) =>
          toast.error("Resource update failed", getErrorMessage(err)),
      },
    );
  };

  const loading = resourcesQuery.isLoading || linkedQuery.isLoading;
  const failed = resourcesQuery.isError
    ? resourcesQuery.error
    : linkedQuery.isError
      ? linkedQuery.error
      : null;

  return (
    <Section
      title="Allowed resources"
      description={`The APIs ${app.name} may request access tokens for, and the scopes it may ask for.`}
    >
      {loading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : failed ? (
        <QueryErrorState
          title="Could not load resources"
          error={failed}
          onRetry={() => {
            void resourcesQuery.refetch();
            void linkedQuery.refetch();
          }}
        />
      ) : resources.length === 0 ? (
        <StateMessage
          title="No resources"
          description="Define an API on the Resources page before allowing it here."
        />
      ) : (
        <div className="space-y-4">
          <ul className="space-y-3" aria-label="Allowed resources">
            {resources.map((resource) => {
              const allowed = resource.id in grants;
              return (
                <li
                  key={resource.id}
                  className="rounded-md border border-subtle bg-surface-alt p-3"
                >
                  <label className="flex items-center gap-2 text-sm font-medium text-primary">
                    <input
                      type="checkbox"
                      aria-label={`Allow ${resource.name}`}
                      checked={allowed}
                      disabled={!canWrite}
                      onChange={(event) =>
                        toggleResource(resource, event.target.checked)
                      }
                    />
                    {resource.name}
                    <span className="font-mono text-xs text-muted">
                      {resource.identifier}
                    </span>
                  </label>
                  {allowed && resource.scopes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-3 pl-6">
                      {resource.scopes.map((scope) => (
                        <label
                          key={scope}
                          className="flex items-center gap-1 font-mono text-xs text-primary"
                        >
                          <input
                            type="checkbox"
                            aria-label={`${resource.name} scope ${scope}`}
                            checked={
                              grants[resource.id]?.includes(scope) ?? false
                            }
                            disabled={!canWrite}
                            onChange={(event) =>
                              toggleScope(resource, scope, event.target.checked)
                            }
                          />
                          {scope}
                        </label>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {canWrite && (
            <div className="flex justify-end gap-2">
              {draft && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDraft(null)}
                >
                  Discard
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                disabled={!draft || setResources.isPending}
                onClick={() => void handleSave()}
              >
                Save resources
              </button>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
