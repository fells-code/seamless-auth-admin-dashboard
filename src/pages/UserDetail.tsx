/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ShieldAlert, ShieldOff, UserRound } from "lucide-react";
import { useUserDetail } from "../hooks/useUserDetail";
import { useUserAnomalies } from "../hooks/useUserAnomalies";
import { useUserTimeseries } from "../hooks/useUserTimeseries";
import { useRevokeSession } from "../hooks/useRevokeSession";
import { useDeleteUser } from "../hooks/useDeleteUser";
import Tabs from "../components/Tabs";
import Table from "../components/Table";
import Skeleton from "../components/Skeleton";
import EditUserModal from "../components/EditUserModal";
import RiskBadge from "../components/RiskBadge";
import MiniLineChart from "../components/MiniLineChart";
import StatCard from "../components/StatCard";
import { Section } from "../components/Section";
import { calculateRiskScore } from "../lib/riskScore";
import type {
  AuthEvent,
  Credential,
  Session,
  UserDetailResponse,
} from "../types/user";

function formatTimeAgo(value?: string | null, now?: number) {
  if (!value) return "No recent activity";

  const diff = (now ?? new Date().getTime()) - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTimeUntil(value?: string | null, now?: number) {
  if (!value) return "No expiry";

  const diff = new Date(value).getTime() - (now ?? new Date().getTime());
  if (diff <= 0) return "expired";

  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `in ${hrs}h`;

  return `in ${Math.floor(hrs / 24)}d`;
}

function formatUserAgent(ua?: string | null) {
  if (!ua) return "Unknown device";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edg")) return "Edge";

  return "Other client";
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [referenceNow] = useState(() => Date.now());

  const { data, isLoading } = useUserDetail(id!);
  const { data: anomalies } = useUserAnomalies(id!);
  const { data: timeseries } = useUserTimeseries(data?.user?.id ?? "");

  const revokeSession = useRevokeSession();
  const deleteUser = useDeleteUser();

  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<
    "Overview" | "Sessions" | "Credentials" | "Events" | "Security"
  >("Overview");

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-[28px]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[440px] rounded-2xl" />
      </div>
    );
  }

  const { user, sessions, credentials, events } = data as UserDetailResponse;

  const failedLogins = events.filter((event) => event.type === "login_failed").length;
  const suspiciousCount = anomalies?.suspiciousEvents.length ?? 0;
  const risk = calculateRiskScore({
    suspiciousEvents: suspiciousCount,
    failedLogins,
  });

  const relatedIps = anomalies?.relatedIps ?? [];
  const relatedAgents = anomalies?.relatedAgents ?? [];
  const latestSession = sessions.reduce<Session | null>((latest, session) => {
    if (!latest) return session;

    return new Date(session.lastUsedAt).getTime() >
      new Date(latest.lastUsedAt).getTime()
      ? session
      : latest;
  }, null);

  const handleDeleteUser = () => {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) {
      return;
    }

    deleteUser.mutate(user.id, {
      onSuccess: () => navigate("/users"),
    });
  };

  const revokeAllSessions = () => {
    if (!confirm("Revoke all active sessions for this user?")) {
      return;
    }

    sessions.forEach((session) => revokeSession.mutate(session.id));
  };

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-subtle bg-surface shadow-[0_1px_0_rgba(255,255,255,0.35)_inset]">
        <div className="relative px-6 py-6 lg:px-8 lg:py-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-0 top-0 h-40 w-40 rounded-full bg-[color:var(--accent-soft)] blur-3xl opacity-70" />
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[color:var(--highlight)]/10 blur-3xl" />
          </div>

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-surface-alt p-3 text-[var(--primary)] shadow-sm">
                  <UserRound size={22} />
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
                      User Drilldown
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="heading-1">{user.email}</h1>
                      <RiskBadge
                        level={risk.level}
                        color={risk.color as "green" | "red" | "yellow"}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-muted">
                    <span className="rounded-full border border-subtle bg-surface px-3 py-1.5 font-mono">
                      {user.id}
                    </span>
                    <span className="rounded-full border border-subtle bg-surface px-3 py-1.5">
                      {user.verified ? "Verified account" : "Unverified account"}
                    </span>
                    <span className="rounded-full border border-subtle bg-surface px-3 py-1.5">
                      Last seen {formatTimeAgo(user.lastLogin ?? latestSession?.lastUsedAt, referenceNow)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="max-w-2xl text-sm text-muted">
                Review the user’s access footprint, credential inventory,
                activity timeline, and security signals from one place.
              </p>

              <div className="flex flex-wrap gap-2">
                <InfoPill label="Roles" value={`${user.roles.length}`} />
                <InfoPill label="Active sessions" value={`${sessions.length}`} />
                <InfoPill label="Credentials" value={`${credentials.length}`} />
                <InfoPill label="Suspicious signals" value={`${suspiciousCount}`} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <FocusPanel
                icon={ShieldAlert}
                title="Security pressure"
                value={`${failedLogins + suspiciousCount}`}
                description="Failed logins and suspicious events combined into a quick triage indicator."
              />

              <FocusPanel
                icon={ShieldOff}
                title="Session footprint"
                value={`${sessions.length}`}
                description="Current session count across devices and IP addresses."
              />

              <div className="rounded-2xl border border-subtle bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-alt)_72%,transparent),transparent)] p-4">
                <div className="space-y-3">
                  <div className="text-sm font-medium text-primary">
                    Quick actions
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setEditing(true)} className="btn btn-primary">
                      Edit User
                    </button>
                    <button
                      onClick={revokeAllSessions}
                      className="btn btn-secondary"
                    >
                      Revoke Sessions
                    </button>
                    <button onClick={handleDeleteUser} className="btn btn-danger">
                      Delete User
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Roles"
          value={user.roles.length}
          hint={user.roles.length ? user.roles.join(", ") : "No roles assigned"}
        />
        <StatCard
          label="Verified"
          value={user.verified ? "Yes" : "No"}
          hint="Current account verification state"
        />
        <StatCard
          label="Sessions"
          value={sessions.length}
          hint={latestSession ? `Last seen ${formatTimeAgo(latestSession.lastUsedAt, referenceNow)}` : "No active sessions"}
        />
        <StatCard
          label="Suspicious Signals"
          value={suspiciousCount}
          hint={
            suspiciousCount > 0
              ? `${failedLogins} failed logins in this detail record`
              : "No suspicious activity currently surfaced"
          }
        />
      </div>

      <Tabs
        tabs={["Overview", "Sessions", "Credentials", "Events", "Security"]}
        active={tab}
        onChange={(nextTab) => setTab(nextTab as typeof tab)}
      />

      {tab === "Overview" && (
        <div className="space-y-6">
          <Section
            title="Login Activity"
            description="Recent login pattern for this user, split between successful and failed auth events."
          >
            <MiniLineChart data={timeseries?.timeseries} />
          </Section>

          <div className="grid gap-4 lg:grid-cols-3">
            <ActionCard
              title="Account posture"
              value={user.verified ? "Verified" : "Needs verification"}
              description="A quick status check for whether the user has completed verification."
            />

            <ActionCard
              title="Session recency"
              value={
                latestSession
                  ? formatTimeAgo(latestSession.lastUsedAt, referenceNow)
                  : "No sessions"
              }
              description="Most recent activity seen in the user’s session footprint."
            />

            <ActionCard
              title="Risk summary"
              value={risk.level}
              description={
                suspiciousCount > 0
                  ? "Suspicious signals are present and worth a closer review."
                  : "No suspicious signals currently surfaced for this user."
              }
            />
          </div>
        </div>
      )}

      {tab === "Sessions" && (
        <Section
          title="Session Inventory"
          description="Current sessions for this user, including recency and expiry timing."
        >
          <Table<Session>
            selectable
            emptyTitle="No sessions for this user"
            emptyDescription="This user currently has no active sessions to revoke or review."
            columns={[
              {
                key: "ipAddress",
                label: "Network",
                render: (value, row) => (
                  <div className="flex flex-col">
                    <span className="font-mono text-sm text-primary">
                      {value ?? "Unknown IP"}
                    </span>
                    <span className="text-xs text-muted">
                      Expires {formatTimeUntil(row.expiresAt, referenceNow)}
                    </span>
                  </div>
                ),
              },
              {
                key: "userAgent",
                label: "Device",
                render: (value) => (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-primary">
                      {formatUserAgent(value)}
                    </span>
                    <span className="truncate text-xs text-muted">
                      {value ?? "No user agent provided"}
                    </span>
                  </div>
                ),
              },
              {
                key: "lastUsedAt",
                label: "Last Used",
                sortable: true,
                render: (value) => (
                  <div className="flex flex-col">
                    <span className="text-sm text-primary">
                      {formatTimeAgo(value as string, referenceNow)}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(value as string).toLocaleString()}
                    </span>
                  </div>
                ),
              },
            ]}
            actions={[
              {
                icon: ShieldOff,
                label: "Revoke",
                variant: "danger",
                onClick: (row) => revokeSession.mutate(row.id),
              },
            ]}
            bulkActions={[
              {
                label: "Revoke Selected",
                variant: "danger",
                onClick: (rows) =>
                  rows.forEach((row) => revokeSession.mutate(row.id)),
              },
            ]}
            data={sessions}
          />
        </Section>
      )}

      {tab === "Credentials" && (
        <Section
          title="Credential Inventory"
          description="Registered credential and device details associated with this user."
        >
          <Table<Credential>
            emptyTitle="No credentials found"
            emptyDescription="This user does not currently have credential records in the dashboard feed."
            columns={[
              {
                key: "deviceType",
                label: "Device",
                render: (value) => (
                  <span className="text-sm text-primary">
                    {(value as string) ?? "Unknown device"}
                  </span>
                ),
              },
              { key: "browser", label: "Browser" },
              { key: "platform", label: "Platform" },
              {
                key: "createdAt",
                label: "Created",
                sortable: true,
                render: (value) => (
                  <div className="flex flex-col">
                    <span className="text-sm text-primary">
                      {formatTimeAgo(value as string, referenceNow)}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(value as string).toLocaleString()}
                    </span>
                  </div>
                ),
              },
            ]}
            data={credentials}
          />
        </Section>
      )}

      {tab === "Events" && (
        <Section
          title="Recent Events"
          description="Auth and account-related events returned as part of this user detail record."
          actions={
            <button
              onClick={() => navigate(`/events`)}
              className="btn btn-secondary"
            >
              Open Event Stream
            </button>
          }
        >
          <Table<AuthEvent>
            emptyTitle="No events returned"
            emptyDescription="No events were returned for this user in the current detail record."
            columns={[
              {
                key: "type",
                label: "Event",
                render: (value) => (
                  <span className="text-sm font-medium text-primary">
                    {value as string}
                  </span>
                ),
              },
              {
                key: "ip_address",
                label: "IP",
                render: (value) => (
                  <span className="font-mono text-sm text-primary">
                    {(value as string) ?? "Unknown IP"}
                  </span>
                ),
              },
              {
                key: "created_at",
                label: "Observed",
                sortable: true,
                render: (value) => (
                  <div className="flex flex-col">
                    <span className="text-sm text-primary">
                      {formatTimeAgo(value as string, referenceNow)}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(value as string).toLocaleString()}
                    </span>
                  </div>
                ),
              },
            ]}
            data={events}
          />
        </Section>
      )}

      {tab === "Security" && (
        <div className="space-y-6">
          <Section
            title="Security Signals"
            description="User-specific anomalies, related IPs, and related user agents surfaced by the backend."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <ActionCard
                title="Suspicious events"
                value={`${suspiciousCount}`}
                description="User-specific anomalous events currently surfaced."
              />
              <ActionCard
                title="Related IPs"
                value={`${relatedIps.length}`}
                description="Distinct network origins associated with suspicious activity."
              />
              <ActionCard
                title="Related agents"
                value={`${relatedAgents.length}`}
                description="Distinct user agents linked to the anomaly feed."
              />
            </div>

            {(relatedIps.length > 0 || relatedAgents.length > 0) && (
              <div className="grid gap-4 lg:grid-cols-2">
                <TokenList
                  title="Related IPs"
                  emptyLabel="No related IPs"
                  items={relatedIps}
                />
                <TokenList
                  title="Related User Agents"
                  emptyLabel="No related user agents"
                  items={relatedAgents}
                />
              </div>
            )}
          </Section>

          <Section
            title="Suspicious Activity Feed"
            description="Detailed suspicious events tied to this user."
          >
            <Table<AuthEvent>
              emptyTitle="No suspicious activity detected"
              emptyDescription="This user currently has no suspicious events in the anomaly feed."
              columns={[
                {
                  key: "type",
                  label: "Signal",
                  render: (value) => (
                    <span className="text-sm font-medium text-[var(--highlight)]">
                      {value as string}
                    </span>
                  ),
                },
                {
                  key: "ip_address",
                  label: "IP",
                  render: (value) => (
                    <span className="font-mono text-sm text-primary">
                      {(value as string) ?? "Unknown IP"}
                    </span>
                  ),
                },
                {
                  key: "created_at",
                  label: "Observed",
                  render: (value) => (
                    <div className="flex flex-col">
                      <span className="text-sm text-primary">
                        {formatTimeAgo(value as string, referenceNow)}
                      </span>
                      <span className="text-xs text-muted">
                        {new Date(value as string).toLocaleString()}
                      </span>
                    </div>
                  ),
                },
              ]}
              data={anomalies?.suspiciousEvents ?? []}
            />
          </Section>
        </div>
      )}

      {editing && (
        <EditUserModal user={user} onClose={() => setEditing(false)} />
      )}
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
  icon: React.ComponentType<{ size?: number }>;
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

function ActionCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-subtle bg-[color:var(--surface-alt)]/60 p-4">
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
          {title}
        </div>
        <div className="text-2xl font-semibold tracking-tight text-primary">
          {value}
        </div>
        <p className="text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}

function TokenList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-subtle bg-surface p-4">
      <div className="mb-3 text-sm font-medium text-primary">{title}</div>
      <div className="flex flex-wrap gap-2">
        {items.length > 0 ? (
          items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-subtle bg-surface-alt px-3 py-1.5 text-xs text-primary"
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-muted">{emptyLabel}</span>
        )}
      </div>
    </div>
  );
}
