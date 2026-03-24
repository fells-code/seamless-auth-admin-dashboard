// src/pages/Security.tsx
import { useAnomalies } from "../hooks/useAnomalies";
import { useLoginStats } from "../hooks/useLoginStats";
import Skeleton from "../components/Skeleton";
import StatCard from "../components/StatCard";
import Table from "../components/Table";

function formatTimeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Security() {
  const { data: anomalies, isLoading: loadingAnomalies } = useAnomalies();
  const { data: stats, isLoading: loadingStats } = useLoginStats();

  const suspiciousEvents = anomalies?.suspiciousEvents ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="heading-1">Security</h1>
        <p className="text-muted text-sm">
          Monitor authentication risks and anomalies
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-5">
        {loadingStats ? (
          <>
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </>
        ) : (
          <>
            <StatCard label="Login Success" value={stats?.success ?? 0} />

            <StatCard label="Login Failures" value={stats?.failed ?? 0} />

            <StatCard
              label="Success Rate"
              value={
                stats ? `${Math.round((stats.successRate || 0) * 100)}%` : "0%"
              }
            />
          </>
        )}
      </div>

      {/* Alerts */}
      <Card className="border-[var(--highlight)]/30 bg-[rgba(229,127,96,0.08)]">
        <CardHeader title="Recent Failed Logins" subtitle="Last 24 hours" />

        {loadingAnomalies ? (
          <Skeleton className="h-10 rounded-xl" />
        ) : (
          <div className="text-2xl font-semibold text-[var(--highlight)]">
            {anomalies?.failedLogins ?? 0}
          </div>
        )}
      </Card>

      {/* Suspicious Activity */}
      <Card>
        <CardHeader
          title="Suspicious Activity"
          subtitle="Security-related events"
        />

        {loadingAnomalies ? (
          <Skeleton className="h-14 rounded-xl" />
        ) : suspiciousEvents.length === 0 ? (
          <div className="text-muted text-sm">
            No suspicious activity detected
          </div>
        ) : (
          <Table
            columns={[
              {
                key: "type",
                label: "Type",
                render: (value: string) => (
                  <span className="text-sm font-medium text-[var(--highlight)]">
                    {value}
                  </span>
                ),
              },
              {
                key: "ip_address",
                label: "IP",
                render: (value: string) => (
                  <span className="font-mono text-sm">{value}</span>
                ),
              },
              {
                key: "created_at",
                label: "Time",
                render: (value: string) => (
                  <span className="text-sm text-muted">
                    {formatTimeAgo(value)}
                  </span>
                ),
              },
            ]}
            data={suspiciousEvents}
          />
        )}
      </Card>
    </div>
  );
}

/* ---------- Shared UI ---------- */

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-surface border border-subtle rounded-xl p-5 ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {subtitle && <p className="text-subtle text-xs mt-1">{subtitle}</p>}
    </div>
  );
}
