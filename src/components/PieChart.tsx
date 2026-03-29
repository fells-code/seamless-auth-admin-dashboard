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
  count: number;
};

/* ---------- Helpers ---------- */

function generateColor(index: number) {
  const palette = [
    "var(--primary)",
    "var(--accent)",
    "var(--highlight)",
    "#8C6A5D",
    "#5A7D7C",
    "#D4A373",
    "#7F5539",
    "#6B9080",
  ];

  return palette[index % palette.length];
}

/* ---------- Component ---------- */

export default function PieChart({ data }: { data: PieChartDatum[] }) {
  const navigate = useNavigate();

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <RPieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="type"
            outerRadius={90}
            innerRadius={50}
            paddingAngle={0}
            onClick={(entry) => {
              // Recharts types are messy → narrow safely
              if (!entry || typeof entry !== "object") return;

              const e = entry as unknown as PieChartDatum;

              navigate(
                buildEventQuery({
                  type: e.type,
                }),
              );
            }}
          >
            {data.map((_, i) => (
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
            wrapperStyle={{
              fontSize: "12px",
              color: "var(--text-muted)",
            }}
          />
        </RPieChart>
      </ResponsiveContainer>
    </div>
  );
}
