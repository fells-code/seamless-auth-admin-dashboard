// src/pages/Sessions.tsx
import { useSessions } from "../hooks/useSessions";
import { useRevokeSession } from "../hooks/useRevokeSession";
import Table from "../components/Table";
import Skeleton from "../components/Skeleton";
import { useState } from "react";

export default function Sessions() {
  const { data, isLoading } = useSessions();
  const revoke = useRevokeSession();
  const [offset, setOffset] = useState(0);
  const limit = 10;

  const total = data?.total ?? 0;
  const start = offset + 1;
  const end = Math.min(offset + limit, total);

  const sessions = data?.sessions ?? [];

  const columns = [
    { key: "deviceName", label: "Device" },
    { key: "ipAddress", label: "IP" },
    { key: "lastUsedAt", label: "Last Used" },
    { key: "expiresAt", label: "Expires" },
    { key: "actions", label: "" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="heading-1">Sessions</h1>

      <Table
        columns={[
          { key: "ipAddress", label: "IP" },
          { key: "userAgent", label: "User Agent" },
          { key: "lastUsedAt", label: "Last Used" },
          { key: "actions", label: "" },
        ]}
        data={sessions.map((s: any) => ({
          ...s,
          lastUsedAt: new Date(s.lastUsedAt).toLocaleString(),
          actions: (
            <button
              onClick={() => revoke.mutate(s.id)}
              className="text-red-500 hover:underline"
            >
              Revoke
            </button>
          ),
        }))}
      />
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-400">
          Showing {start}-{end} of {total}
        </div>

        <div className="flex gap-2">
          <button
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded"
          >
            Prev
          </button>

          <button
            disabled={offset + limit >= total}
            onClick={() => setOffset((o) => o + limit)}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
