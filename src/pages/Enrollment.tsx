/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useId, useMemo, useState } from "react";
import clsx from "clsx";
import { Send } from "lucide-react";
import {
  ENROLLMENT_INVITE_MAX_USERS,
  type EnrollmentInviteResponse,
  type EnrollmentInviteSkipReason,
  type EnrollmentStatus,
  type EnrollmentUser,
} from "@seamless-auth/types";
import Table from "../components/Table";
import SearchInput from "../components/SearchInput";
import Skeleton from "../components/Skeleton";
import StatCard from "../components/StatCard";
import { Section } from "../components/Section";
import {
  QueryErrorState,
  ReadOnlyNotice,
  StateMessage,
} from "../components/StateMessage";
import {
  type EnrollmentInviteInput,
  useEnrollment,
  useSendEnrollmentInvites,
} from "../hooks/useEnrollment";
import { useOrganizations } from "../hooks/useOrganizations";
import { useAdminPermissions } from "../hooks/useAdminPermissions";
import { useToast } from "../hooks/useToast";
import { useConfirm } from "../hooks/useConfirm";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useNow } from "../hooks/useNow";
import { getErrorMessage } from "../lib/errorMessage";

type EnrollmentRow = EnrollmentUser & Record<string, unknown>;

const PAGE_SIZE = 50;
// GET /admin/organizations caps a page at 100.
const ORGANIZATION_OPTIONS_LIMIT = 100;

const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  none: "Not enrolled",
  one: "One authenticator",
  two_or_more: "Two or more",
};

const SKIP_REASON_LABELS: Record<EnrollmentInviteSkipReason, string> = {
  not_found: "not found",
  already_enrolled: "already enrolled",
  recently_invited: "invited in the last 24 hours",
  delivery_failed: "delivery failed",
};

const controlClassName =
  "min-h-10 w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]";

function formatTimeAgo(date: string | null, now: number, fallback: string) {
  if (!date) return fallback;

  const mins = Math.max(
    0,
    Math.floor((now - new Date(date).getTime()) / 60000),
  );

  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  return `${Math.floor(hrs / 24)}d ago`;
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

function describeInviteResult(result: EnrollmentInviteResponse) {
  const reasons = new Map<string, number>();
  for (const entry of result.results) {
    if (entry.status !== "skipped" || !entry.reason) continue;
    const label = SKIP_REASON_LABELS[entry.reason];
    reasons.set(label, (reasons.get(label) ?? 0) + 1);
  }

  let description = `${result.sent} sent, ${result.skipped} skipped`;
  if (reasons.size > 0) {
    description += ` (${[...reasons]
      .map(([label, count]) => `${count} ${label}`)
      .join(", ")})`;
  }
  description += ".";

  if (result.remaining) {
    description += ` ${plural(
      result.remaining,
      "member still needs",
      "members still need",
    )} an invite. Run it again to continue.`;
  }

  return description;
}

function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        status === "none" &&
          "border-[color:var(--highlight)]/35 bg-[color:var(--highlight)]/10 text-[var(--highlight)]",
        status === "one" &&
          "border-[color:var(--primary)]/30 bg-[color:var(--accent-soft)]/55 text-primary",
        status === "two_or_more" &&
          "border-[color:var(--accent)]/35 bg-[color:var(--accent)]/10 text-[var(--accent)]",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function Enrollment() {
  const [offset, setOffset] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [organizationId, setOrganizationId] = useState("");
  const [status, setStatus] = useState<EnrollmentStatus | "">("");
  const [importedOnly, setImportedOnly] = useState(false);
  // Remounts the table after a send so the rows just invited are deselected.
  const [selectionKey, setSelectionKey] = useState(0);

  const organizationFilterId = useId();
  const statusFilterId = useId();

  const { data, isLoading, isError, error, refetch, isFetching } =
    useEnrollment({
      limit: PAGE_SIZE,
      offset,
      organizationId: organizationId || undefined,
      status: status || undefined,
      imported: importedOnly ? true : undefined,
      search,
    });
  const { data: organizationData } = useOrganizations({
    limit: ORGANIZATION_OPTIONS_LIMIT,
  });
  const sendInvites = useSendEnrollmentInvites();
  const { canWrite } = useAdminPermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const now = useNow();

  const users = useMemo(() => (data?.users ?? []) as EnrollmentRow[], [data]);
  const total = data?.total ?? users.length;
  const summary = data?.summary ?? { total: 0, none: 0, one: 0, twoOrMore: 0 };
  const enrolled = summary.one + summary.twoOrMore;
  const coverage =
    summary.total > 0
      ? `${Math.round((enrolled / summary.total) * 100)}%`
      : "0%";

  const organizations = organizationData?.organizations ?? [];
  const selectedOrganization = organizations.find(
    (organization) => organization.id === organizationId,
  );
  const hasFilters = Boolean(
    organizationId || status || importedOnly || search.trim(),
  );

  const changeFilter = (apply: () => void) => {
    apply();
    // A new filter describes a different result set, so the old page number
    // can land past the end of it.
    setOffset(0);
  };

  const send = (input: EnrollmentInviteInput) => {
    sendInvites.mutate(input, {
      onSuccess: (result) => {
        setSelectionKey((key) => key + 1);
        const description = describeInviteResult(result);
        if (result.sent > 0) {
          toast.success("Enrollment invites sent", description);
        } else {
          toast.info("No invites sent", description);
        }
      },
      onError: (sendError) => {
        toast.error("Invites not sent", getErrorMessage(sendError));
      },
    });
  };

  const handleInviteSelected = async (rows: EnrollmentRow[]) => {
    if (!canWrite || rows.length === 0) return;

    const selected = rows.slice(0, ENROLLMENT_INVITE_MAX_USERS);

    if (
      !(await confirm({
        title: "Send enrollment invites",
        description: `Email ${plural(
          selected.length,
          "selected user",
          "selected users",
        )} a link to the sign-in page? Users who already have enough authenticators or were invited in the last 24 hours are skipped.`,
        confirmLabel: "Send invites",
      }))
    ) {
      return;
    }

    // The API skips anyone above the status threshold, which defaults to users
    // with no passkey. Raising it lets a selected user with one authenticator be
    // asked to add a second.
    const includesOne = selected.some((row) => row.status === "one");

    send({
      userIds: selected.map((row) => row.id),
      ...(includesOne ? { status: "one" as const } : {}),
    });
  };

  const handleInviteOrganization = async () => {
    if (!canWrite || !selectedOrganization) return;

    if (
      !(await confirm({
        title: "Send enrollment invites",
        description: `Email every member of ${selectedOrganization.name} who has not enrolled a passkey? Each email links to the sign-in page. Members invited in the last 24 hours are skipped, and up to ${ENROLLMENT_INVITE_MAX_USERS} are sent per run.`,
        confirmLabel: "Send invites",
      }))
    ) {
      return;
    }

    send({ organizationId: selectedOrganization.id });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-[28px]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
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
        title="Could not load passkey enrollment"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-subtle bg-surface shadow-[0_1px_0_rgba(255,255,255,0.35)_inset]">
        <div className="space-y-3 px-6 py-6 lg:px-8 lg:py-8">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Authenticator Coverage
          </div>
          <h1 className="heading-1">Passkey enrollment</h1>
          <p className="max-w-2xl text-sm text-muted">
            See who has enrolled a passkey or security key, and invite the users
            who have not. An invite is an email that links to the sign-in page
            and carries no sign-in code. After signing in, users are asked to
            add a passkey when the &quot;Prompt for passkey enrollment&quot;
            setting is on in System.
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Users"
          value={summary.total}
          hint="Matching the organization, import, and search filters"
        />
        <StatCard
          label="Not Enrolled"
          value={summary.none}
          hint="No passkey or security key"
        />
        <StatCard
          label="One Authenticator"
          value={summary.one}
          hint="Losing it would lock them out"
        />
        <StatCard
          label="Two Or More"
          value={summary.twoOrMore}
          hint="Enrolled with a backup"
        />
        <StatCard
          label="Coverage"
          value={coverage}
          hint={`${enrolled} of ${summary.total} with at least one`}
        />
      </div>

      <Section
        title="Enrollment Directory"
        description="Filter users by organization, enrollment status, and how they were added, then invite the ones who still need a passkey."
        actions={
          canWrite && selectedOrganization ? (
            <button
              type="button"
              onClick={() => void handleInviteOrganization()}
              disabled={sendInvites.isPending}
              className="btn btn-primary inline-flex items-center justify-center gap-2"
            >
              <Send size={16} />
              Invite all not enrolled in {selectedOrganization.name}
            </button>
          ) : undefined
        }
      >
        {!canWrite && (
          <ReadOnlyNotice description="You have read-only admin access. Sending enrollment invites requires admin write access." />
        )}

        {sendInvites.isError && (
          <StateMessage
            tone="error"
            title="Invites not sent"
            description={getErrorMessage(sendInvites.error)}
          />
        )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-center">
          <SearchInput
            value={searchInput}
            onChange={(value) => changeFilter(() => setSearchInput(value))}
            placeholder="Search by email"
            label="Search by email"
          />

          <div>
            <label htmlFor={organizationFilterId} className="sr-only">
              Organization
            </label>
            <select
              id={organizationFilterId}
              value={organizationId}
              onChange={(event) =>
                changeFilter(() => setOrganizationId(event.target.value))
              }
              className={controlClassName}
            >
              <option value="">All organizations</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={statusFilterId} className="sr-only">
              Enrollment status
            </label>
            <select
              id={statusFilterId}
              value={status}
              onChange={(event) =>
                changeFilter(() =>
                  setStatus(event.target.value as EnrollmentStatus | ""),
                )
              }
              className={controlClassName}
            >
              <option value="">All statuses</option>
              <option value="none">{STATUS_LABELS.none}</option>
              <option value="one">{STATUS_LABELS.one}</option>
              <option value="two_or_more">{STATUS_LABELS.two_or_more}</option>
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-primary">
            <input
              type="checkbox"
              checked={importedOnly}
              onChange={(event) =>
                changeFilter(() => setImportedOnly(event.target.checked))
              }
              className="h-4 w-4 rounded border-subtle accent-[var(--primary)]"
            />
            Imported users only
          </label>
        </div>

        <div
          aria-busy={isFetching}
          className={clsx("transition-opacity", isFetching && "opacity-60")}
        >
          <Table<EnrollmentRow>
            key={selectionKey}
            label="Passkey enrollment"
            rowLabel={(user) => user.email}
            data={users}
            selectable={canWrite}
            bulkActions={
              canWrite
                ? [
                    {
                      label: "Invite selected",
                      onClick: (rows) => void handleInviteSelected(rows),
                    },
                  ]
                : []
            }
            total={total}
            limit={PAGE_SIZE}
            offset={offset}
            onPageChange={setOffset}
            emptyTitle={
              hasFilters ? "No users match these filters" : "No users yet"
            }
            emptyDescription={
              hasFilters
                ? "Try a different search term or clear a filter to widen the result set."
                : "Users appear here once they are created or imported."
            }
            columns={[
              {
                key: "email",
                label: "Email",
                sortable: true,
                width: "wide",
              },
              {
                key: "imported",
                label: "Source",
                width: "small",
                render: (value) =>
                  value ? (
                    <span className="rounded-full border border-subtle bg-surface-alt px-2 py-0.5 text-xs text-primary">
                      Imported
                    </span>
                  ) : (
                    <span className="text-muted">Direct</span>
                  ),
              },
              {
                key: "credentialCount",
                label: "Authenticators",
                sortable: true,
                width: "small",
                align: "right",
              },
              {
                key: "status",
                label: "Status",
                width: "medium",
                render: (_value, row) => (
                  <EnrollmentStatusBadge status={row.status} />
                ),
              },
              {
                key: "lastLogin",
                label: "Last sign-in",
                sortable: true,
                width: "small",
                render: (_value, row) =>
                  formatTimeAgo(row.lastLogin, now, "Never"),
              },
              {
                key: "enrollmentInvitedAt",
                label: "Last invited",
                sortable: true,
                width: "small",
                render: (_value, row) =>
                  formatTimeAgo(row.enrollmentInvitedAt, now, "Not invited"),
              },
            ]}
          />
        </div>
      </Section>
    </div>
  );
}
