/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldAlert, Users, Waves } from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
import { useAuthTimeseries } from "../hooks/useAuthTimeseries";
import { useGroupedEvents } from "../hooks/useGroupedEvents";
import LineChart from "../components/LineChart";
import PieChart from "../components/PieChart";
import Skeleton from "../components/Skeleton";
import StatCard from "../components/StatCard";
import { Section } from "../components/Section";
import { formatBytes } from "../lib/formatBytes";

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function Overview() {
  const navigate = useNavigate();

  const { data, isLoading } = useDashboard();
  const { data: timeseries } = useAuthTimeseries();
  const { data: grouped } = useGroupedEvents();

  const totalAttempts =
    (data?.loginSuccess24h ?? 0) + (data?.loginFailed24h ?? 0);
  const failureRate = 1 - (data?.successRate24h ?? 0);

  const busiestBucket = timeseries?.timeseries.length
    ? timeseries.timeseries.reduce((best, point) => {
        const currentLoad = point.success + point.failed;
        const bestLoad = (best?.success ?? 0) + (best?.failed ?? 0);

        return currentLoad > bestLoad ? point : best;
      }, timeseries.timeseries[0])
    : undefined;

  const dominantEvent = grouped?.summary.length
    ? grouped.summary.reduce((best, item) => {
        return (item.count ?? 0) > (best?.count ?? 0) ? item : best;
      }, grouped.summary[0])
    : undefined;

  const securitySignalCount = grouped?.summary.length
    ? grouped.summary
        .filter((item) => item.type.includes("suspicious"))
        .reduce((sum, item) => sum + item.count, 0)
    : 0;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-subtle bg-surface shadow-[0_1px_0_rgba(255,255,255,0.35)_inset]">
        <div className="relative px-6 py-6 lg:px-8 lg:py-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-0 top-0 h-48 w-48 rounded-full bg-[color:var(--accent-soft)] blur-3xl opacity-70" />
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[color:var(--highlight)]/10 blur-3xl" />
          </div>

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] lg:items-start">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
                  Control Plane
                </div>
                <h1 className="heading-1">Overview</h1>
                <p className="max-w-2xl text-sm text-muted">
                  A live snapshot of authentication health, growth, and operator
                  attention areas across your Seamless Auth deployment.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusPill
                  label="24h auth attempts"
                  value={totalAttempts.toLocaleString()}
                />
                <StatusPill
                  label="Peak hour volume"
                  value={
                    busiestBucket
                      ? `${busiestBucket.success + busiestBucket.failed}`
                      : "0"
                  }
                />
                <StatusPill
                  label="Top event"
                  value={dominantEvent?.type ?? "n/a"}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <HighlightPanel
                icon={ShieldAlert}
                title="Security posture"
                value={`${Math.round((securitySignalCount ?? 0) + (data?.loginFailed24h ?? 0))}`}
                description="Suspicious and failed auth signals worth review today."
                onClick={() => navigate("/security")}
                actionLabel="Open Security"
              />

              <HighlightPanel
                icon={Users}
                title="User growth"
                value={`${data?.newUsers24h ?? 0}`}
                description="Accounts created in the last 24 hours."
                onClick={() => navigate("/users")}
                actionLabel="Review Users"
              />

              <HighlightPanel
                icon={Waves}
                title="Event traffic"
                value={formatPercent(data?.successRate24h ?? 0)}
                description="Authentication success rate across recent traffic."
                onClick={() => navigate("/events")}
                actionLabel="Inspect Events"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))
        ) : (
          <>
            <StatCard
              label="Users"
              value={data?.totalUsers ?? 0}
              hint={`${data?.newUsers24h ?? 0} new in the last 24 hours`}
            />
            <StatCard
              label="Database"
              value={formatBytes(data?.databaseSize ?? 0)}
              hint="Current storage footprint"
            />
            <StatCard
              label="Sessions"
              value={data?.activeSessions ?? 0}
              hint="Active sessions in the last 24 hours"
            />
            <StatCard
              label="Successful Logins"
              value={data?.loginSuccess24h ?? 0}
              hint={`${totalAttempts.toLocaleString()} total attempts in the same window`}
            />
            <StatCard
              label="Failure Rate"
              value={formatPercent(failureRate)}
              hint={
                failureRate > 0.1
                  ? "Elevated enough to merit review"
                  : "Within a low-friction range"
              }
            />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <Section
          title="Login Activity"
          description="Hourly authentication flow for the last 24 hours, split between successful and failed attempts."
          actions={
            <button
              onClick={() => navigate("/events")}
              className="btn btn-secondary"
            >
              View Events
            </button>
          }
        >
          {timeseries ? (
            <LineChart data={timeseries.timeseries} />
          ) : (
            <Skeleton className="h-72 rounded-2xl" />
          )}
        </Section>

        <Section
          title="Event Distribution"
          description="The highest-volume auth events currently shaping traffic across the system."
          actions={
            <button
              onClick={() => navigate("/security")}
              className="btn btn-secondary"
            >
              Review Security
            </button>
          }
        >
          {grouped ? (
            <PieChart data={grouped.summary} />
          ) : (
            <Skeleton className="h-72 rounded-2xl" />
          )}
        </Section>
      </div>

      <Section
        title="Operator Focus"
        description="Use this section to quickly decide where to spend attention next."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <ActionCard
            tone={(data?.loginFailed24h ?? 0) > 0 ? "danger" : "neutral"}
            title="Failed logins"
            value={`${data?.loginFailed24h ?? 0}`}
            description="Recent login failures are the fastest signal of friction or abuse."
            actionLabel="Investigate security"
            onClick={() => navigate("/security")}
          />

          <ActionCard
            tone="neutral"
            title="Passkey adoption"
            value={`${data?.passkeyUsage24h ?? 0}`}
            description="Passkey usage helps show whether stronger authentication paths are gaining traction."
            actionLabel="Explore events"
            onClick={() => navigate("/events")}
          />

          <ActionCard
            tone="neutral"
            title="New user activity"
            value={`${data?.newUsers24h ?? 0}`}
            description="Freshly created accounts can point to product growth, onboarding spikes, or provisioning issues."
            actionLabel="Open users"
            onClick={() => navigate("/users")}
          />
        </div>
      </Section>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-subtle bg-surface px-3 py-1.5 text-xs text-muted">
      <span className="font-medium text-primary">{value}</span>
      <span className="mx-1 opacity-60">•</span>
      <span>{label}</span>
    </div>
  );
}

function HighlightPanel({
  icon: Icon,
  title,
  value,
  description,
  actionLabel,
  onClick,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
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
