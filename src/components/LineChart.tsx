/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  Area,
} from "recharts";

type ChartPoint = {
  bucket: string; // ISO date string
  success: number;
  failed: number;
};

type Interval = "hour" | "day";

function formatHour(value: string) {
  const d = new Date(value);
  return `${d.getHours()}:00`;
}

function formatDay(value: string) {
  const d = new Date(value);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function LineChart({
  data,
  interval = "hour",
  title = "Authentication activity over time",
}: {
  data: ChartPoint[];
  interval?: Interval;
  title?: string;
}) {
  const formatTick = interval === "day" ? formatDay : formatHour;

  // The pie chart on the same screens has an explicit empty state; this one
  // drew its axes and legend and nothing else, so a quiet deployment was
  // indistinguishable from a chart that failed to load.
  if (data.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-subtle bg-surface-alt text-sm text-muted">
        No authentication activity in this period
      </div>
    );
  }

  const totalSuccess = data.reduce((sum, point) => sum + point.success, 0);
  const totalFailed = data.reduce((sum, point) => sum + point.failed, 0);
  const formatLabel = interval === "day" ? formatDay : formatHour;

  return (
    <div className="w-full">
      {/* The SVG carries no text of its own, so the chart is announced as a
          single image with a summary, and the table below is the real
          alternative for anyone who cannot see it. */}
      <div
        role="img"
        aria-label={`${title}. ${totalSuccess} successful and ${totalFailed} failed events across ${data.length} intervals.`}
        className="h-64 w-full"
      >
        <ResponsiveContainer>
          <RLineChart data={data}>
            {/* Grid */}
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="bucket"
              tickFormatter={formatTick}
              stroke="var(--text-muted)"
              tick={{ fontSize: 12 }}
            />

            <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12 }} />

            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
              }}
              labelStyle={{
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
              labelFormatter={(label) => {
                if (typeof label !== "string") return label;

                return interval === "day"
                  ? formatDay(label)
                  : new Date(label).toLocaleString();
              }}
            />

            <Legend
              wrapperStyle={{
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            />

            {/* SUCCESS */}
            <Area
              type="monotone"
              dataKey="success"
              stroke="none"
              fill="var(--accent-soft)"
            />

            <Line
              type="monotone"
              dataKey="success"
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={false}
              name="Success"
            />

            {/* FAILED */}
            <Area
              type="monotone"
              dataKey="failed"
              stroke="none"
              fill="rgba(229,127,96,0.15)"
            />

            <Line
              type="monotone"
              dataKey="failed"
              stroke="var(--highlight)"
              strokeWidth={2.5}
              dot={false}
              name="Failed"
            />
          </RLineChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Success</th>
            <th scope="col">Failed</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.bucket}>
              <th scope="row">{formatLabel(point.bucket)}</th>
              <td>{point.success}</td>
              <td>{point.failed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
