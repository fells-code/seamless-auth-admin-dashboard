/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ComponentType } from "react";
import { useState } from "react";
import { Clock3, ShieldAlert, Trash2, Wifi } from "lucide-react";
import { useSessions } from "../hooks/useSessions";
import { useRevokeSession } from "../hooks/useRevokeSession";
import Table from "../components/Table";
import Skeleton from "../components/Skeleton";
import StatCard from "../components/StatCard";
import SearchInput from "../components/SearchInput";
import { Section } from "../components/Section";
import {
  QueryErrorState,
  ReadOnlyNotice,
  StateMessage,
} from "../components/StateMessage";
import { getErrorMessage } from "../lib/errorMessage";
import { useAdminPermissions } from "../hooks/useAdminPermissions";
import { useStepUpGuard } from "../hooks/useStepUpGuard";
import { useToast } from "../hooks/useToast";
import { useConfirm } from "../hooks/useConfirm";
import { getActiveSessionCount } from "../lib/sessionActivity";
import type { Session } from "@seamless-auth/types";

type ActivityFilter = "all" | "recent" | "expiring" | "idle";

function formatUserAgent(ua?: string | null) {
  if (!ua) return "Unknown device";

  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edg")) return "Edge";

  return "Other client";
}

function formatDeviceSummary(ua?: string | null) {
  if (!ua) return "No user agent available";

  if (ua.includes("Mac OS X")) return "macOS device";
  if (ua.includes("Windows")) return "Windows device";
  if (ua.includes("Linux")) return "Linux device";
  if (ua.includes("iPhone")) return "iPhone";
  if (ua.includes("Android")) return "Android device";

  return ua;
}

function formatTimeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

function formatTimeUntil(value: string) {
  const diff = new Date(value).getTime() - Date.now();

  if (diff <= 0) return "expired";

  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h`;

  return `in ${Math.floor(hours / 24)}d`;
}

function isRecent(session: Session, referenceNow = Date.now()) {
  return (
    referenceNow - new Date(session.lastUsedAt).getTime() <= 60 * 60 * 1000
  );
}

function isIdle(session: Session, referenceNow = Date.now()) {
  return (
    referenceNow - new Date(session.lastUsedAt).getTime() >= 24 * 60 * 60 * 1000
  );
}

function isExpiringSoon(session: Session, referenceNow = Date.now()) {
  const diff = new Date(session.expiresAt).getTime() - referenceNow;

  return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
}

export default function Sessions() {
  const { data, isLoading, isError, error, refetch } = useSessions();
  const revoke = useRevokeSession();
  const { canWrite } = useAdminPermissions();
  const ensureStepUp = useStepUpGuard();
  const toast = useToast();
  const confirm = useConfirm();

  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ActivityFilter>("all");

  const limit = 10;
  const sessions = data?.sessions ?? [];
  const [referenceNow] = useState(() => Date.now());

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch = search
      ? `${session.ipAddress ?? ""} ${session.userAgent ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      : true;

    const matchesFilter =
      filter === "all"
        ? true
        : filter === "recent"
          ? isRecent(session, referenceNow)
          : filter === "expiring"
            ? isExpiringSoon(session, referenceNow)
            : isIdle(session, referenceNow);

    return matchesSearch && matchesFilter;
  });

  // Revoking a session shrinks the list underneath the current page. Without
  // clamping, the slice came back empty while the footer still reported rows,
  // and only Prev or Next could recover. Derived rather than corrected in an
  // effect so there is no render where the two disagree.
  const maxOffset = Math.max(
    0,
    Math.floor((filteredSessions.length - 1) / limit) * limit,
  );
  const effectiveOffset = Math.min(offset, maxOffset);

  const pagedSessions = filteredSessions.slice(
    effectiveOffset,
    effectiveOffset + limit,
  );
  const uniqueIps = new Set(
    sessions.map((session) => session.ipAddress).filter(Boolean),
  ).size;
  const activeSessionCount = getActiveSessionCount(sessions, referenceNow);
  const recentCount = sessions.filter((session) =>
    isRecent(session, referenceNow),
  ).length;
  const expiringSoonCount = sessions.filter((session) =>
    isExpiringSoon(session, referenceNow),
  ).length;
  const idleCount = sessions.filter((session) =>
    isIdle(session, referenceNow),
  ).length;

  const filterOptions: {
    value: ActivityFilter;
    label: string;
    count: number;
  }[] = [
    { value: "all", label: "All sessions", count: sessions.length },
    { value: "recent", label: "Recent", count: recentCount },
    { value: "expiring", label: "Expiring soon", count: expiringSoonCount },
    { value: "idle", label: "Idle", count: idleCount },
  ];

  const revokeSession = async (session: Session) => {
    if (
      !(await confirm({
        title: "Revoke session",
        description: "This session will be signed out immediately.",
        confirmLabel: "Revoke",
        tone: "danger",
      }))
    ) {
      return;
    }

    if (!(await ensureStepUp())) {
      return;
    }

    revoke.mutate(session.id, {
      onSuccess: () => {
        toast.success("Session revoked", "The selected session was revoked.");
      },
      onError: (error) => {
        toast.error("Session revoke failed", getErrorMessage(error));
      },
    });
  };

  const revokeSelectedSessions = async (selectedSessions: Session[]) => {
    if (
      !(await confirm({
        title: "Revoke sessions",
        description: `Revoke ${selectedSessions.length} selected sessions? They will be signed out immediately.`,
        confirmLabel: "Revoke",
        tone: "danger",
      }))
    ) {
      return;
    }

    if (!(await ensureStepUp())) {
      return;
    }

    try {
      await Promise.all(
        selectedSessions.map((session) => revoke.mutateAsync(session.id)),
      );
      toast.success(
        "Sessions revoked",
        `${selectedSessions.length} sessions were revoked.`,
      );
    } catch (error) {
      toast.error("Session revoke failed", getErrorMessage(error));
    }
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
        title="Could not load sessions"
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
                  Session Hygiene
                </div>
                <h1 className="heading-1">Sessions</h1>
                <p className="max-w-2xl text-sm text-muted">
                  Review active sessions, spot stale access, and revoke tokens
                  that no longer look healthy. This view currently emphasizes
                  IP, device signature, and expiry timing.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setOffset(0);
                      setFilter(option.value);
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      filter === option.value
                        ? "border-[var(--primary)] bg-[var(--surface-alt)] text-primary"
                        : "border-subtle bg-surface text-muted hover:bg-[var(--surface-alt)] hover:text-primary"
                    }`}
                  >
                    <span className="font-medium text-primary">
                      {option.count}
                    </span>
                    <span className="mx-1 opacity-60">•</span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <FocusPanel
                icon={Clock3}
                title="Recent activity"
                value={`${recentCount}`}
                description="Sessions seen in the last hour and likely tied to current operator activity."
              />

              <FocusPanel
                icon={ShieldAlert}
                title="Needs attention"
                value={`${expiringSoonCount + idleCount}`}
                description="Sessions that are expiring soon or have gone quiet long enough to review."
              />

              <FocusPanel
                icon={Wifi}
                title="Network spread"
                value={`${uniqueIps}`}
                description="Distinct IP addresses currently associated with active sessions."
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Sessions"
          value={activeSessionCount}
          hint="Sessions whose expiry has not passed"
        />
        <StatCard
          label="Distinct IPs"
          value={uniqueIps}
          hint="Useful for spotting spread and unusual access patterns"
        />
        <StatCard
          label="Expiring Soon"
          value={expiringSoonCount}
          hint="Sessions ending in the next 24 hours"
        />
        <StatCard
          label="Idle Sessions"
          value={idleCount}
          hint="Sessions not used in at least the last 24 hours"
        />
      </div>

      <Section
        title="Session Inventory"
        description="Filter the session feed by activity level and search by IP address or user agent."
        actions={
          <div className="w-full max-w-sm">
            <SearchInput
              value={search}
              onChange={(value) => {
                setOffset(0);
                setSearch(value);
              }}
              placeholder="Search IP or device signature"
            />
          </div>
        }
      >
        {!canWrite && <ReadOnlyNotice />}
        {revoke.isError && (
          <StateMessage
            tone="error"
            title="Session revoke failed"
            description={getErrorMessage(revoke.error)}
          />
        )}
        <Table<Session>
          label="Active sessions"
          rowLabel={(session) =>
            session.ipAddress ? `session from ${session.ipAddress}` : "session"
          }
          selectable={canWrite}
          limit={limit}
          offset={effectiveOffset}
          total={filteredSessions.length}
          onPageChange={setOffset}
          emptyTitle="No sessions match this view"
          emptyDescription="Try clearing the search or switching to a different session state."
          columns={[
            {
              key: "ipAddress",
              label: "Network",
              sortable: true,
              width: "medium",
              wrap: true,
              render: (value, row) => (
                <div className="flex flex-col">
                  <span className="font-mono text-sm text-primary">
                    {value ?? "Unknown IP"}
                  </span>
                  <span className="text-xs text-muted">
                    Expires {formatTimeUntil(row.expiresAt)}
                  </span>
                </div>
              ),
            },
            {
              key: "userAgent",
              label: "Device",
              width: "wide",
              wrap: true,
              render: (value) => (
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-primary">
                    {formatUserAgent(value)}
                  </span>
                  <span className="truncate text-xs text-muted">
                    {formatDeviceSummary(value)}
                  </span>
                </div>
              ),
            },
            {
              key: "lastUsedAt",
              label: "Last Seen",
              sortable: true,
              width: "medium",
              wrap: true,
              render: (value, row) => (
                <div className="flex flex-col">
                  <span className="text-sm text-primary">
                    {formatTimeAgo(value as string)}
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(row.lastUsedAt).toLocaleString()}
                  </span>
                </div>
              ),
            },
          ]}
          data={pagedSessions}
          actions={
            canWrite
              ? [
                  {
                    icon: Trash2,
                    label: "Revoke",
                    variant: "danger" as const,
                    onClick: (row: Session) => void revokeSession(row),
                  },
                ]
              : []
          }
          bulkActions={
            canWrite
              ? [
                  {
                    label: "Revoke Selected",
                    variant: "danger" as const,
                    onClick: (rows: Session[]) =>
                      void revokeSelectedSessions(rows),
                  },
                ]
              : []
          }
        />
      </Section>
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
