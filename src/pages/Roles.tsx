/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import {
  CreateOrganizationRoleRequestSchema,
  CreatePermissionRequestSchema,
  type Permission,
  type RoleDefinition,
} from "@seamless-auth/types";
import Dialog from "../components/Dialog";
import RoleChips from "../components/RoleChips";
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
  useCreateOrganizationRole,
  useCreatePermission,
  useDeleteOrganizationRole,
  useDeletePermission,
  usePermissionCatalogue,
  useRoleDefinitions,
  useSetRolePermissions,
  useUpdateOrganizationRole,
  useUpdatePermission,
} from "../hooks/useRolePermissions";
import { useStepUpGuard } from "../hooks/useStepUpGuard";
import { useToast } from "../hooks/useToast";
import { describeRefusal, isRouteMissing } from "../lib/roleRefusals";

type PermissionRow = Permission & { grantedBy: string[] };
type RoleRow = RoleDefinition;

const inputClass =
  "w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-60";

const NAME_HINT =
  "Letters, numbers and hyphens, with colons between parts, such as invoices:read. No spaces or underscores, up to 80 characters.";

function roleLabel(role: { kind: string; name: string }) {
  return `${role.kind} role ${role.name}`;
}

function nullableText(value: string) {
  return value.trim() || null;
}

export default function Roles() {
  const permissionQuery = usePermissionCatalogue();
  const roleQuery = useRoleDefinitions();
  const createPermission = useCreatePermission();
  const updatePermission = useUpdatePermission();
  const deletePermission = useDeletePermission();
  const setRolePermissions = useSetRolePermissions();
  const createRole = useCreateOrganizationRole();
  const updateRole = useUpdateOrganizationRole();
  const deleteRole = useDeleteOrganizationRole();
  const { canWrite } = useAdminPermissions();
  const ensureStepUp = useStepUpGuard();
  const toast = useToast();
  const confirm = useConfirm();

  const [permissionDialog, setPermissionDialog] = useState<
    Permission | "new" | null
  >(null);
  const [roleDialog, setRoleDialog] = useState<RoleDefinition | "new" | null>(
    null,
  );
  const [mappingRole, setMappingRole] = useState<RoleDefinition | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [deleteRefusal, setDeleteRefusal] = useState<{
    title: string;
    description: string;
  } | null>(null);

  const roles = useMemo(() => roleQuery.data?.roles ?? [], [roleQuery.data]);
  const instanceRoles = useMemo(
    () => roles.filter((role) => role.kind === "instance"),
    [roles],
  );
  const organizationRoles = useMemo(
    () => roles.filter((role) => role.kind === "organization"),
    [roles],
  );
  const permissions = useMemo<PermissionRow[]>(
    () =>
      (permissionQuery.data?.permissions ?? []).map((permission) => ({
        ...permission,
        grantedBy: roles
          .filter((role) => role.permissions.includes(permission.name))
          .map(roleLabel),
      })),
    [permissionQuery.data, roles],
  );
  const permissionNames = useMemo(
    () => permissions.map((permission) => permission.name),
    [permissions],
  );

  const openPermissionDialog = (value: Permission | "new") => {
    setDialogError(null);
    setPermissionDialog(value);
  };
  const openRoleDialog = (value: RoleDefinition | "new") => {
    setDialogError(null);
    setRoleDialog(value);
  };
  const openMapping = (role: RoleDefinition) => {
    setDialogError(null);
    setMappingRole(role);
  };

  const handlePermissionSubmit = async (form: {
    name: string;
    description: string;
  }) => {
    if (!canWrite || !permissionDialog) return;
    if (!(await ensureStepUp())) return;

    const onError = (error: Error) => setDialogError(describeRefusal(error));

    if (permissionDialog === "new") {
      createPermission.mutate(
        {
          name: form.name.trim(),
          ...(form.description.trim()
            ? { description: form.description.trim() }
            : {}),
        },
        {
          onSuccess: ({ permission }) => {
            setPermissionDialog(null);
            toast.success(
              "Permission created",
              `${permission.name} was added. Map it to a role to grant it.`,
            );
          },
          onError,
        },
      );
      return;
    }

    updatePermission.mutate(
      {
        name: permissionDialog.name,
        description: nullableText(form.description),
      },
      {
        onSuccess: ({ permission }) => {
          setPermissionDialog(null);
          toast.success("Permission updated", `${permission.name} was saved.`);
        },
        onError,
      },
    );
  };

  const handlePermissionDelete = async (permission: PermissionRow) => {
    if (!canWrite) return;

    if (
      !(await confirm({
        title: "Delete permission",
        description: `Delete ${permission.name} from the catalogue? A role that still grants it has to give it up first.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    ) {
      return;
    }

    if (!(await ensureStepUp())) return;

    setDeleteRefusal(null);
    deletePermission.mutate(permission.name, {
      onSuccess: () =>
        toast.success("Permission deleted", `${permission.name} was deleted.`),
      onError: (error) =>
        setDeleteRefusal({
          title: `Could not delete ${permission.name}`,
          description: describeRefusal(error),
        }),
    });
  };

  const handleRoleSubmit = async (form: {
    name: string;
    description: string;
    permissions: string[];
  }) => {
    if (!canWrite || !roleDialog) return;
    if (!(await ensureStepUp())) return;

    const onError = (error: Error) => setDialogError(describeRefusal(error));

    if (roleDialog === "new") {
      createRole.mutate(
        {
          name: form.name.trim(),
          ...(form.description.trim()
            ? { description: form.description.trim() }
            : {}),
          permissions: form.permissions,
        },
        {
          onSuccess: ({ role }) => {
            setRoleDialog(null);
            toast.success(
              "Organization role created",
              `${role.name} can now be assigned in any organization.`,
            );
          },
          onError,
        },
      );
      return;
    }

    updateRole.mutate(
      { name: roleDialog.name, description: nullableText(form.description) },
      {
        onSuccess: ({ role }) => {
          setRoleDialog(null);
          toast.success("Organization role updated", `${role.name} was saved.`);
        },
        onError,
      },
    );
  };

  const handleRoleDelete = async (role: RoleDefinition) => {
    if (!canWrite) return;

    if (
      !(await confirm({
        title: "Delete organization role",
        description: `Delete ${role.name} from the catalogue? It can only be deleted once no membership holds it.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    ) {
      return;
    }

    if (!(await ensureStepUp())) return;

    setDeleteRefusal(null);
    deleteRole.mutate(role.name, {
      onSuccess: () =>
        toast.success("Organization role deleted", `${role.name} was deleted.`),
      onError: (error) =>
        setDeleteRefusal({
          title: `Could not delete ${role.name}`,
          description: describeRefusal(error),
        }),
    });
  };

  const handleMappingSubmit = async (selected: string[]) => {
    if (!canWrite || !mappingRole) return;
    if (!(await ensureStepUp())) return;

    setRolePermissions.mutate(
      {
        kind: mappingRole.kind,
        name: mappingRole.name,
        permissions: selected,
      },
      {
        onSuccess: ({ role }) => {
          setMappingRole(null);
          toast.success(
            "Role permissions saved",
            `Holders of ${roleLabel(role)} get this change when their next access token is issued.`,
          );
        },
        onError: (error) => setDialogError(describeRefusal(error)),
      },
    );
  };

  const header = (
    <section className="rounded-[28px] border border-subtle bg-surface px-6 py-6 lg:px-8 lg:py-8">
      <div className="space-y-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
          Access model
        </div>
        <h1 className="heading-1">Roles and permissions</h1>
        <p className="max-w-2xl text-sm text-muted">
          Roles say who someone is. Permissions say what they can do, and a role
          grants a set of them. Permissions match exactly, with no wildcards, so
          invoices:write does not satisfy invoices:read.
        </p>
      </div>
    </section>
  );

  if (permissionQuery.isLoading || roleQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-[28px]" />
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
    );
  }

  if (
    isRouteMissing(permissionQuery.error) ||
    isRouteMissing(roleQuery.error)
  ) {
    return (
      <div className="space-y-8">
        {header}
        <StateMessage
          tone="warning"
          title="Needs Seamless Auth API v0.23"
          description="The API answered 404 for the roles and permissions routes, so there is nothing to manage here yet. Upgrade the API to v0.23 or later. If this console reaches the API through a server adapter, update the adapter too so it forwards these routes."
        />
      </div>
    );
  }

  if (permissionQuery.isError || roleQuery.isError) {
    return (
      <div className="space-y-8">
        {header}
        <QueryErrorState
          title="Could not load roles and permissions"
          error={permissionQuery.error ?? roleQuery.error}
          onRetry={() => {
            void permissionQuery.refetch();
            void roleQuery.refetch();
          }}
        />
      </div>
    );
  }

  const mappingAction = {
    icon: ListChecks,
    label: "Edit permissions",
    onClick: (row: RoleRow) => openMapping(row),
  };

  return (
    <div className="space-y-8">
      {header}

      <div className="grid gap-4 lg:grid-cols-2">
        <StateMessage
          title="When a change applies"
          description="Access tokens carry permissions, so a change reaches a user when their next access token is issued, within the access token TTL. Tokens already issued keep what they were issued with until they expire."
        />
        <StateMessage
          title="Instance and organization roles are separate"
          description="An instance admin and an organization admin are different roles that never share a grant, even with the same name. Mapping a permission to one does nothing for the other."
        />
      </div>

      {!canWrite && (
        <ReadOnlyNotice description="You have read-only admin access. Create, edit, and delete controls are hidden." />
      )}

      {deleteRefusal && (
        <StateMessage
          tone="error"
          title={deleteRefusal.title}
          description={deleteRefusal.description}
        />
      )}

      <Section
        title="Permissions"
        description="The catalogue of what a role can grant."
        actions={
          canWrite ? (
            <button
              type="button"
              className="btn btn-primary inline-flex items-center gap-2"
              onClick={() => openPermissionDialog("new")}
            >
              <Plus size={16} />
              New permission
            </button>
          ) : undefined
        }
      >
        <Table<PermissionRow>
          label="Permissions"
          data={permissions}
          rowLabel={(permission) => permission.name}
          total={permissions.length}
          emptyTitle="No permissions"
          emptyDescription={
            canWrite
              ? "Create a permission, then map it to a role to grant it."
              : "No permissions are defined."
          }
          columns={[
            {
              key: "name",
              label: "Permission",
              sortable: true,
              width: "wide",
              wrap: true,
              render: (value, row) => (
                <NameCell name={value} description={row.description} />
              ),
            },
            {
              key: "grantedBy",
              label: "Granted by",
              width: "large",
              wrap: true,
              render: (value) => <ChipList values={value} empty="No role" />,
            },
          ]}
          actions={
            canWrite
              ? [
                  {
                    icon: Pencil,
                    label: "Edit",
                    onClick: (row: PermissionRow) => openPermissionDialog(row),
                  },
                  {
                    icon: Trash2,
                    label: "Delete",
                    variant: "danger" as const,
                    onClick: (row: PermissionRow) =>
                      void handlePermissionDelete(row),
                  },
                ]
              : []
          }
        />
      </Section>

      <Section
        title="Organization roles"
        description="Held on a membership and shared by every organization on this instance. Members can only be assigned a role from this catalogue. owner, admin and member are built in."
        actions={
          canWrite ? (
            <button
              type="button"
              className="btn btn-primary inline-flex items-center gap-2"
              onClick={() => openRoleDialog("new")}
            >
              <Plus size={16} />
              New organization role
            </button>
          ) : undefined
        }
      >
        <Table<RoleRow>
          label="Organization roles"
          data={organizationRoles}
          rowLabel={(role) => role.name}
          total={organizationRoles.length}
          emptyTitle="No organization roles"
          emptyDescription="No organization roles are defined."
          columns={[
            {
              key: "name",
              label: "Role",
              sortable: true,
              width: "wide",
              wrap: true,
              render: (value, row) => (
                <NameCell
                  name={value}
                  description={row.description}
                  badge={row.builtIn ? "Built in" : undefined}
                />
              ),
            },
            {
              key: "permissions",
              label: "Grants",
              width: "large",
              wrap: true,
              render: (value) => <ChipList values={value} empty="Nothing" />,
            },
          ]}
          actions={
            canWrite
              ? [
                  mappingAction,
                  {
                    icon: Pencil,
                    label: "Edit",
                    onClick: (row: RoleRow) => openRoleDialog(row),
                  },
                  {
                    icon: Trash2,
                    label: "Delete",
                    variant: "danger" as const,
                    hidden: (row: RoleRow) => row.builtIn,
                    onClick: (row: RoleRow) => void handleRoleDelete(row),
                  },
                ]
              : []
          }
        />
      </Section>

      <Section
        title="Instance roles"
        description="Held on the user. This list comes from the available roles in system configuration."
        actions={
          <Link to="/system" className="btn btn-secondary inline-flex">
            Add or remove in System
          </Link>
        }
      >
        <Table<RoleRow>
          label="Instance roles"
          data={instanceRoles}
          rowLabel={(role) => role.name}
          total={instanceRoles.length}
          emptyTitle="No instance roles"
          emptyDescription="Add one to the available roles in system configuration."
          columns={[
            {
              key: "name",
              label: "Role",
              sortable: true,
              width: "wide",
              wrap: true,
              render: (value) => <NameCell name={value} />,
            },
            {
              key: "permissions",
              label: "Grants",
              width: "large",
              wrap: true,
              render: (value) => <ChipList values={value} empty="Nothing" />,
            },
          ]}
          actions={canWrite ? [mappingAction] : []}
        />
      </Section>

      {permissionDialog && (
        <PermissionDialog
          permission={permissionDialog === "new" ? null : permissionDialog}
          error={dialogError}
          isPending={createPermission.isPending || updatePermission.isPending}
          onSubmit={(form) => void handlePermissionSubmit(form)}
          onClose={() => setPermissionDialog(null)}
        />
      )}

      {roleDialog && (
        <OrganizationRoleDialog
          role={roleDialog === "new" ? null : roleDialog}
          permissionNames={permissionNames}
          error={dialogError}
          isPending={createRole.isPending || updateRole.isPending}
          onSubmit={(form) => void handleRoleSubmit(form)}
          onClose={() => setRoleDialog(null)}
        />
      )}

      {mappingRole && (
        <MappingDialog
          role={mappingRole}
          permissionNames={permissionNames}
          error={dialogError}
          isPending={setRolePermissions.isPending}
          onSubmit={(selected) => void handleMappingSubmit(selected)}
          onClose={() => setMappingRole(null)}
        />
      )}
    </div>
  );
}

function PermissionDialog({
  permission,
  error,
  isPending,
  onSubmit,
  onClose,
}: {
  permission: Permission | null;
  error: string | null;
  isPending: boolean;
  onSubmit: (form: { name: string; description: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(permission?.name ?? "");
  const [description, setDescription] = useState(permission?.description ?? "");
  const [submitted, setSubmitted] = useState(false);
  const nameValid =
    permission !== null ||
    CreatePermissionRequestSchema.shape.name.safeParse(name).success;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (!nameValid) return;
    onSubmit({ name, description });
  };

  return (
    <Dialog
      title={permission ? `Edit ${permission.name}` : "New permission"}
      description="A name a role can grant and a backend can check."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Name">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={permission !== null}
            placeholder="invoices:read"
            className={`${inputClass} font-mono`}
          />
        </Field>
        <FieldNote>
          {permission
            ? "The name is fixed because tokens and backends refer to it."
            : NAME_HINT}
        </FieldNote>
        <Field label="Description">
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
            className={inputClass}
          />
        </Field>

        <DialogFooter
          problem={
            submitted && !nameValid
              ? "That name cannot be used. Check the format above."
              : error
          }
          isPending={isPending}
          submitLabel={permission ? "Save" : "Create permission"}
          onClose={onClose}
        />
      </form>
    </Dialog>
  );
}

function OrganizationRoleDialog({
  role,
  permissionNames,
  error,
  isPending,
  onSubmit,
  onClose,
}: {
  role: RoleDefinition | null;
  permissionNames: string[];
  error: string | null;
  isPending: boolean;
  onSubmit: (form: {
    name: string;
    description: string;
    permissions: string[];
  }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const nameValid =
    role !== null ||
    CreateOrganizationRoleRequestSchema.shape.name.safeParse(name).success;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (!nameValid) return;
    onSubmit({ name, description, permissions });
  };

  return (
    <Dialog
      title={role ? `Edit ${role.name}` : "New organization role"}
      description="Assignable in any organization on this instance. It has nothing to do with an instance role of the same name."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Name">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={role !== null}
            placeholder="billing"
            className={`${inputClass} font-mono`}
          />
        </Field>
        <FieldNote>
          {role ? "The name is fixed because memberships hold it." : NAME_HINT}
        </FieldNote>
        <Field label="Description">
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
            className={inputClass}
          />
        </Field>
        {role === null && (
          <div className="space-y-2">
            <span className="block text-xs uppercase tracking-[0.18em] text-muted">
              Grants
            </span>
            <PermissionPicker
              permissionNames={permissionNames}
              selected={permissions}
              onChange={setPermissions}
            />
          </div>
        )}

        <DialogFooter
          problem={
            submitted && !nameValid
              ? "That name cannot be used. Check the format above."
              : error
          }
          isPending={isPending}
          submitLabel={role ? "Save" : "Create role"}
          onClose={onClose}
        />
      </form>
    </Dialog>
  );
}

function MappingDialog({
  role,
  permissionNames,
  error,
  isPending,
  onSubmit,
  onClose,
}: {
  role: RoleDefinition;
  permissionNames: string[];
  error: string | null;
  isPending: boolean;
  onSubmit: (selected: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(role.permissions);
  const dirty =
    selected.length !== role.permissions.length ||
    selected.some((name) => !role.permissions.includes(name));
  const otherKind = role.kind === "instance" ? "organization" : "instance";

  return (
    <Dialog
      title={`Permissions for ${roleLabel(role)}`}
      description={`Saving replaces everything this role grants. An ${otherKind} role named ${role.name} is a different role and does not change.`}
      onClose={onClose}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(selected);
        }}
      >
        <PermissionPicker
          permissionNames={Array.from(
            new Set([...permissionNames, ...role.permissions]),
          )}
          selected={selected}
          onChange={setSelected}
        />
        <FieldNote>
          Each holder gets this change when their next access token is issued.
        </FieldNote>

        <DialogFooter
          problem={error}
          isPending={isPending}
          submitDisabled={!dirty}
          submitLabel="Save"
          onClose={onClose}
        />
      </form>
    </Dialog>
  );
}

function PermissionPicker({
  permissionNames,
  selected,
  onChange,
}: {
  permissionNames: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  if (permissionNames.length === 0) {
    return (
      <p className="rounded-md border border-subtle bg-surface-alt p-3 text-sm text-muted">
        The permission catalogue is empty. Create a permission first.
      </p>
    );
  }

  return (
    <RoleChips
      roles={permissionNames}
      selected={selected}
      onChange={onChange}
    />
  );
}

function DialogFooter({
  problem,
  isPending,
  submitDisabled,
  submitLabel,
  onClose,
}: {
  problem: string | null;
  isPending: boolean;
  submitDisabled?: boolean;
  submitLabel: string;
  onClose: () => void;
}) {
  return (
    <>
      {problem && (
        <StateMessage tone="error" title="Not saved" description={problem} />
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || submitDisabled}
          className="btn btn-primary disabled:opacity-50"
        >
          {isPending ? "Saving..." : submitLabel}
        </button>
      </div>
    </>
  );
}

function NameCell({
  name,
  description,
  badge,
}: {
  name: string;
  description?: string | null;
  badge?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex flex-wrap items-center gap-2">
        <span className="break-all font-mono text-sm font-medium text-primary">
          {name}
        </span>
        {badge && (
          <span className="rounded-full border border-subtle bg-surface-alt px-2 py-0.5 text-xs text-muted">
            {badge}
          </span>
        )}
      </span>
      {description && <span className="text-xs text-muted">{description}</span>}
    </div>
  );
}

function ChipList({ values, empty }: { values: string[]; empty: string }) {
  if (values.length === 0) {
    return <span className="text-xs text-muted">{empty}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {values.map((value) => (
        <span
          key={value}
          className="rounded-full border border-subtle bg-surface-alt px-2 py-0.5 text-xs text-primary"
        >
          {value}
        </span>
      ))}
    </div>
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

function FieldNote({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>;
}
