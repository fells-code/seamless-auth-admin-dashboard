/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  PieChart as RPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { buildEventQuery } from "../lib/eventNavigation";

/* ---------- Types ---------- */

type PieChartDatum = {
  type: string;
  label?: string;
  count: number;
};

/* ---------- Helpers ---------- */

function generateColor(index: number) {
  const palette = [
    "var(--primary)",
    "var(--accent)",
    "var(--highlight)",
    "color-mix(in srgb, var(--primary) 70%, var(--accent))",
    "color-mix(in srgb, var(--accent) 70%, var(--highlight))",
    "color-mix(in srgb, var(--highlight) 70%, var(--primary))",
    "color-mix(in srgb, var(--primary) 55%, var(--surface-alt))",
    "color-mix(in srgb, var(--accent) 55%, var(--surface-alt))",
    "color-mix(in srgb, var(--highlight) 55%, var(--surface-alt))",
    "color-mix(in srgb, var(--primary) 65%, var(--text-muted))",
    "color-mix(in srgb, var(--accent) 65%, var(--text-muted))",
    "color-mix(in srgb, var(--highlight) 65%, var(--text-muted))",
  ];

  return palette[index % palette.length];
}

/* ---------- Component ---------- */

export default function PieChart({ data }: { data: PieChartDatum[] }) {
  const navigate = useNavigate();
  const chartData = data
    .filter((item) => item.count > 0)
    .map((item) => ({
      ...item,
      label: item.label ?? item.type,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-xl border border-dashed border-subtle bg-surface-alt text-sm text-muted">
        No event data yet
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <RPieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="label"
            outerRadius={90}
            innerRadius={50}
            paddingAngle={0}
            onClick={(entry) => {
              // Recharts types are messy → narrow safely
              if (!entry || typeof entry !== "object") return;

              const e = entry as unknown as PieChartDatum;

              navigate(
                e.type === "other"
                  ? "/events"
                  : buildEventQuery({ type: e.type }),
              );
            }}
          >
            {chartData.map((_, i) => (
              <Cell
                key={i}
                fill={generateColor(i)}
                className="transition-opacity hover:opacity-80 cursor-pointer"
              />
            ))}
          </Pie>

          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--text)",
            }}
          />

          <Legend
            iconSize={8}
            wrapperStyle={{
              fontSize: "11px",
              lineHeight: "16px",
              color: "var(--text-muted)",
            }}
          />
        </RPieChart>
      </ResponsiveContainer>
    </div>
  );
}
