/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { FormEvent } from "react";
import { useId, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  customClaimsByteLength,
  type CustomClaimSource,
  type CustomClaimSourceKind,
  type SetCustomClaimsRequest,
} from "@seamless-auth/types";
import Dialog from "../components/Dialog";
import {
  ChipList,
  DialogFooter,
  Field,
  FieldNote,
  NeedsUpgrade,
  PageHeader,
} from "../components/FormParts";
import { Section } from "../components/Section";
import Skeleton from "../components/Skeleton";
import {
  QueryErrorState,
  ReadOnlyNotice,
  StateMessage,
} from "../components/StateMessage";
import Table from "../components/Table";
import { useAdminPermissions } from "../hooks/useAdminPermissions";
import { useConfirm } from "../hooks/useConfirm";
import {
  useCustomClaims,
  useDeleteCustomClaims,
  useSetCustomClaims,
} from "../hooks/useCustomClaims";
import { useOidcApplications } from "../hooks/useOidcApplications";
import { useRoleDefinitions } from "../hooks/useRolePermissions";
import { useStepUpGuard } from "../hooks/useStepUpGuard";
import { useToast } from "../hooks/useToast";
import { describeWriteRefusal, formatTimestamp } from "../lib/callouts";
import { checkClaims, type ReservedClaims } from "../lib/customClaims";
import { inputClass } from "../lib/formStyles";
import { isRouteMissing } from "../lib/roleRefusals";

type SourceRow = CustomClaimSource & { names: string[]; bytes: number };

const KIND_LABELS: Record<CustomClaimSourceKind, string> = {
  instance_role: "Instance role",
  organization_role: "Organization role",
  oidc_client: "OpenID Provider client",
};

const KINDS = Object.keys(KIND_LABELS) as CustomClaimSourceKind[];

function sourceLabel(source: {
  sourceKind: CustomClaimSourceKind;
  sourceName: string;
}) {
  return `${KIND_LABELS[source.sourceKind].toLowerCase()} ${source.sourceName}`;
}

export default function CustomClaims() {
  const claimQuery = useCustomClaims();
  const roleQuery = useRoleDefinitions();
  const applicationQuery = useOidcApplications();
  const setClaims = useSetCustomClaims();
  const deleteClaims = useDeleteCustomClaims();
  const { canWrite } = useAdminPermissions();
  const ensureStepUp = useStepUpGuard();
  const toast = useToast();
  const confirm = useConfirm();

  const [editing, setEditing] = useState<CustomClaimSource | "new" | null>(
    null,
  );
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [deleteRefusal, setDeleteRefusal] = useState<string | null>(null);

  const reserved = useMemo<ReservedClaims>(
    () => ({
      names: claimQuery.data?.reservedNames ?? [],
      prefixes: claimQuery.data?.reservedPrefixes ?? [],
    }),
    [claimQuery.data],
  );
  const budgetBytes = claimQuery.data?.budgetBytes ?? 1024;

  const rows = useMemo<SourceRow[]>(
    () =>
      (claimQuery.data?.sources ?? []).map((source) => ({
        ...source,
        names: Object.keys(source.claims),
        bytes: customClaimsByteLength(source.claims),
      })),
    [claimQuery.data],
  );

  const suggestions = useMemo<Record<CustomClaimSourceKind, string[]>>(() => {
    const roles = roleQuery.data?.roles ?? [];
    return {
      instance_role: roles
        .filter((role) => role.kind === "instance")
        .map((role) => role.name),
      organization_role: roles
        .filter((role) => role.kind === "organization")
        .map((role) => role.name),
      oidc_client: (applicationQuery.data?.applications ?? []).map(
        (application) => application.id,
      ),
    };
  }, [roleQuery.data, applicationQuery.data]);

  const handleSubmit = async (form: {
    sourceKind: CustomClaimSourceKind;
    sourceName: string;
    request: SetCustomClaimsRequest;
  }) => {
    if (!canWrite || !editing) return;
    if (!(await ensureStepUp())) return;

    setClaims.mutate(
      {
        sourceKind: form.sourceKind,
        sourceName: form.sourceName,
        claims: form.request.claims,
      },
      {
        onSuccess: ({ source }) => {
          setEditing(null);
          toast.success(
            "Custom claims saved",
            `Tokens for ${sourceLabel(source)} carry them from the next one issued.`,
          );
        },
        onError: (error) => setDialogError(describeWriteRefusal(error)),
      },
    );
  };

  const handleDelete = async (row: SourceRow) => {
    if (!canWrite) return;

    if (
      !(await confirm({
        title: "Delete custom claims",
        description: `Delete every custom claim for ${sourceLabel(row)}? Tokens issued from now on stop carrying them.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    ) {
      return;
    }

    if (!(await ensureStepUp())) return;

    setDeleteRefusal(null);
    deleteClaims.mutate(
      { sourceKind: row.sourceKind, sourceName: row.sourceName },
      {
        onSuccess: () =>
          toast.success(
            "Custom claims deleted",
            `${sourceLabel(row)} adds no claims now.`,
          ),
        onError: (error) => setDeleteRefusal(describeWriteRefusal(error)),
      },
    );
  };

  const header = (
    <PageHeader eyebrow="Access model" title="Custom claims">
      Fixed values a role or an OpenID Provider client adds to its tokens, such
      as a plan tier or a tenant id. A pre_token login hook can add more at
      sign-in.
    </PageHeader>
  );

  if (claimQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-[28px]" />
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
    );
  }

  if (isRouteMissing(claimQuery.error)) {
    return (
      <div className="space-y-8">
        {header}
        <NeedsUpgrade what="custom claim" />
      </div>
    );
  }

  if (claimQuery.isError) {
    return (
      <div className="space-y-8">
        {header}
        <QueryErrorState
          title="Could not load custom claims"
          error={claimQuery.error}
          onRetry={() => void claimQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {header}

      <div className="grid gap-4 lg:grid-cols-2">
        <StateMessage
          title="Which value wins"
          description="Lowest precedence first: an instance role, an organization role (while that organization is active), an OpenID Provider client (provider tokens only), then the pre_token hook. Roles of one kind apply in name order."
        />
        <StateMessage
          title={`One ${budgetBytes} byte budget per token`}
          description={`Each set may be up to ${budgetBytes} bytes. In a token, permissions, organization roles and custom claims share one ${budgetBytes} byte budget. When they do not all fit, permissions give way first and the token carries permissions_omitted: true beside the custom claims. Only if the custom claims do not fit even then are they all dropped. Nothing is trimmed partially.`}
        />
      </div>

      <details className="rounded-xl border border-subtle bg-surface px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">
          Reserved claim names
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-muted">
            These are refused when written and stripped when a hook returns
            them, so no source can assert, for example, an email address the
            user never proved.
          </p>
          <ChipList values={reserved.names} empty="None" />
          <p className="text-muted">
            Also any name starting with{" "}
            {reserved.prefixes.map((prefix, index) => (
              <span key={prefix}>
                {index > 0 && " or "}
                <code className="font-mono">{prefix}</code>
              </span>
            ))}
            .
          </p>
        </div>
      </details>

      {!canWrite && (
        <ReadOnlyNotice description="You have read-only admin access. Add, edit and delete controls are hidden." />
      )}

      {deleteRefusal && (
        <StateMessage
          tone="error"
          title="Could not delete the claims"
          description={deleteRefusal}
        />
      )}

      <Section
        title="Claim sets"
        description="Each role or client has at most one set. Saving replaces the whole set."
        actions={
          canWrite ? (
            <button
              type="button"
              className="btn btn-primary inline-flex items-center gap-2"
              onClick={() => {
                setDialogError(null);
                setEditing("new");
              }}
            >
              <Plus size={16} />
              Add claims
            </button>
          ) : undefined
        }
      >
        <Table<SourceRow>
          label="Custom claim sets"
          data={rows}
          rowKey={(row) => `${row.sourceKind}:${row.sourceName}`}
          rowLabel={(row) => row.sourceName}
          emptyTitle="No custom claims"
          emptyDescription={
            canWrite
              ? "Add claims to a role or client to have its tokens carry them."
              : "No role or client adds custom claims."
          }
          columns={[
            {
              key: "sourceName",
              label: "Source",
              width: "wide",
              wrap: true,
              render: (value, row) => (
                <div className="flex flex-col gap-0.5">
                  <span className="break-all font-mono text-sm font-medium text-primary">
                    {value}
                  </span>
                  <span className="text-xs text-muted">
                    {KIND_LABELS[row.sourceKind]}
                  </span>
                </div>
              ),
            },
            {
              key: "names",
              label: "Claims",
              width: "large",
              wrap: true,
              render: (value) => <ChipList values={value} empty="None" />,
            },
            {
              key: "bytes",
              label: "Size",
              width: "small",
              align: "right",
              render: (value) => `${value} of ${budgetBytes} bytes`,
            },
            {
              key: "updatedAt",
              label: "Updated",
              width: "medium",
              render: (value) => formatTimestamp(value),
            },
          ]}
          actions={
            canWrite
              ? [
                  {
                    icon: Pencil,
                    label: "Edit",
                    onClick: (row: SourceRow) => {
                      setDialogError(null);
                      setEditing(row);
                    },
                  },
                  {
                    icon: Trash2,
                    label: "Delete",
                    variant: "danger" as const,
                    onClick: (row: SourceRow) => void handleDelete(row),
                  },
                ]
              : []
          }
        />
      </Section>

      {editing && (
        <ClaimsDialog
          source={editing === "new" ? null : editing}
          suggestions={suggestions}
          reserved={reserved}
          budgetBytes={budgetBytes}
          error={dialogError}
          isPending={setClaims.isPending}
          onSubmit={(form) => void handleSubmit(form)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ClaimsDialog({
  source,
  suggestions,
  reserved,
  budgetBytes,
  error,
  isPending,
  onSubmit,
  onClose,
}: {
  source: CustomClaimSource | null;
  suggestions: Record<CustomClaimSourceKind, string[]>;
  reserved: ReservedClaims;
  budgetBytes: number;
  error: string | null;
  isPending: boolean;
  onSubmit: (form: {
    sourceKind: CustomClaimSourceKind;
    sourceName: string;
    request: SetCustomClaimsRequest;
  }) => void;
  onClose: () => void;
}) {
  const listId = useId();
  const [sourceKind, setSourceKind] = useState<CustomClaimSourceKind>(
    source?.sourceKind ?? "instance_role",
  );
  const [sourceName, setSourceName] = useState(source?.sourceName ?? "");
  const [text, setText] = useState(
    JSON.stringify(source?.claims ?? {}, null, 2),
  );
  const [submitted, setSubmitted] = useState(false);

  const check = checkClaims(text, reserved, budgetBytes);
  const nameMissing = !sourceName.trim();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (!check.ok || nameMissing) return;
    onSubmit({
      sourceKind,
      sourceName: sourceName.trim(),
      request: check.request,
    });
  };

  return (
    <Dialog
      className="max-h-[90vh] overflow-y-auto"
      title={source ? `Claims for ${sourceLabel(source)}` : "Add custom claims"}
      description="Literal JSON values, nested at most 3 levels. Names are lowercase letters, digits and underscores, starting with a letter."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Source kind">
          <select
            value={sourceKind}
            disabled={source !== null}
            onChange={(event) =>
              setSourceKind(event.target.value as CustomClaimSourceKind)
            }
            className={inputClass}
          >
            {KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={sourceKind === "oidc_client" ? "Client ID" : "Role"}>
          <input
            value={sourceName}
            disabled={source !== null}
            list={listId}
            onChange={(event) => setSourceName(event.target.value)}
            className={`${inputClass} font-mono`}
          />
        </Field>
        <datalist id={listId}>
          {suggestions[sourceKind].map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        {sourceKind === "oidc_client" && (
          <FieldNote>
            Applied by the OpenID Provider to the tokens it issues for this
            client.
          </FieldNote>
        )}

        <Field label="Claims (JSON)">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={8}
            spellCheck={false}
            className={`${inputClass} font-mono`}
          />
        </Field>
        <FieldNote>
          {check.bytes === null
            ? `Up to ${budgetBytes} bytes serialized.`
            : `${check.bytes} of ${budgetBytes} bytes.`}
        </FieldNote>

        <DialogFooter
          problem={
            submitted && nameMissing
              ? "Name the role or client these claims belong to."
              : submitted && !check.ok
                ? check.problem
                : error
          }
          isPending={isPending}
          submitLabel="Save claims"
          onClose={onClose}
        />
      </form>
    </Dialog>
  );
}
