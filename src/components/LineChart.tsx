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
}: {
  data: any[];
  interval?: "hour" | "day";
}) {
  const formatTick = interval === "day" ? formatDay : formatHour;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <RLineChart data={data}>
          {/* subtle grid */}
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
            labelFormatter={(label) =>
              interval === "day"
                ? formatDay(label)
                : new Date(label).toLocaleString()
            }
          />

          <Legend
            wrapperStyle={{
              fontSize: "12px",
              color: "var(--text-muted)",
            }}
          />

          {/* SUCCESS (teal) */}
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

          {/* FAILED (terracotta) */}
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
  );
}
