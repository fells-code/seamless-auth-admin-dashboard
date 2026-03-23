import {
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
          <XAxis dataKey="bucket" tickFormatter={formatTick} stroke="#9ca3af" />

          <YAxis stroke="#9ca3af" />

          <Tooltip
            labelFormatter={(label) =>
              interval === "day"
                ? formatDay(label)
                : new Date(label).toLocaleString()
            }
          />

          <Legend />

          <Line
            type="monotone"
            dataKey="success"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            name="Success"
          />

          <Line
            type="monotone"
            dataKey="failed"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            name="Failed"
          />
        </RLineChart>
      </ResponsiveContainer>
    </div>
  );
}
