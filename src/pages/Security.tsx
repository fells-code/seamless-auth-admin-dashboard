// src/pages/Security.tsx
import { useAnomalies } from "../hooks/useAnomalies";
import { useLoginStats } from "../hooks/useLoginStats";
import Skeleton from "../components/Skeleton";
import StatCard from "../components/StatCard";
import Table from "../components/Table";

export default function Security() {
  const { data: anomalies, isLoading: loadingAnomalies } = useAnomalies();
  const { data: stats, isLoading: loadingStats } = useLoginStats();

  const suspiciousEvents = anomalies?.suspiciousEvents ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Security</h1>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        {loadingStats ? (
          <>
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
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

      {/* Failed login spike */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Recent Failed Logins</h2>

        {loadingAnomalies ? (
          <Skeleton className="h-10" />
        ) : (
          <div className="text-red-500 text-xl font-bold">
            {anomalies?.failedLogins ?? 0}
          </div>
        )}
      </div>

      {/* Suspicious events table */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Suspicious Activity</h2>

        {loadingAnomalies ? (
          <Skeleton className="h-10" />
        ) : suspiciousEvents.length === 0 ? (
          <div className="text-gray-500">No suspicious activity</div>
        ) : (
          <Table
            columns={[
              { key: "type", label: "Type" },
              { key: "ip_address", label: "IP" },
              { key: "created_at", label: "Time" },
            ]}
            data={suspiciousEvents.map((e: any) => ({
              ...e,
              created_at: new Date(e.created_at).toLocaleString(),
            }))}
          />
        )}
      </div>
    </div>
  );
}
