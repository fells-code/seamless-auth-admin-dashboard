import { LineChart, Line, ResponsiveContainer, Area, Tooltip } from "recharts";

function formatLabel(value: string) {
  const d = new Date(value);
  return d.toLocaleString();
}

export default function MiniLineChart({ data }: { data: any[] }) {
  return (
    <div className="h-24 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          {/* Tooltip */}
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
            labelFormatter={formatLabel}
            formatter={(value: number, name: string) => [
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
