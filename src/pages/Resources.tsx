/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  type OidcResource,
  OidcResourceCreateRequestSchema,
} from "@seamless-auth/types";
import Table from "../components/Table";
import Dialog from "../components/Dialog";
import Skeleton from "../components/Skeleton";
import { Section } from "../components/Section";
import { QueryErrorState, ReadOnlyNotice } from "../components/StateMessage";
import { getErrorMessage } from "../lib/errorMessage";
import { parseList } from "../lib/oidcApplications";
import {
  useCreateOidcResource,
  useDeleteOidcResource,
  useOidcResources,
  useUpdateOidcResource,
} from "../hooks/useOidcResources";
import { useAdminPermissions } from "../hooks/useAdminPermissions";
import { useStepUpGuard } from "../hooks/useStepUpGuard";
import { useToast } from "../hooks/useToast";
import { useConfirm } from "../hooks/useConfirm";

type ResourceRow = OidcResource & Record<string, unknown>;

type ResourceForm = {
  identifier: string;
  name: string;
  scopes: string;
  accessTokenTtlSeconds: string;
};

type Editing = { mode: "create" } | { mode: "edit"; resource: OidcResource };

const inputClass =
  "w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-60";

function formFor(editing: Editing): ResourceForm {
  if (editing.mode === "create") {
    return { identifier: "", name: "", scopes: "", accessTokenTtlSeconds: "" };
  }

  const { resource } = editing;
  return {
    identifier: resource.identifier,
    name: resource.name,
    scopes: resource.scopes.join(" "),
    accessTokenTtlSeconds:
      resource.accessTokenTtlSeconds === null
        ? ""
        : String(resource.accessTokenTtlSeconds),
  };
}

function requestFromForm(form: ResourceForm) {
  const ttl = form.accessTokenTtlSeconds.trim();
  return {
    identifier: form.identifier.trim(),
    name: form.name.trim(),
    scopes: parseList(form.scopes),
    accessTokenTtlSeconds: ttl === "" ? null : Number(ttl),
  };
}

export default function Resources() {
  const { data, isLoading, isError, error, refetch } = useOidcResources();
  const createResource = useCreateOidcResource();
  const updateResource = useUpdateOidcResource();
  const deleteResource = useDeleteOidcResource();
  const { canWrite } = useAdminPermissions();
  const ensureStepUp = useStepUpGuard();
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<Editing | null>(null);

  const resources = useMemo(() => data?.resources ?? [], [data]);

  const handleSubmit = async (form: ResourceForm) => {
    if (!canWrite || !editing) return;
    if (!(await ensureStepUp())) return;

    const request = requestFromForm(form);

    if (editing.mode === "create") {
      createResource.mutate(request, {
        onSuccess: ({ resource }) => {
          setEditing(null);
          toast.success("Resource created", `${resource.name} was added.`);
        },
        onError: (err) =>
          toast.error("Resource creation failed", getErrorMessage(err)),
      });
      return;
    }

    updateResource.mutate(
      {
        id: editing.resource.id,
        name: request.name,
        scopes: request.scopes,
        accessTokenTtlSeconds: request.accessTokenTtlSeconds,
      },
      {
        onSuccess: ({ resource }) => {
          setEditing(null);
          toast.success("Resource updated", `${resource.name} was saved.`);
        },
        onError: (err) =>
          toast.error("Resource update failed", getErrorMessage(err)),
      },
    );
  };

  const handleDelete = async (resource: OidcResource) => {
    if (!canWrite) return;

    if (
      !(await confirm({
        title: "Delete resource",
        description: `Delete ${resource.name}? Every application allowed it loses access, and new tokens can no longer name ${resource.identifier}.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    ) {
      return;
    }

    if (!(await ensureStepUp())) return;

    deleteResource.mutate(resource.id, {
      onSuccess: () =>
        toast.success("Resource deleted", `${resource.name} was deleted.`),
      onError: (err) =>
        toast.error("Resource deletion failed", getErrorMessage(err)),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-[28px]" />
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <QueryErrorState
        title="Could not load resources"
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
          <h1 className="heading-1">Resources</h1>
          <p className="max-w-2xl text-sm text-muted">
            The APIs applications may request access tokens for. The identifier
            is the token audience, and the scopes are what an application can be
            allowed to ask for.
          </p>
        </div>
      </section>

      <Section
        title="Resources"
        description="APIs registered with the OpenID Provider."
        actions={
          canWrite ? (
            <button
              type="button"
              className="btn btn-primary inline-flex items-center gap-2"
              onClick={() => setEditing({ mode: "create" })}
            >
              <Plus size={16} />
              New resource
            </button>
          ) : undefined
        }
      >
        {!canWrite && <ReadOnlyNotice />}
        <Table<ResourceRow>
          label="Resources"
          data={resources as ResourceRow[]}
          rowLabel={(resource) => resource.name}
          total={resources.length}
          emptyTitle="No resources"
          emptyDescription={
            canWrite
              ? "Create a resource for each API your applications call."
              : "No resources are registered."
          }
          columns={[
            {
              key: "name",
              label: "Resource",
              sortable: true,
              width: "wide",
              wrap: true,
              render: (value, row) => (
                <div className="flex flex-col">
                  <span className="font-medium text-primary">
                    {String(value)}
                  </span>
                  <span className="break-all font-mono text-xs text-muted">
                    {row.identifier}
                  </span>
                </div>
              ),
            },
            {
              key: "scopes",
              label: "Scopes",
              width: "large",
              wrap: true,
              render: (value) => (
                <span className="font-mono text-xs text-primary">
                  {(value as string[]).join(" ") || "None"}
                </span>
              ),
            },
            {
              key: "accessTokenTtlSeconds",
              label: "Token TTL",
              width: "compact",
              render: (value) => (
                <span className="text-sm text-muted">
                  {value === null ? "Default" : `${String(value)}s`}
                </span>
              ),
            },
          ]}
          actions={
            canWrite
              ? [
                  {
                    icon: Pencil,
                    label: "Edit",
                    onClick: (row: ResourceRow) =>
                      setEditing({ mode: "edit", resource: row }),
                  },
                  {
                    icon: Trash2,
                    label: "Delete",
                    variant: "danger" as const,
                    onClick: (row: ResourceRow) => void handleDelete(row),
                  },
                ]
              : []
          }
        />
      </Section>

      {editing && (
        <ResourceDialog
          editing={editing}
          isPending={createResource.isPending || updateResource.isPending}
          onSubmit={(form) => void handleSubmit(form)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ResourceDialog({
  editing,
  isPending,
  onSubmit,
  onClose,
}: {
  editing: Editing;
  isPending: boolean;
  onSubmit: (form: ResourceForm) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(() => formFor(editing));
  const [touched, setTouched] = useState(false);
  const problems = useMemo(() => {
    const result = OidcResourceCreateRequestSchema.safeParse(
      requestFromForm(form),
    );
    return result.success
      ? []
      : result.error.issues.map(
          (issue) =>
            `${issue.path.length ? `${issue.path.join(".")}: ` : ""}${issue.message}`,
        );
  }, [form]);

  const shownProblems = touched ? problems : [];

  const set = (key: keyof ResourceForm, value: string) => {
    setTouched(true);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (problems.length > 0) return;
    onSubmit(form);
  };

  return (
    <Dialog
      title={
        editing.mode === "create"
          ? "New resource"
          : `Edit ${editing.resource.name}`
      }
      description="An API that accepts access tokens from the OpenID Provider."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Identifier">
          <input
            value={form.identifier}
            onChange={(event) => set("identifier", event.target.value)}
            disabled={editing.mode === "edit"}
            placeholder="https://api.example.com"
            className={inputClass}
          />
        </Field>
        {editing.mode === "edit" && (
          <p className="text-xs text-muted">
            The identifier is fixed because issued tokens carry it as their
            audience.
          </p>
        )}
        <Field label="Name">
          <input
            value={form.name}
            onChange={(event) => set("name", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Scopes (space or comma separated)">
          <input
            value={form.scopes}
            onChange={(event) => set("scopes", event.target.value)}
            placeholder="orders:read orders:write"
            className={`${inputClass} font-mono`}
          />
        </Field>
        {editing.mode === "edit" && (
          <p className="text-xs text-muted">
            Removing a scope also removes it from every application allowed it.
          </p>
        )}
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

        {shownProblems.length > 0 && (
          <ul
            role="alert"
            className="space-y-1 rounded-md border border-subtle bg-surface-alt p-3 text-xs text-[var(--highlight)]"
          >
            {shownProblems.map((problem) => (
              <li key={problem}>{problem}</li>
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
              : editing.mode === "create"
                ? "Create resource"
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
