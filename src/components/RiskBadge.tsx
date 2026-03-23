// src/components/RiskBadge.tsx
export default function RiskBadge({
  level,
  color,
}: {
  level: string;
  color: "red" | "yellow" | "green";
}) {
  const styles = {
    red: "bg-red-500/20 text-red-400 border-red-500",
    yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500",
    green: "bg-green-500/20 text-green-400 border-green-500",
  };

  return (
    <span className={`px-3 py-1 rounded-full border text-sm ${styles[color]}`}>
      {level}
    </span>
  );
}
