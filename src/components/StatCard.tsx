export default function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="group relative rounded-xl border border-subtle bg-surface p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]">
      {/* subtle accent glow */}
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_top,rgba(229,127,96,0.12),transparent_60%)]" />

      {/* content */}
      <div className="relative">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted">
          {label}
        </div>

        <div className="mt-2 text-2xl font-semibold tracking-tight">
          {value}
        </div>
      </div>
    </div>
  );
}
