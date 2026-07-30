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

export default function PieChart({
  data,
  title = "Event distribution by category",
}: {
  data: PieChartDatum[];
  title?: string;
}) {
  const navigate = useNavigate();
  const chartData = data
    .filter((item) => item.count > 0)
    .map((item) => ({
      ...item,
      label: item.label ?? item.type,
    }));

  const total = chartData.reduce((sum, item) => sum + item.count, 0);

  const openCategory = (type: string) =>
    navigate(type === "other" ? "/events" : buildEventQuery({ type }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-xl border border-dashed border-subtle bg-surface-alt text-sm text-muted">
        No event data yet
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Announced as one image with a summary. The interactive legend below is
          both the text alternative and the keyboard route to the filtering the
          segments offer, which was previously mouse-only and undiscoverable. */}
      <div
        role="img"
        aria-label={`${title}. ${total} events across ${chartData.length} categories.`}
        className="h-64 w-full"
      >
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

                openCategory(e.type);
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
          </RPieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-wrap gap-2">
        {chartData.map((item, i) => (
          <li key={item.type}>
            <button
              type="button"
              onClick={() => openCategory(item.type)}
              className="flex items-center gap-2 rounded-full border border-subtle bg-surface px-3 py-1 text-xs text-muted transition hover:bg-surface-alt hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: generateColor(i) }}
              />
              <span>
                {item.label} ({item.count})
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted">
        Select a category to filter the events feed by it.
      </p>
    </div>
  );
}
