import { useState } from "react";
import { useEvents } from "../hooks/useEvents";
import Table from "../components/Table";
import Skeleton from "../components/Skeleton";
import EventFilters from "../components/EventFilters";
import { useNavigate } from "react-router-dom";

function formatTimeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Events() {
  const navigate = useNavigate();

  const [offset, setOffset] = useState(0);

  const limit = 10;
  const [filters, setFilters] = useState({
    type: [],
    from: undefined,
    to: undefined,
    range: "24h",
  });

  const { data, isLoading } = useEvents({
    type: filters.type,
    from: filters.from,
    to: filters.to,
    offset,
    limit,
  });

  const events = data?.events ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="heading-1">Events</h1>
        <p className="text-muted text-sm">
          Authentication activity across your system
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <EventFilters
          value={filters}
          onChange={(v) => {
            setOffset(0);
            setFilters(v);
          }}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-muted text-sm">
          No events found for the selected filters
        </div>
      ) : (
        <Table
          limit={limit}
          offset={offset}
          total={total}
          onPageChange={setOffset}
          columns={[
            {
              key: "type",
              label: "Type",
              sortable: true,
              render: (value: string) => (
                <span className="text-sm font-medium text-primary">
                  {value}
                </span>
              ),
            },
            {
              key: "user_id",
              label: "User",
              render: (value: string) =>
                value ? (
                  <button
                    onClick={() => navigate(`/users/${value}`)}
                    className="text-sm text-muted hover:text-primary"
                  >
                    {value.slice(0, 8)}...
                  </button>
                ) : (
                  <span className="text-subtle">System</span>
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
              sortable: true,
              render: (value: string) => (
                <span className="text-sm text-muted">
                  {formatTimeAgo(value)}
                </span>
              ),
            },
          ]}
          data={events}
        />
      )}
    </div>
  );
}
