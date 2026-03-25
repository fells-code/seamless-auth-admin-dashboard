import { useDashboard } from "../hooks/useDashboard";
import { useAuthTimeseries } from "../hooks/useAuthTimeseries";
import { useGroupedEvents } from "../hooks/useGroupedEvents";

import LineChart from "../components/LineChart";
import PieChart from "../components/PieChart";
import Skeleton from "../components/Skeleton";
import StatCard from "../components/StatCard";
import { formatBytes } from "../lib/formatBytes";

export default function Overview() {
  const { data, isLoading } = useDashboard();
  const { data: timeseries } = useAuthTimeseries();
  const { data: grouped } = useGroupedEvents();

  return (
    <div className="space-y-10">
      {/* Header / Hero */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          System activity and authentication insights
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard label="Users" value={data?.totalUsers} />
            <StatCard
              label="Database"
              value={formatBytes(data?.databaseSize ?? 0)}
            />
            <StatCard
              label="Sessions - Last 24h"
              value={data?.activeSessions}
            />
            <StatCard
              label="Logins  - Last 24h"
              value={data?.loginSuccess24h}
            />
            <StatCard
              label="Failure Rate  - Last 24h"
              value={`${Math.round((1 - (data?.successRate24h || 0)) * 100)}%`}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Login Activity" subtitle="Last 24 hours" />

          {timeseries ? (
            <LineChart data={timeseries.timeseries} />
          ) : (
            <Skeleton className="h-64 rounded-xl" />
          )}
        </Card>

        <Card>
          <CardHeader title="Event Distribution" subtitle="Grouped activity" />

          {grouped ? (
            <PieChart data={grouped.summary} />
          ) : (
            <Skeleton className="h-64 rounded-xl" />
          )}
        </Card>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-2 gap-5">
        <InsightCard
          title="Login Failures - Last 24h"
          message={`${data?.loginFailed24h ?? 0} failures in the last 24 hours`}
          tone={data?.loginFailed24h > 0 ? "danger" : "neutral"}
        />

        <InsightCard
          title="Passkey Usage - Last 24h"
          message={`${data?.passkeyUsage24h ?? 0} passkey logins`}
          tone="neutral"
        />
      </div>
    </div>
  );
}

function InsightCard({
  title,
  message,
  tone = "neutral",
}: {
  title: string;
  message: string;
  tone?: "neutral" | "danger";
}) {
  const styles =
    tone === "danger"
      ? "bg-accent-soft dark:bg-accent-soft text-red-400"
      : "bg-accent-soft dark:bg-accent-soft border-gray-300 dark:border-gray-700";

  return (
    <div className={`p-4 rounded-xl border ${styles}`}>
      <div className="font-medium">{title}</div>
      <div className="text-sm mt-1 opacity-80">{message}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-accent-soft dark:bg-accent-soft backdrop-blur border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}
