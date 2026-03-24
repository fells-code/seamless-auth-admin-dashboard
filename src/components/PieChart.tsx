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

export default function PieChart({ data }: { data: any[] }) {
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
            onClick={(entry: any) => {
              navigate(
                buildEventQuery({
                  type: entry.type,
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
