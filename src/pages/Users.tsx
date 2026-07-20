/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ComponentType } from "react";
import { useState } from "react";
import clsx from "clsx";
import {
  ArrowRight,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUsers, type User } from "../hooks/useUsers";
import { useDeleteUser } from "../hooks/useDeleteUser";
import Table from "../components/Table";
import Skeleton from "../components/Skeleton";
import SearchInput from "../components/SearchInput";
import CreateUserModal from "../components/CreateUserModal";
import StatCard from "../components/StatCard";
import { Section } from "../components/Section";
import {
  QueryErrorState,
  ReadOnlyNotice,
  StateMessage,
} from "../components/StateMessage";
import { getErrorMessage } from "../lib/errorMessage";
import { hasScopedRole } from "../lib/scopedRoles";
import { useAdminPermissions } from "../hooks/useAdminPermissions";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useStepUpGuard } from "../hooks/useStepUpGuard";
import { useToast } from "../hooks/useToast";

function formatTimeAgo(date?: string | null, now?: number) {
  if (!date) return "No recent activity";

  const diff = (now ?? new Date().getTime()) - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  return `${Math.floor(hrs / 24)}d ago`;
}

function StatusBadge({ verified }: { verified: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
        verified
          ? "border-[color:var(--accent)]/35 bg-[color:var(--accent)]/10 text-[var(--accent)]"
          : "border-[color:var(--highlight)]/35 bg-[color:var(--highlight)]/10 text-[var(--highlight)]"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {verified ? "Verified" : "Unverified"}
    </span>
  );
}

export default function Users() {
  const navigate = useNavigate();
  const deleteUser = useDeleteUser();
  const { canWrite } = useAdminPermissions();
  const ensureStepUp = useStepUpGuard();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [referenceNow] = useState(() => Date.now());

  const limit = 10;
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading, isFetching, isError, error, refetch } = useUsers({
    search: debouncedSearch,
    limit,
    offset,
  });

  const users: User[] = data?.users ?? [];
  const total = data?.total ?? 0;
  const verifiedCount = users.filter((user) => user.verified).length;
  const adminCount = users.filter((user) =>
    hasScopedRole(user.roles, "admin:read"),
  ).length;
  const recentlyActiveCount = users.filter((user) => {
    if (!user.lastLogin) return false;
    return (
      referenceNow - new Date(user.lastLogin).getTime() <= 24 * 60 * 60 * 1000
    );
  }).length;

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) {
      return;
    }

    if (!(await ensureStepUp())) {
      return;
    }

    deleteUser.mutate(user.id, {
      onSuccess: () => {
        toast.success("User deleted", `${user.email} was removed.`);
      },
      onError: (error) => {
        toast.error("User deletion failed", getErrorMessage(error));
      },
    });
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
        <Skeleton className="h-[440px] rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <QueryErrorState
        title="Could not load users"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-subtle bg-surface shadow-[0_1px_0_rgba(255,255,255,0.35)_inset]">
        <div className="relative px-6 py-6 lg:px-8 lg:py-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-0 top-0 h-40 w-40 rounded-full bg-[color:var(--accent-soft)] blur-3xl opacity-70" />
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[color:var(--highlight)]/10 blur-3xl" />
          </div>

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
                  Access Directory
                </div>
                <h1 className="heading-1">Users</h1>
                <p className="max-w-2xl text-sm text-muted">
                  Search, review, and manage user access across your Seamless
                  Auth deployment. This page emphasizes verification state,
                  admin coverage, and recent user activity.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <InfoPill label="Matched users" value={`${total}`} />
                <InfoPill label="Visible verified" value={`${verifiedCount}`} />
                <InfoPill label="Visible admins" value={`${adminCount}`} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <FocusPanel
                icon={Users2}
                title="Directory coverage"
                value={`${total}`}
                description="Total users returned by the current search scope."
              />

              <FocusPanel
                icon={ShieldCheck}
                title="Verified on page"
                value={`${verifiedCount}`}
                description="Users on this page who have completed verification."
              />

              <FocusPanel
                icon={UserPlus}
                title="Recently active"
                value={`${recentlyActiveCount}`}
                description="Users on this page with login activity in the last 24 hours."
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Matched Users"
          value={total}
          hint="Total users matching the current search"
        />
        <StatCard
          label="Verified On Page"
          value={verifiedCount}
          hint="Visible users whose account is verified"
        />
        <StatCard
          label="Admin Roles"
          value={adminCount}
          hint="Visible users carrying the admin role"
        />
        <StatCard
          label="Recent Activity"
          value={recentlyActiveCount}
          hint="Visible users active in the last 24 hours"
        />
      </div>

      <Section
        title="User Directory"
        description="Search by email or other indexed user text, then drill into an account to review roles, sessions, and security details."
        actions={
          <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1">
              <SearchInput
                value={search}
                onChange={(value) => {
                  setOffset(0);
                  setSearch(value);
                }}
                placeholder="Search by email or phone"
              />
            </div>

            {canWrite && (
              <button onClick={() => setOpen(true)} className="btn btn-primary">
                Create User
              </button>
            )}
          </div>
        }
      >
        {!canWrite && <ReadOnlyNotice />}
        {deleteUser.isError && (
          <StateMessage
            tone="error"
            title="User deletion failed"
            description={getErrorMessage(deleteUser.error)}
          />
        )}
        {/* Results stay on screen while a new search or page loads, so the
            surrounding shell and the search box keep focus. */}
        <div
          aria-busy={isFetching}
          className={clsx("transition-opacity", isFetching && "opacity-60")}
        >
          <Table<User>
            data={users}
            selectable={canWrite}
            limit={limit}
            offset={offset}
            total={total}
            onPageChange={setOffset}
            emptyTitle={
              search
                ? "No users match this search"
                : "No users in the directory"
            }
            emptyDescription={
              search
                ? "Try a different search term or clear the filter to widen the result set."
                : canWrite
                  ? "Create your first user to start managing access from this dashboard."
                  : "No user records are currently visible in this dashboard."
            }
            columns={[
              {
                key: "email",
                label: "Identity",
                sortable: true,
                width: "wide",
                wrap: true,
                render: (value, row) => (
                  <button
                    onClick={() => navigate(`/users/${row.id}`)}
                    className="flex w-full flex-col text-left transition hover:opacity-80"
                  >
                    <span className="font-medium text-primary">{value}</span>
                    <span className="text-xs text-muted">
                      {row.phone ?? "No phone on record"}
                    </span>
                    <span className="truncate text-xs text-muted">
                      {row.id}
                    </span>
                  </button>
                ),
              },
              {
                key: "roles",
                label: "Access",
                width: "large",
                wrap: true,
                render: (roles) => (
                  <div className="flex flex-wrap gap-1">
                    {(roles as string[]).length > 0 ? (
                      (roles as string[]).map((role) => (
                        <span
                          key={role}
                          className="rounded-full border border-subtle bg-surface-alt px-2 py-0.5 text-xs text-primary"
                        >
                          {role}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted">
                        No roles assigned
                      </span>
                    )}
                  </div>
                ),
              },
              {
                key: "verified",
                label: "State",
                sortable: true,
                width: "compact",
                align: "center",
                render: (value) => <StatusBadge verified={Boolean(value)} />,
              },
              {
                key: "lastLogin",
                label: "Last Active",
                sortable: true,
                width: "medium",
                wrap: true,
                render: (value) => (
                  <div className="flex flex-col">
                    <span className="text-sm text-primary">
                      {formatTimeAgo(
                        value as string | null | undefined,
                        referenceNow,
                      )}
                    </span>
                    {value ? (
                      <span className="text-xs text-muted">
                        {new Date(value as string).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">
                        No login recorded
                      </span>
                    )}
                  </div>
                ),
              },
            ]}
            actions={[
              {
                icon: ArrowRight,
                label: "View",
                onClick: (row) => navigate(`/users/${row.id}`),
              },
              ...(canWrite
                ? [
                    {
                      icon: Trash2,
                      label: "Delete",
                      variant: "danger" as const,
                      onClick: (row: User) => void handleDeleteUser(row),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </Section>

      {open && canWrite && <CreateUserModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-subtle bg-surface px-3 py-1.5 text-xs text-muted">
      <span className="font-medium text-primary">{value}</span>
      <span className="mx-1 opacity-60">•</span>
      <span>{label}</span>
    </div>
  );
}

function FocusPanel({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: ComponentType<{ size?: number }>;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-subtle bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-alt)_72%,transparent),transparent)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-xl bg-surface p-2 text-[var(--primary)] shadow-sm">
          <Icon size={18} />
        </div>

        <div className="text-2xl font-semibold tracking-tight text-primary">
          {value}
        </div>
      </div>

      <div className="mt-4 space-y-1">
        <div className="text-sm font-medium text-primary">{title}</div>
        <div className="text-sm text-muted">{description}</div>
      </div>
    </div>
  );
}
