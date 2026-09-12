/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldAlert, Users, Waves } from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
import RefreshControl from "../components/RefreshControl";
import { useAuthTimeseries } from "../hooks/useAuthTimeseries";
import { useGroupedEvents } from "../hooks/useGroupedEvents";
import { useFunnelMetrics } from "../hooks/useFunnelMetrics";
import type { IntervalStats } from "../hooks/useFunnelMetrics";
import { useSignInMetrics } from "../hooks/useSignInMetrics";
import LineChart from "../components/LineChart";
import OutcomeBreakdown from "../components/OutcomeBreakdown";
import PieChart from "../components/PieChart";
import Skeleton from "../components/Skeleton";
import StatCard from "../components/StatCard";
import { Section } from "../components/Section";
import { QueryErrorState, StateMessage } from "../components/StateMessage";
import RangeFilter from "../components/RangeFilter";
import { getErrorMessage } from "../lib/errorMessage";
import { formatBytes } from "../lib/formatBytes";
import { formatDuration } from "../lib/formatDuration";
import { describeDropOff, pivotBreakdown } from "../lib/signInBreakdown";
import {
  applyRangeToParams,
  describeRange,
  getRangeFromSearch,
  intervalForRange,
  resolveRangeBounds,
} from "../lib/timeRange";

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

// A median means nothing without the count behind it: three readings and three
// thousand render the same number.
function describeInterval(stats: IntervalStats, noun: string, range: string) {
  if (stats.count === 0) return `No ${noun} completed in ${range}`;

  return `p90 ${formatDuration(stats.p90Seconds)} across ${stats.count.toLocaleString()} ${noun} in ${range}`;
}

export default function Overview() {
  const navigate = useNavigate();
  const location = useLocation();
  const [referenceNow] = useState(() => Date.now());

  // The window lives in the URL the way the events feed does, so a narrowed
  // view is linkable and survives a reload.
  const range = useMemo(
    () => getRangeFromSearch(location.search),
    [location.search],
  );

  // Relative ranges resolve against a reference captured once, so the bounds
  // stay stable across renders instead of changing the query key continuously.
  const bounds = useMemo(
    () => resolveRangeBounds(range, referenceNow),
    [range, referenceNow],
  );

  const interval = useMemo(
    () => intervalForRange(range, referenceNow),
    [range, referenceNow],
  );

  const rangeLabel = describeRange(range);

  const handleRangeChange = (next: typeof range) =>
    navigate({
      pathname: "/",
      search: `?${applyRangeToParams(new URLSearchParams(), next)}`,
    });

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useDashboard();
  const {
    data: timeseries,
    isError: timeseriesError,
    error: timeseriesErrorValue,
    refetch: refetchTimeseries,
  } = useAuthTimeseries({ ...bounds, interval });
  const {
    data: grouped,
    isError: groupedError,
    error: groupedErrorValue,
    refetch: refetchGrouped,
  } = useGroupedEvents(bounds);
  const {
    data: funnel,
    isError: funnelError,
    error: funnelErrorValue,
    refetch: refetchFunnel,
  } = useFunnelMetrics(bounds);
  const {
    data: signIns,
    isError: signInsError,
    error: signInsErrorValue,
    refetch: refetchSignIns,
  } = useSignInMetrics(bounds);

  const dropOff = signIns ? describeDropOff(signIns.attempts) : undefined;
  const byMethod = signIns ? pivotBreakdown(signIns.breakdown, "method") : [];
  const byDevice = signIns
    ? pivotBreakdown(signIns.breakdown, "deviceClass")
    : [];
  const byProvider = signIns
    ? pivotBreakdown(signIns.breakdown, "mailProvider")
    : [];

  const totalAttempts =
    (data?.loginSuccess24h ?? 0) + (data?.loginFailed24h ?? 0);
  // With no attempts in the window there is no rate to report. Deriving one
  // anyway rendered "100%" next to "Elevated enough to merit review" on the
  // landing screen, which reads as a complete authentication outage.
  const failureRate =
    totalAttempts > 0 ? 1 - (data?.successRate24h ?? 0) : null;

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

  const securitySignalCount =
    grouped?.summary.find((item) => item.type === "security")?.count ?? 0;

  if (isError) {
    return (
      <QueryErrorState
        title="Could not load overview metrics"
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
                  attention areas across your Seamless Auth deployment. The
                  range below drives the activity chart and the event
                  distribution.
                </p>
              </div>

              {/* The screen describes itself as a live snapshot but never
                  refreshed, so the figures silently went stale. */}
              <RefreshControl
                onRefresh={() => {
                  void refetch();
                  void refetchTimeseries();
                  void refetchGrouped();
                  void refetchFunnel();
                  void refetchSignIns();
                }}
                isRefreshing={isFetching}
                updatedAt={dataUpdatedAt}
              />

              <RangeFilter
                value={range}
                onChange={handleRangeChange}
                label="Activity time range"
              />

              <div className="flex flex-wrap gap-2">
                <StatusPill
                  label="24h auth attempts (fixed window)"
                  value={totalAttempts.toLocaleString()}
                />
                <StatusPill
                  label={`Peak ${interval} in ${rangeLabel}`}
                  value={
                    busiestBucket
                      ? `${busiestBucket.success + busiestBucket.failed}`
                      : "0"
                  }
                />
                <StatusPill
                  label={`Top event in ${rangeLabel}`}
                  value={dominantEvent?.label ?? dominantEvent?.type ?? "n/a"}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <HighlightPanel
                icon={ShieldAlert}
                title="Security posture"
                value={`${securitySignalCount}`}
                description={`Suspicious auth signals in ${rangeLabel}.`}
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

      <div className="space-y-3">
        <p className="text-sm text-muted">
          Deployment metrics cover a fixed 24-hour window. The metrics endpoint
          takes no date range, so these figures do not follow the range
          selector.
        </p>

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
                value={
                  failureRate === null ? "n/a" : formatPercent(failureRate)
                }
                hint={
                  failureRate === null
                    ? "No authentication attempts in this window"
                    : failureRate > 0.1
                      ? "Elevated enough to merit review"
                      : "Within a low-friction range"
                }
              />
            </>
          )}
        </div>
      </div>

      <Section
        title="Passwordless Funnel"
        description={`How long the path takes and how far passkeys are adopted, for what started in ${rangeLabel}. Each figure is a median, with the p90 and the count it was computed over beneath it.`}
      >
        {funnelError ? (
          <StateMessage
            tone="error"
            title="Funnel metrics unavailable"
            description={getErrorMessage(funnelErrorValue)}
          />
        ) : funnel ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Time to registration"
              value={formatDuration(funnel.timeToRegistration.medianSeconds)}
              hint={describeInterval(
                funnel.timeToRegistration,
                "registrations",
                rangeLabel,
              )}
            />
            <StatCard
              label="Time to login"
              value={formatDuration(funnel.timeToLogin.medianSeconds)}
              hint={describeInterval(
                funnel.timeToLogin,
                "sign-ins",
                rangeLabel,
              )}
            />
            <StatCard
              label="Passkey adoption"
              value={
                funnel.passkeyAdoption.users > 0
                  ? formatPercent(funnel.passkeyAdoption.rate)
                  : "n/a"
              }
              hint={
                funnel.passkeyAdoption.users > 0
                  ? `${funnel.passkeyAdoption.withPasskey.toLocaleString()} of ${funnel.passkeyAdoption.users.toLocaleString()} accounts created in ${rangeLabel} hold a passkey`
                  : `No accounts created in ${rangeLabel}`
              }
            />
            <StatCard
              label="Time to first passkey"
              value={formatDuration(funnel.timeToFirstPasskey.medianSeconds)}
              hint={describeInterval(
                funnel.timeToFirstPasskey,
                "enrollments",
                rangeLabel,
              )}
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Sign-in Outcomes"
        description={`How sign-in attempts in ${rangeLabel} ended, and where the ones that did not get in stopped. Counted per attempt, so a code mistyped and then entered correctly is one success.`}
      >
        {signInsError ? (
          <StateMessage
            tone="error"
            title="Sign-in metrics unavailable"
            description={getErrorMessage(signInsErrorValue)}
          />
        ) : signIns && dropOff ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Sign-in success"
                value={
                  signIns.signIns.success + signIns.signIns.failed > 0
                    ? formatPercent(signIns.signIns.successRate)
                    : "n/a"
                }
                hint={
                  signIns.signIns.success + signIns.signIns.failed > 0
                    ? `${signIns.signIns.success.toLocaleString()} got in, ${signIns.signIns.failed.toLocaleString()} did not, in ${rangeLabel}`
                    : `No factors presented in ${rangeLabel}`
                }
              />
              <StatCard
                label="Attempts started"
                value={signIns.attempts.started.toLocaleString()}
                hint={`${signIns.attempts.presented.toLocaleString()} presented a factor and ${signIns.attempts.completed.toLocaleString()} completed in ${rangeLabel}`}
              />
              <StatCard
                label="Gave up early"
                value={dropOff.abandoned.toLocaleString()}
                hint="Started and never presented a factor"
              />
              <StatCard
                label="Failed and stopped"
                value={dropOff.stopped.toLocaleString()}
                hint="Presented a factor and never got in"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <OutcomeBreakdown
                title="By method"
                entries={byMethod}
                emptyDescription={`No factors presented in ${rangeLabel}`}
              />
              <OutcomeBreakdown
                title="By device"
                entries={byDevice}
                emptyDescription={`No factors presented in ${rangeLabel}`}
              />
              <OutcomeBreakdown
                title="By mail provider"
                entries={byProvider}
                emptyDescription={`No factors presented in ${rangeLabel}`}
              />
            </div>
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        )}
      </Section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <Section
          title="Login Activity"
          description={`Authentication flow across ${rangeLabel}, bucketed by ${interval} and split between successful and failed attempts.`}
          actions={
            <button
              onClick={() => navigate("/events")}
              className="btn btn-secondary"
            >
              View Events
            </button>
          }
        >
          {timeseriesError ? (
            <StateMessage
              tone="error"
              title="Login activity unavailable"
              description={getErrorMessage(timeseriesErrorValue)}
            />
          ) : timeseries ? (
            <LineChart data={timeseries.timeseries} />
          ) : (
            <Skeleton className="h-72 rounded-2xl" />
          )}
        </Section>

        <Section
          title="Event Distribution"
          description={`The highest-volume auth events across ${rangeLabel}.`}
          actions={
            <button
              onClick={() => navigate("/security")}
              className="btn btn-secondary"
            >
              Review Security
            </button>
          }
        >
          {groupedError ? (
            <StateMessage
              tone="error"
              title="Event distribution unavailable"
              description={getErrorMessage(groupedErrorValue)}
            />
          ) : grouped ? (
            <PieChart data={grouped.summary} />
          ) : (
            <Skeleton className="h-72 rounded-2xl" />
          )}
        </Section>
      </div>

      <Section
        title="Operator Focus"
        description="Use this section to quickly decide where to spend attention next. These figures come from the fixed 24-hour metrics window."
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

          {/* passkeyUsage24h counts passkey sign-ins. Adoption, the share of
              accounts holding one, is the funnel figure above, and the two
              used to share a title. */}
          <ActionCard
            tone="neutral"
            title="Passkey sign-ins"
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
