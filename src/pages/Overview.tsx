// src/pages/Overview.tsx
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
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Overview</h1>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))
        ) : (
          <>
            <StatCard
              label="Users"
              value={data?.totalUsers}
              sub="+24h growth"
            />
            <StatCard
              label="Database Size"
              value={formatBytes(data?.databaseSize ?? 0)}
            />
            <StatCard label="Sessions" value={data?.activeSessions} />
            <StatCard label="Login Success" value={data?.loginSuccess24h} />
            <StatCard
              label="Failure Rate"
              value={`${Math.round((1 - (data?.successRate24h || 0)) * 100)}%`}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Login Activity */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
          <h2 className="mb-2 font-semibold">Login Activity</h2>

          {timeseries ? (
            <LineChart data={timeseries.timeseries} />
          ) : (
            <Skeleton className="h-64" />
          )}
        </div>

        {/* Event Distribution */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
          <h2 className="mb-2 font-semibold">Event Distribution</h2>

          {grouped ? (
            <PieChart data={grouped.summary} />
          ) : (
            <Skeleton className="h-64" />
          )}
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-2 gap-4">
        <InsightCard
          title="Login Failures"
          message={`${data?.loginFailed24h ?? 0} failures in last 24h`}
        />

        <InsightCard
          title="Passkey Usage"
          message={`${data?.passkeyUsage24h ?? 0} passkey logins`}
        />
      </div>
    </div>
  );
}

function InsightCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="bg-yellow-500/10 border border-yellow-500 p-4 rounded-lg">
      <div className="font-semibold">{title}</div>
      <div className="text-sm">{message}</div>
    </div>
  );
}
