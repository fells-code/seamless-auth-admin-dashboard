/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useSessions } from "../hooks/useSessions";
import { useRevokeSession } from "../hooks/useRevokeSession";
import Table from "../components/Table";
import Skeleton from "../components/Skeleton";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { Session } from "../types/user";

function formatUserAgent(ua?: string | null) {
  if (!ua) return "Unknown device";

  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";

  return ua.slice(0, 30) + "...";
}

export default function Sessions() {
  const { data, isLoading } = useSessions();
  const revoke = useRevokeSession();

  const [offset, setOffset] = useState(0);
  const limit = 10;

  const total = data?.total ?? 0;
  const sessions = data?.sessions ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="heading-1">Sessions</h1>
        <p className="text-muted text-sm">Active sessions across your system</p>
      </div>

      <Table<Session>
        selectable
        limit={limit}
        offset={offset}
        total={total}
        onPageChange={setOffset}
        columns={[
          {
            key: "ipAddress",
            label: "IP Address",
            sortable: true,
            render: (value) => (
              <span className="font-mono text-sm">{value}</span>
            ),
          },
          {
            key: "userAgent",
            label: "Device",
            render: (value) => (
              <div className="flex flex-col">
                <span className="text-sm">{formatUserAgent(value)}</span>
                {value && (
                  <span className="text-xs text-muted truncate max-w-[200px]">
                    {value}
                  </span>
                )}
              </div>
            ),
          },
          {
            key: "lastUsedAt",
            label: "Last Used",
            sortable: true,
            render: (value) => (
              <span className="text-sm">
                {new Date(value as string).toLocaleString()}
              </span>
            ),
          },
        ]}
        data={sessions}
        actions={[
          {
            icon: Trash2,
            label: "Revoke",
            variant: "danger",
            onClick: (row) => revoke.mutate(row.id),
          },
        ]}
        bulkActions={[
          {
            label: "Revoke Selected",
            variant: "danger",
            onClick: (rows) => rows.forEach((r) => revoke.mutate(r.id)),
          },
        ]}
      />
    </div>
  );
}
