import { useEffect, useState } from "react";
import { useEvents } from "../hooks/useEvents";
import Table from "../components/Table";
import Skeleton from "../components/Skeleton";
import EventFilters from "../components/EventFilters";
import { useSearchParams } from "react-router-dom";
import { collapseTypes } from "../lib/eventMapping";
import { getRange } from "../lib/timeRange";

export default function Events() {
  const [type, setType] = useState("");
  const [offset, setOffset] = useState(0);
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();
  const [range, setRange] = useState<"1h" | "24h" | "7d" | "custom">("24h");
  const limit = 20;
  const [searchParams, setSearchParams] = useSearchParams();

  const handleTypeChange = (value: string) => {
    setType(value);
    setOffset(0);

    const params = new URLSearchParams(searchParams);

    if (value) {
      params.set("type", value);
    } else {
      params.delete("type");
    }

    setSearchParams(params);
  };
  const { data, isLoading } = useEvents({
    type,
    offset,
    limit,
    from,
    to,
  });

  const handleFromChange = (value: string) => {
    setFrom(value || undefined);
    setOffset(0);

    const params = new URLSearchParams(searchParams);

    if (value) params.set("from", value);
    else params.delete("from");

    setSearchParams(params);
  };

  const handleRangeChange = (value: typeof range) => {
    setRange(value);
    setOffset(0);

    const params = new URLSearchParams(searchParams);

    if (value !== "custom") {
      const r = getRange(value);

      if (r) {
        params.set("from", r.from.toISOString());
        params.set("to", r.to.toISOString());
        setFrom(r.from.toISOString());
        setTo(r.to.toISOString());
      }
    }

    setSearchParams(params);
  };

  useEffect(() => {
    const rawTypes = searchParams.getAll("type");

    if (rawTypes.length > 0) {
      setType(collapseTypes(rawTypes));
    }

    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    if (fromParam) setFrom(fromParam);
    if (toParam) setTo(toParam);
  }, [searchParams]);

  const events = data?.events ?? [];

  const columns = [
    { key: "type", label: "Type" },
    { key: "user_id", label: "User" },
    { key: "ip_address", label: "IP" },
    { key: "created_at", label: "Time" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Events</h1>

      <div className="flex gap-3 items-center flex-wrap">
        <EventFilters type={type} setType={handleTypeChange} />

        {["1h", "24h", "7d", "custom"].map((r) => (
          <button
            key={r}
            onClick={() => handleRangeChange(r as any)}
            className={`px-3 py-1 rounded ${
              range === r
                ? "bg-purple-600 text-white"
                : "bg-gray-200 dark:bg-gray-800"
            }`}
          >
            {r === "1h" && "Last 1h"}
            {r === "24h" && "Last 24h"}
            {r === "7d" && "Last 7d"}
            {r === "custom" && "Custom"}
          </button>
        ))}

        {range === "custom" && (
          <div className="flex gap-2 items-center">
            <input
              type="datetime-local"
              value={from ?? ""}
              onChange={(e) => handleFromChange(e.target.value)}
              className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded"
            />

            <input
              type="datetime-local"
              value={to ?? ""}
              onChange={(e) => {
                setOffset(0);
                const val = e.target.value || undefined;
                setTo(val);

                const params = new URLSearchParams(searchParams);
                if (val) params.set("to", val);
                else params.delete("to");

                setSearchParams(params);
              }}
              className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded"
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-gray-500">No events found</div>
      ) : (
        <Table
          columns={columns}
          data={events.map((e: any) => ({
            ...e,
            created_at: new Date(e.created_at).toLocaleString(),
          }))}
        />
      )}

      <div className="flex gap-2">
        <button
          disabled={offset === 0}
          onClick={() => setOffset((o) => Math.max(0, o - limit))}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded"
        >
          Prev
        </button>

        <button
          onClick={() => setOffset((o) => o + limit)}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded"
        >
          Next
        </button>
      </div>
    </div>
  );
}
