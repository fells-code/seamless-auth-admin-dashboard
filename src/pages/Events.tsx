/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Clock3, Filter, ShieldAlert } from "lucide-react";
import { useEvents } from "../hooks/useEvents";
import Table from "../components/Table";
import Skeleton from "../components/Skeleton";
import EventFilters from "../components/EventFilters";
import StatCard from "../components/StatCard";
import { Section } from "../components/Section";
import { eventGroups } from "../lib/eventGroups";
import { AuthEventTypeEnum } from "../types/authEventTypes";
import type { AuthEvent } from "@seamless-auth/types";

export type EventFilter = {
  type: string[];
  from?: string;
  to?: string;
  range: "1h" | "24h" | "7d" | "custom";
};

const groupedTypeAliases = new Set(
  eventGroups.map((group) => group.value).filter(Boolean),
);

const concreteEventTypes = AuthEventTypeEnum.options.filter(
  (type) => !groupedTypeAliases.has(type),
);

function getFiltersFromSearch(search: string): EventFilter {
  const params = new URLSearchParams(search);
  const type = params.getAll("type");
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;

  return {
    type,
    from,
    to,
    range: from || to ? "custom" : "24h",
  };
}

function formatTimeAgo(value?: string, now?: number) {
  if (!value) return "Unknown";

  const diff = (now ?? new Date().getTime()) - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  return `${Math.floor(hrs / 24)}d ago`;
}

function expandEventTypes(types: string[]) {
  return Array.from(
    new Set(
      types.flatMap((type) => {
        const matchingGroup = eventGroups.find((group) => group.value === type);

        if (!matchingGroup || matchingGroup.value === "") {
          return [type];
        }

        return concreteEventTypes.filter(matchingGroup.match);
      }),
    ),
  );
}

export default function Events() {
  const navigate = useNavigate();
  const location = useLocation();
  const [referenceNow] = useState(() => Date.now());
  const [offset, setOffset] = useState(0);
  const limit = 10;
  const filters = useMemo(
    () => getFiltersFromSearch(location.search),
    [location.search],
  );
  const effectiveTypes = useMemo(
    () => expandEventTypes(filters.type),
    [filters.type],
  );

  const { data, isLoading } = useEvents({
    type: effectiveTypes,
    from: filters.from,
    to: filters.to,
    offset,
    limit,
  });

  const events: AuthEvent[] = data?.events ?? [];
  const total = data?.total ?? 0;

  const uniqueTypes = new Set(events.map((event) => event.type)).size;
  const uniqueIps = new Set(events.map((event) => event.ip_address).filter(Boolean))
    .size;
  const securitySignalCount = events.filter((event) =>
    event.type.includes("suspicious"),
  ).length;
  const latestEvent = events[0]?.created_at;

  const clearFilters = () => {
    setOffset(0);
    navigate("/events");
  };

  const handleFiltersChange = (nextFilters: EventFilter) => {
    const params = new URLSearchParams();

    nextFilters.type.forEach((type) => params.append("type", type));
    if (nextFilters.from) params.set("from", nextFilters.from);
    if (nextFilters.to) params.set("to", nextFilters.to);

    setOffset(0);
    navigate({
      pathname: "/events",
      search: params.toString() ? `?${params.toString()}` : "",
    });
  };

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-subtle bg-surface shadow-[0_1px_0_rgba(255,255,255,0.35)_inset]">
        <div className="relative px-6 py-6 lg:px-8 lg:py-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-0 top-0 h-40 w-40 rounded-full bg-[color:var(--accent-soft)] blur-3xl opacity-70" />
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[color:var(--highlight)]/10 blur-3xl" />
          </div>

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
                  Investigation Feed
                </div>
                <h1 className="heading-1">Events</h1>
                <p className="max-w-2xl text-sm text-muted">
                  Explore authentication activity across your system, narrow it
                  by category and time window, and drill into the identities or
                  network origins that need attention.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <InfoPill label="Matched events" value={`${total}`} />
                <InfoPill label="Visible event types" value={`${uniqueTypes}`} />
                <InfoPill label="Visible IPs" value={`${uniqueIps}`} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <FocusPanel
                icon={Clock3}
                title="Latest event"
                value={latestEvent ? formatTimeAgo(latestEvent, referenceNow) : "n/a"}
                description="How recently the newest visible event occurred."
              />

              <FocusPanel
                icon={Filter}
                title="Filters active"
                value={`${
                  filters.type.length +
                  (filters.from ? 1 : 0) +
                  (filters.to ? 1 : 0)
                }`}
                description="Current filter count applied to the event stream."
              />

              <FocusPanel
                icon={ShieldAlert}
                title="Security signals"
                value={`${securitySignalCount}`}
                description="Suspicious event volume inside the current visible set."
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Matched Events"
          value={total}
          hint="Total events matching the current filter set"
        />
        <StatCard
          label="Event Types"
          value={uniqueTypes}
          hint="Distinct event categories visible in the current page"
        />
        <StatCard
          label="Visible IPs"
          value={uniqueIps}
          hint="Unique network origins in the current page of results"
        />
        <StatCard
          label="Suspicious Signals"
          value={securitySignalCount}
          hint="Suspicious event count inside the currently visible page"
        />
      </div>

      <Section
        title="Filter Bar"
        description="Use broad activity groups and relative or custom time ranges to isolate the event slice you need."
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={clearFilters} className="btn btn-secondary">
              Clear Filters
            </button>
            <Link to="/security" className="btn btn-secondary">
              Open Security
            </Link>
          </div>
        }
      >
        <EventFilters
          value={filters}
          onChange={handleFiltersChange}
        />
      </Section>

      <Section
        title="Operator Focus"
        description="Quick context for deciding whether this slice of activity needs deeper review."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <ActionCard
            title="Latest activity"
            value={latestEvent ? formatTimeAgo(latestEvent, referenceNow) : "n/a"}
            description="How recent the newest visible event is in the current result set."
          />

          <ActionCard
            title="Dominant direction"
            value={securitySignalCount > 0 ? "Security review" : "General traffic"}
            description="A fast read on whether the current slice looks operational or security-oriented."
          />

          <ActionCard
            title="Linked identities"
            value={`${events.filter((event) => event.user_id).length}`}
            description="How many visible events are tied directly to known users."
          />
        </div>
      </Section>

      {isLoading ? (
        <Skeleton className="h-[440px] rounded-2xl" />
      ) : (
        <Section
          title="Event Stream"
          description="The current page of matching events, with direct paths to related users and activity sources."
        >
          <Table<AuthEvent>
            limit={limit}
            offset={offset}
            total={total}
            onPageChange={setOffset}
            emptyTitle="No events found for the current filters"
            emptyDescription="Try widening the time range or clearing some filters to bring more activity into view."
            columns={[
              {
                key: "type",
                label: "Event",
                sortable: true,
                render: (value, row) => (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-primary">
                      {value as string}
                    </span>
                    <span className="text-xs text-muted">
                      {row.user_id ? "User-linked event" : "System-level event"}
                    </span>
                  </div>
                ),
              },
              {
                key: "user_id",
                label: "User",
                render: (value) =>
                  value ? (
                    <button
                      onClick={() => navigate(`/users/${value}`)}
                      className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-primary"
                    >
                      <span className="font-mono">{(value as string).slice(0, 8)}...</span>
                      <ArrowRight size={12} />
                    </button>
                  ) : (
                    <span className="text-sm text-subtle">System</span>
                  ),
              },
              {
                key: "ip_address",
                label: "Origin",
                render: (value, row) => (
                  <div className="flex flex-col">
                    <span className="font-mono text-sm text-primary">
                      {(value as string) ?? "Unknown IP"}
                    </span>
                    <span className="text-xs text-muted">
                      {row.type.includes("suspicious") ? "Security-relevant source" : "Observed request origin"}
                    </span>
                  </div>
                ),
              },
              {
                key: "created_at",
                label: "Observed",
                sortable: true,
                render: (value) => (
                  <div className="flex flex-col">
                    <span className="text-sm text-primary">
                      {formatTimeAgo(value as string, referenceNow)}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(value as string).toLocaleString()}
                    </span>
                  </div>
                ),
              },
            ]}
            data={events}
          />
        </Section>
      )}
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-subtle bg-surface px-3 py-1.5 text-xs text-muted">
      <span className="font-medium text-primary">{value}</span>
      <span className="mx-1 opacity-60">•</span>
      <span>{label}</span>
    </div>
  );
}

function FocusPanel({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-subtle bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-alt)_72%,transparent),transparent)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-xl bg-surface p-2 text-[var(--primary)] shadow-sm">
          <Icon size={18} />
        </div>

        <div className="text-2xl font-semibold tracking-tight text-primary">
          {value}
        </div>
      </div>

      <div className="mt-4 space-y-1">
        <div className="text-sm font-medium text-primary">{title}</div>
        <div className="text-sm text-muted">{description}</div>
      </div>
    </div>
  );
}

function ActionCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-subtle bg-[color:var(--surface-alt)]/60 p-4">
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
          {title}
        </div>
        <div className="text-2xl font-semibold tracking-tight text-primary">
          {value}
        </div>
        <p className="text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}
