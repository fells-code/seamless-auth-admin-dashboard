/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { LineChart, Line, ResponsiveContainer, Area, Tooltip } from "recharts";
import type { TimeSeriesData } from "../hooks/useUserTimeseries";

function formatLabel(value: string) {
  const d = new Date(value);
  return d.toLocaleString();
}

export default function MiniLineChart({
  data,
}: {
  data: TimeSeriesData[] | undefined;
}) {
  return (
    <div className="h-24 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--text)",
              fontSize: "12px",
            }}
            labelStyle={{
              color: "var(--text-muted)",
              fontSize: "11px",
            }}
            labelFormatter={(label) => {
              if (typeof label !== "string") return label;
              return formatLabel(label);
            }}
            formatter={(value, name) => [
              value,
              name === "success" ? "Success" : "Failed",
            ]}
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
            strokeWidth={2}
            dot={false}
            opacity={0.9}
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
            strokeWidth={2}
            dot={false}
            opacity={0.9}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
