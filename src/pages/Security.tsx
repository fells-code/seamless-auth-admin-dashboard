/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ComponentType } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldAlert, Siren, Waypoints } from "lucide-react";
import { useAnomalies, type AuthEventPartial } from "../hooks/useAnomalies";
import { useLoginStats } from "../hooks/useLoginStats";
import Skeleton from "../components/Skeleton";
import StatCard from "../components/StatCard";
import Table from "../components/Table";
import { Section } from "../components/Section";

type LoginStats = {
  success: number;
  failed: number;
  successRate?: number;
};

function formatTimeAgo(value?: string, now?: number) {
  if (!value) return "Unknown";

  const diff = (now ?? new Date().getTime()) - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  return `${Math.floor(hrs / 24)}d ago`;
}

function buildEventFilterUrl(type?: string) {
  return type ? `/events?type=${encodeURIComponent(type)}` : "/events";
}

export default function Security() {
  const navigate = useNavigate();
  const [referenceNow] = useState(() => Date.now());

  const { data: anomalies, isLoading: loadingAnomalies } = useAnomalies();
  const { data: stats, isLoading: loadingStats } = useLoginStats();

  const suspiciousEvents: AuthEventPartial[] = anomalies?.suspiciousEvents ?? [];
  const loginStats = stats as LoginStats | undefined;

  const uniqueIps = new Set(
    suspiciousEvents.map((event) => event.ip_address).filter(Boolean),
  ).size;

  const topEventType = suspiciousEvents.reduce<{
    type: string;
    count: number;
  } | null>((best, event) => {
    const type = event.type ?? "unknown";
    const count = suspiciousEvents.filter((entry) => entry.type === type).length;

    if (!best || count > best.count) {
      return { type, count };
    }

    return best;
  }, null);

  const latestSignal = suspiciousEvents.reduce<AuthEventPartial | null>(
    (latest, event) => {
      if (!event.created_at) return latest;
      if (!latest?.created_at) return event;

      return new Date(event.created_at).getTime() >
        new Date(latest.created_at).getTime()
        ? event
        : latest;
    },
    null,
  );

  if (loadingStats || loadingAnomalies) {
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

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-subtle bg-surface shadow-[0_1px_0_rgba(255,255,255,0.35)_inset]">
        <div className="relative px-6 py-6 lg:px-8 lg:py-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-0 top-0 h-40 w-40 rounded-full bg-[color:var(--highlight)]/10 blur-3xl" />
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[color:var(--accent-soft)] blur-3xl opacity-70" />
          </div>

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
                  Security Review
                </div>
                <h1 className="heading-1">Security</h1>
                <p className="max-w-2xl text-sm text-muted">
                  Review failed logins, suspicious event types, and the spread
                  of anomalous activity across IPs and recent auth traffic.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <SignalPill label="Suspicious signals" value={`${anomalies?.total ?? 0}`} />
                <SignalPill label="Unique flagged IPs" value={`${uniqueIps}`} />
                <SignalPill
                  label="Most common threat"
                  value={topEventType?.type ?? "n/a"}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <FocusPanel
                icon={ShieldAlert}
                title="Failed auth pressure"
                value={`${loginStats?.failed ?? 0}`}
                description="Recent failed logins are often the fastest high-volume warning sign."
                actionLabel="Open events"
                onClick={() => navigate(buildEventFilterUrl("login_failed"))}
              />

              <FocusPanel
                icon={Waypoints}
                title="Suspicious spread"
                value={`${uniqueIps}`}
                description="The number of distinct IPs involved helps estimate how broad the risk surface is."
                actionLabel="Review anomalies"
                onClick={() => navigate("/events")}
              />

              <FocusPanel
                icon={Siren}
                title="Latest signal"
                value={latestSignal ? formatTimeAgo(latestSignal.created_at, referenceNow) : "none"}
                description="Most recent suspicious event seen in the anomaly feed."
                actionLabel="Open security"
                onClick={() => navigate("/security")}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Successful Logins"
          value={loginStats?.success ?? 0}
          hint="Successful authentication attempts in the current stats window"
        />
        <StatCard
          label="Failed Logins"
          value={loginStats?.failed ?? 0}
          hint="Operators should correlate spikes here with suspicious events"
        />
        <StatCard
          label="Success Rate"
          value={`${Math.round((loginStats?.successRate ?? 0) * 100)}%`}
          hint="A sharp drop can indicate auth friction or abuse"
        />
        <StatCard
          label="Suspicious Events"
          value={anomalies?.total ?? 0}
          hint="Signals currently surfaced by the anomaly feed"
        />
      </div>

      <Section
        title="Operator Focus"
        description="A quick triage lane for deciding where to spend attention next."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <ActionCard
            tone={(loginStats?.failed ?? 0) > 0 ? "danger" : "neutral"}
            title="Failed login volume"
            value={`${loginStats?.failed ?? 0}`}
            description="If this climbs quickly, move to events and look for repeated sources or patterns."
            actionLabel="Inspect failed logins"
            onClick={() => navigate(buildEventFilterUrl("login_failed"))}
          />

          <ActionCard
            tone={(anomalies?.total ?? 0) > 0 ? "danger" : "neutral"}
            title="Suspicious event load"
            value={`${anomalies?.total ?? 0}`}
            description="Suspicious events deserve a deeper look when they cluster around the same IPs or types."
            actionLabel="Open events"
            onClick={() => navigate("/events")}
          />

          <ActionCard
            tone="neutral"
            title="Most common signal"
            value={topEventType?.type ?? "No anomalies"}
            description="The dominant suspicious event type is usually the best first clue about what is happening."
            actionLabel="Filter event type"
            onClick={() =>
              navigate(buildEventFilterUrl(topEventType?.type))
            }
          />
        </div>
      </Section>

      <Section
        title="Suspicious Activity"
        description="Security-related anomalies currently surfaced by the backend anomaly feed."
        actions={
          <button
            onClick={() => navigate("/events")}
            className="btn btn-secondary"
          >
            View Full Event Stream
          </button>
        }
      >
        <Table<AuthEventPartial>
          emptyTitle="No suspicious activity detected"
          emptyDescription="The anomaly feed is currently quiet, which is a good time to review the broader event stream or system configuration."
          columns={[
            {
              key: "type",
              label: "Signal",
              render: (value, row) => (
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--highlight)]">
                    {(value as string) ?? "Unknown type"}
                  </span>
                  <span className="text-xs text-muted">
                    {row.user_id ? `User ${row.user_id}` : "System-level signal"}
                  </span>
                </div>
              ),
            },
            {
              key: "ip_address",
              label: "Origin",
              render: (value, row) => (
                <div className="flex flex-col">
                  <span className="font-mono text-sm text-primary">
                    {(value as string) ?? "Unknown IP"}
                  </span>
                  <span className="truncate text-xs text-muted">
                    {row.user_agent ?? "No user agent provided"}
                  </span>
                </div>
              ),
            },
            {
              key: "created_at",
              label: "Observed",
              sortable: true,
              render: (value) => (
                <div className="flex flex-col">
                  <span className="text-sm text-primary">
                    {formatTimeAgo(value as string | undefined, referenceNow)}
                  </span>
                  <span className="text-xs text-muted">
                    {value ? new Date(value as string).toLocaleString() : "No timestamp"}
                  </span>
                </div>
              ),
            },
          ]}
          data={suspiciousEvents}
        />
      </Section>
    </div>
  );
}

function SignalPill({ label, value }: { label: string; value: string }) {
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
  actionLabel,
  onClick,
}: {
  icon: ComponentType<{ size?: number }>;
  title: string;
  value: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-2xl border border-subtle bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-alt)_72%,transparent),transparent)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-xl bg-surface p-2 text-[var(--primary)] shadow-sm">
          <Icon size={18} />
        </div>
        <button
          onClick={onClick}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted transition hover:text-primary"
        >
          {actionLabel}
          <ArrowRight size={12} />
        </button>
      </div>

      <div className="mt-4 space-y-1">
        <div className="text-sm font-medium text-primary">{title}</div>
        <div className="text-2xl font-semibold tracking-tight text-primary">
          {value}
        </div>
        <div className="text-sm text-muted">{description}</div>
      </div>
    </div>
  );
}

function ActionCard({
  title,
  value,
  description,
  actionLabel,
  onClick,
  tone = "neutral",
}: {
  title: string;
  value: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
  tone?: "neutral" | "danger";
}) {
  const toneStyles =
    tone === "danger"
      ? "border-subtle bg-[linear-gradient(180deg,color-mix(in_srgb,var(--highlight)_12%,transparent),transparent)]"
      : "border-subtle bg-[color:var(--surface-alt)]/60";

  return (
    <div className={`rounded-2xl border p-4 ${toneStyles}`}>
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
          {title}
        </div>
        <div className="text-2xl font-semibold tracking-tight text-primary">
          {value}
        </div>
        <p className="text-sm text-muted">{description}</p>
      </div>

      <button
        onClick={onClick}
        className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary transition hover:opacity-80"
      >
        {actionLabel}
        <ArrowRight size={14} />
      </button>
    </div>
  );
}
