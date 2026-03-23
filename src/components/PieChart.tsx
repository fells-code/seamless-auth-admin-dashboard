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
    "#7c3aed",
    "#22c55e",
    "#ef4444",
    "#f59e0b",
    "#3b82f6",
    "#ec4899",
    "#14b8a6",
    "#f97316",
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
            outerRadius={80}
            onClick={(entry: any) => {
              navigate(
                buildEventQuery({
                  type: entry.type,
                }),
              );
            }}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={generateColor(i)} />
            ))}
          </Pie>
          <Legend />

          <Tooltip />
        </RPieChart>
      </ResponsiveContainer>
    </div>
  );
}
