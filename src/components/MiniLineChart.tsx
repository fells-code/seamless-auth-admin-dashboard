import { LineChart, Line, ResponsiveContainer } from "recharts";

export default function MiniLineChart({ data }: { data: any[] }) {
  return (
    <div className="h-24 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="success"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="failed"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
