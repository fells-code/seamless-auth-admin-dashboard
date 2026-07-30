/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ComponentType, FormEvent, ReactNode } from "react";
import { useId, useMemo, useState } from "react";
import { Building2, Pencil, Plus, Save, Trash2, Users2 } from "lucide-react";
import Table from "../components/Table";
import Dialog from "../components/Dialog";
import SearchInput from "../components/SearchInput";
import RoleChips from "../components/RoleChips";
import { useRoles } from "../hooks/useRoles";
import Skeleton from "../components/Skeleton";
import StatCard from "../components/StatCard";
import { Section } from "../components/Section";
import {
  QueryErrorState,
  ReadOnlyNotice,
  StateMessage,
} from "../components/StateMessage";
import { getErrorMessage } from "../lib/errorMessage";
import {
  useAddOrganizationMember,
  useCreateOrganization,
  useOrganizationMembers,
  useOrganizations,
  useUpdateOrganizationMember,
  useRemoveOrganizationMember,
  useUpdateOrganization,
} from "../hooks/useOrganizations";
import type {
  Organization,
  OrganizationMembership,
} from "@seamless-auth/types";
import { useAdminPermissions } from "../hooks/useAdminPermissions";
import { useStepUpGuard } from "../hooks/useStepUpGuard";
import { useToast } from "../hooks/useToast";
import { useConfirm } from "../hooks/useConfirm";

type OrganizationRow = Organization & Record<string, unknown>;
type OrganizationMembershipRow = OrganizationMembership &
  Record<string, unknown>;

function parseCsv(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleDateString();
}

function formatList(values?: string[]) {
  if (!values?.length) return "None";
  return values.join(", ");
}

export default function Organizations() {
  const { data, isLoading, isError, error, refetch } = useOrganizations();
  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization();
  const addMember = useAddOrganizationMember();
  const removeMember = useRemoveOrganizationMember();
  const { canWrite } = useAdminPermissions();
  const ensureStepUp = useStepUpGuard();
  const toast = useToast();
  const confirm = useConfirm();

  const organizations = useMemo(() => data?.organizations ?? [], [data]);
  const total = data?.total ?? organizations.length;

  const memberTotal = organizations.reduce(
    (sum, organization) => sum + (organization.memberCount ?? 0),
    0,
  );

  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    string | null
  >(null);
  const selectedOrganization = useMemo(
    () =>
      organizations.find(
        (organization) => organization.id === selectedOrganizationId,
      ) ??
      organizations[0] ??
      null,
    [organizations, selectedOrganizationId],
  );

  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const updateMember = useUpdateOrganizationMember();
  const { data: roleData } = useRoles();
  // Roles are chosen from what the instance actually defines. Free-form text
  // accepted typos silently, and a mistyped role simply grants nothing.
  const availableRoles = roleData?.roles ?? [];
  const defaultMemberRoles = availableRoles.includes("member")
    ? ["member"]
    : [];
  const [organizationSearch, setOrganizationSearch] = useState("");
  // Filters what the feed returned. The endpoint takes no search parameter, so
  // this narrows the loaded page rather than querying the server.
  const visibleOrganizations = useMemo(() => {
    const query = organizationSearch.trim().toLowerCase();
    if (!query) return organizations;

    return organizations.filter((organization) =>
      `${organization.name} ${organization.slug}`.toLowerCase().includes(query),
    );
  }, [organizations, organizationSearch]);

  const [memberRoles, setMemberRoles] = useState<string[]>([]);
  const [editingMember, setEditingMember] = useState<
    OrganizationMembership | undefined
  >(undefined);
  const [editMemberRoles, setEditMemberRoles] = useState<string[]>([]);
  const [editMemberScopes, setEditMemberScopes] = useState("");
  const [memberScopes, setMemberScopes] = useState("");

  const {
    data: memberData,
    isLoading: membersLoading,
    isError: membersError,
    error: membersErrorValue,
    refetch: refetchMembers,
  } = useOrganizationMembers(selectedOrganization?.id);
  const members = memberData?.members ?? [];

  const handleCreateOrganization = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite) return;

    const name = createName.trim();
    const slug = createSlug.trim();

    if (!name) return;

    createOrganization.mutate(
      { name, ...(slug ? { slug } : {}) },
      {
        onSuccess: ({ organization }) => {
          setSelectedOrganizationId(organization.id);
          setCreateName("");
          setCreateSlug("");
          toast.success(
            "Organization created",
            `${organization.name} was added.`,
          );
        },
        onError: (error) => {
          toast.error("Organization creation failed", getErrorMessage(error));
        },
      },
    );
  };

  const handleUpdateOrganization = (input: {
    organizationId: string;
    name: string;
    slug: string;
  }) => {
    updateOrganization.mutate(input, {
      onSuccess: ({ organization }) => {
        toast.success(
          "Organization updated",
          `${organization.name} was saved.`,
        );
      },
      onError: (error) => {
        toast.error("Organization update failed", getErrorMessage(error));
      },
    });
  };

  const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite) return;
    if (!selectedOrganization) return;
    if (!canWrite) return;

    const email = memberEmail.trim();
    if (!email) return;

    if (!(await ensureStepUp())) {
      return;
    }

    addMember.mutate(
      {
        organizationId: selectedOrganization.id,
        email,
        roles: memberRoles,
        scopes: parseCsv(memberScopes),
      },
      {
        onSuccess: () => {
          setMemberEmail("");
          setMemberRoles(defaultMemberRoles);
          setMemberScopes("");
          toast.success("Member added", `${email} was added.`);
        },
        onError: (error) => {
          toast.error("Member add failed", getErrorMessage(error));
        },
      },
    );
  };

  const handleSaveMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite || !selectedOrganization || !editingMember) return;

    if (!(await ensureStepUp())) return;

    updateMember.mutate(
      {
        organizationId: selectedOrganization.id,
        userId: editingMember.userId,
        roles: editMemberRoles,
        scopes: parseCsv(editMemberScopes),
      },
      {
        onSuccess: () => {
          setEditingMember(undefined);
          toast.success(
            "Membership updated",
            `${editingMember.user?.email ?? editingMember.userId} was updated.`,
          );
        },
        onError: (error) => {
          toast.error("Membership update failed", getErrorMessage(error));
        },
      },
    );
  };

  const handleRemoveMember = async (membership: OrganizationMembership) => {
    if (!selectedOrganization) return;

    const label = membership.user?.email ?? membership.userId;
    if (
      !(await confirm({
        title: "Remove member",
        description: `Remove ${label} from ${selectedOrganization.name}?`,
        confirmLabel: "Remove",
        tone: "danger",
      }))
    ) {
      return;
    }

    if (!(await ensureStepUp())) {
      return;
    }

    removeMember.mutate(
      {
        organizationId: selectedOrganization.id,
        userId: membership.userId,
      },
      {
        onSuccess: () => {
          toast.success("Member removed", `${label} was removed.`);
        },
        onError: (error) => {
          toast.error("Member removal failed", getErrorMessage(error));
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-[28px]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <QueryErrorState
        title="Could not load organizations"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-subtle bg-surface shadow-[0_1px_0_rgba(255,255,255,0.35)_inset]">
        <div className="px-6 py-6 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
                Tenant Directory
              </div>
              <h1 className="heading-1">Organizations</h1>
              <p className="max-w-2xl text-sm text-muted">
                Manage tenant containers, membership roles, and scoped access
                for users across this Seamless Auth deployment.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[30rem]">
              <StatusPanel
                icon={Building2}
                label="Organizations"
                value={`${total}`}
              />
              <StatusPanel
                icon={Users2}
                label="Known Members"
                value={`${memberTotal}`}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Organizations"
          value={total}
          hint="Total tenant records"
        />
        <StatCard
          label="Known Members"
          value={memberTotal}
          hint="Memberships reported by the API"
        />
        <StatCard
          label="Selected"
          value={selectedOrganization?.name ?? "None"}
          hint={selectedOrganization?.slug ?? "No organization selected"}
        />
        <StatCard
          label="Selected Members"
          value={members.length}
          hint={
            selectedOrganization
              ? `Visible members for ${selectedOrganization.slug}`
              : "Select an organization"
          }
        />
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <Section
          title="Organization Directory"
          description="Create and select organization records managed by this auth system."
          actions={
            canWrite ? (
              <form
                onSubmit={handleCreateOrganization}
                className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto]"
              >
                <input
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="Organization name"
                  aria-label="Organization name"
                  className="min-w-0 rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                />
                <input
                  value={createSlug}
                  onChange={(event) => setCreateSlug(event.target.value)}
                  placeholder="Slug"
                  aria-label="Organization slug"
                  className="min-w-0 rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                />
                <button
                  type="submit"
                  disabled={createOrganization.isPending}
                  className="btn btn-primary inline-flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Create
                </button>
              </form>
            ) : undefined
          }
        >
          {!canWrite && <ReadOnlyNotice />}

          <div className="mb-3 w-full max-w-sm">
            <SearchInput
              value={organizationSearch}
              onChange={setOrganizationSearch}
              placeholder="Search name or slug"
            />
          </div>

          {createOrganization.isError && (
            <StateMessage
              tone="error"
              title="Organization creation failed"
              description={getErrorMessage(createOrganization.error)}
            />
          )}
          <Table<OrganizationRow>
            label="Organizations"
            data={visibleOrganizations as OrganizationRow[]}
            total={visibleOrganizations.length}
            emptyTitle="No organizations"
            emptyDescription={
              canWrite
                ? "Create an organization to start grouping users."
                : "No organization records are currently visible in this dashboard."
            }
            columns={[
              {
                key: "name",
                label: "Organization",
                sortable: true,
                width: "wide",
                wrap: true,
                render: (value, row) => (
                  <button
                    type="button"
                    onClick={() => setSelectedOrganizationId(row.id)}
                    className="flex w-full flex-col text-left transition hover:opacity-80"
                  >
                    <span className="font-medium text-primary">
                      {String(value)}
                    </span>
                    <span className="text-xs text-muted">{row.slug}</span>
                  </button>
                ),
              },
              {
                key: "memberCount",
                label: "Members",
                sortable: true,
                width: "compact",
                align: "center",
                render: (value) => (
                  <span className="text-sm text-primary">
                    {Number(value ?? 0)}
                  </span>
                ),
              },
              {
                key: "createdAt",
                label: "Created",
                sortable: true,
                width: "medium",
                render: (value) => (
                  <span className="text-sm text-muted">
                    {formatDate(value as string)}
                  </span>
                ),
              },
            ]}
            actions={[
              {
                icon: Building2,
                label: "Manage",
                onClick: (row) => setSelectedOrganizationId(row.id),
              },
            ]}
          />
        </Section>

        <Section
          title="Selected Organization"
          description="Update the selected tenant record before managing its members."
        >
          {updateOrganization.isError && (
            <StateMessage
              tone="error"
              title="Organization update failed"
              description={getErrorMessage(updateOrganization.error)}
            />
          )}
          {selectedOrganization ? (
            <SelectedOrganizationForm
              key={selectedOrganization.id}
              organization={selectedOrganization}
              isPending={updateOrganization.isPending}
              canWrite={canWrite}
              onSave={handleUpdateOrganization}
            />
          ) : (
            <div className="rounded-md border border-subtle bg-surface-alt p-4 text-sm text-muted">
              No organization selected.
            </div>
          )}
        </Section>
      </div>

      <Section
        title="Members"
        description={
          selectedOrganization
            ? `Memberships for ${selectedOrganization.name}.`
            : "Select an organization to view memberships."
        }
        actions={
          canWrite ? (
            <form
              onSubmit={(event) => void handleAddMember(event)}
              className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_minmax(160px,0.6fr)_minmax(200px,0.8fr)_auto]"
            >
              <input
                value={memberEmail}
                onChange={(event) => setMemberEmail(event.target.value)}
                placeholder="member@example.com"
                aria-label="Member email"
                disabled={!selectedOrganization}
                className="min-w-0 rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-60"
              />
              <select
                multiple
                value={memberRoles}
                onChange={(event) =>
                  setMemberRoles(
                    Array.from(event.target.selectedOptions, (o) => o.value),
                  )
                }
                aria-label="Member roles"
                disabled={!selectedOrganization || availableRoles.length === 0}
                className="min-w-0 rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-60"
              >
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <input
                value={memberScopes}
                onChange={(event) => setMemberScopes(event.target.value)}
                placeholder="Scopes"
                aria-label="Member scopes"
                disabled={!selectedOrganization}
                className="min-w-0 rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!selectedOrganization || addMember.isPending}
                className="btn btn-primary inline-flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Add
              </button>
            </form>
          ) : undefined
        }
      >
        {!canWrite && (
          <ReadOnlyNotice description="You have read-only admin access. Membership add, edit, and remove controls are hidden." />
        )}
        {addMember.isError && (
          <StateMessage
            tone="error"
            title="Member add failed"
            description={getErrorMessage(addMember.error)}
          />
        )}
        {removeMember.isError && (
          <StateMessage
            tone="error"
            title="Member removal failed"
            description={getErrorMessage(removeMember.error)}
          />
        )}
        {membersLoading ? (
          <Skeleton className="h-[320px] rounded-2xl" />
        ) : membersError ? (
          <QueryErrorState
            title="Could not load organization members"
            error={membersErrorValue}
            onRetry={() => void refetchMembers()}
          />
        ) : (
          <Table<OrganizationMembershipRow>
            label="Organization members"
            data={members as OrganizationMembershipRow[]}
            total={members.length}
            emptyTitle="No members"
            emptyDescription="Add a user to this organization to grant scoped tenant access."
            columns={[
              {
                key: "user",
                label: "User",
                width: "wide",
                wrap: true,
                render: (_value, row) => (
                  <div className="flex flex-col">
                    <span className="font-medium text-primary">
                      {row.user?.email ?? row.userId}
                    </span>
                    <span className="truncate text-xs text-muted">
                      {row.userId}
                    </span>
                  </div>
                ),
              },
              {
                key: "roles",
                label: "Roles",
                width: "large",
                wrap: true,
                render: (value) => <BadgeList values={value as string[]} />,
              },
              {
                key: "scopes",
                label: "Scopes",
                width: "large",
                wrap: true,
                render: (value) => (
                  <span className="text-sm text-muted">
                    {formatList(value as string[])}
                  </span>
                ),
              },
              {
                key: "createdAt",
                label: "Joined",
                sortable: true,
                width: "medium",
                render: (value) => (
                  <span className="text-sm text-muted">
                    {formatDate(value as string)}
                  </span>
                ),
              },
            ]}
            actions={
              canWrite
                ? [
                    {
                      // Changing a role previously meant removing and re-adding
                      // the member, which discarded their membership history.
                      icon: Pencil,
                      label: "Edit roles",
                      onClick: (row: OrganizationMembershipRow) => {
                        setEditingMember(row);
                        setEditMemberRoles(row.roles ?? []);
                        setEditMemberScopes((row.scopes ?? []).join(", "));
                      },
                    },
                    {
                      icon: Trash2,
                      label: "Remove",
                      variant: "danger" as const,
                      onClick: (row: OrganizationMembershipRow) =>
                        void handleRemoveMember(row),
                    },
                  ]
                : []
            }
          />
        )}
      </Section>

      {editingMember && selectedOrganization && (
        <Dialog
          title="Edit membership"
          description={`Roles and scopes for ${editingMember.user?.email ?? editingMember.userId}.`}
          onClose={() => setEditingMember(undefined)}
        >
          <form
            className="space-y-4"
            onSubmit={(event) => void handleSaveMember(event)}
          >
            <Field label="Roles">
              <RoleChips
                roles={availableRoles}
                selected={editMemberRoles}
                onChange={setEditMemberRoles}
              />
            </Field>

            <Field label="Scopes">
              <input
                value={editMemberScopes}
                onChange={(event) => setEditMemberScopes(event.target.value)}
                aria-label="Membership scopes"
                placeholder="Comma-separated"
                className="w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
              />
            </Field>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingMember(undefined)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMember.isPending}
                className="btn btn-primary disabled:opacity-50"
              >
                {updateMember.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}

function StatusPanel({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-subtle bg-surface-alt p-4">
      <div className="rounded-xl bg-surface p-2 text-[var(--primary)] shadow-sm">
        <Icon size={18} />
      </div>
      <div>
        <div className="text-2xl font-semibold tracking-tight text-primary">
          {value}
        </div>
        <div className="text-xs uppercase tracking-[0.18em] text-muted">
          {label}
        </div>
      </div>
    </div>
  );
}

function SelectedOrganizationForm({
  organization,
  isPending,
  canWrite,
  onSave,
}: {
  organization: Organization;
  isPending: boolean;
  canWrite: boolean;
  onSave: (input: {
    organizationId: string;
    name: string;
    slug: string;
  }) => void;
}) {
  const [editName, setEditName] = useState(organization.name);
  const [editSlug, setEditSlug] = useState(organization.slug);
  const nameErrorId = useId();

  const trimmedName = editName.trim();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Saving an empty name wrote it straight through, leaving the organization
    // unidentifiable in every list. The create form already guards this.
    if (!trimmedName) return;

    onSave({
      organizationId: organization.id,
      name: trimmedName,
      slug: editSlug.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Name">
        <input
          value={editName}
          onChange={(event) => setEditName(event.target.value)}
          disabled={!canWrite}
          aria-invalid={!trimmedName ? true : undefined}
          aria-describedby={!trimmedName ? nameErrorId : undefined}
          className="w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
        />
        {!trimmedName && (
          <p id={nameErrorId} className="text-sm text-[var(--highlight)]">
            A name is required.
          </p>
        )}
      </Field>

      <Field label="Slug">
        <input
          value={editSlug}
          onChange={(event) => setEditSlug(event.target.value)}
          disabled={!canWrite}
          className="w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
        />
      </Field>

      <div className="grid gap-3 rounded-md border border-subtle bg-surface-alt p-3 text-sm sm:grid-cols-2">
        <Detail label="ID" value={organization.id} />
        <Detail label="Created" value={formatDate(organization.createdAt)} />
        <Detail
          label="Created By"
          value={organization.createdByUserId ?? "System"}
        />
        <Detail label="Members" value={`${organization.memberCount ?? 0}`} />
      </div>

      {canWrite ? (
        <button
          type="submit"
          disabled={isPending || !trimmedName}
          className="btn btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={16} />
          Save
        </button>
      ) : (
        <div className="rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm text-muted">
          Read-only admin access
        </div>
      )}
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="block text-xs uppercase tracking-[0.18em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs uppercase tracking-[0.18em] text-muted">
        {label}
      </div>
      <div className="truncate text-primary">{value}</div>
    </div>
  );
}

function BadgeList({ values }: { values: string[] }) {
  if (!values.length) {
    return <span className="text-xs text-muted">None</span>;
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
