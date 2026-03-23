// src/pages/Sessions.tsx
import { useSessions } from "../hooks/useSessions";
import { useRevokeSession } from "../hooks/useRevokeSession";
import Table from "../components/Table";
import Skeleton from "../components/Skeleton";

export default function Sessions() {
  const { data, isLoading } = useSessions();
  const revoke = useRevokeSession();

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
      <h1 className="text-2xl font-bold">Sessions</h1>

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
    </div>
  );
}
