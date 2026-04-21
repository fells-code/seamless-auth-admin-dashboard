/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

export default function StatCard({
  label,
  value,
  hint,
}: {
  label: number | string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-subtle bg-surface p-4 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),var(--accent),var(--highlight))] opacity-80" />
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)]" />

      <div className="relative space-y-2">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          {label}
        </div>

        <div className="text-2xl font-semibold tracking-tight text-primary">
          {value}
        </div>

        <div className="text-xs text-muted">
          {hint ?? "Live operational signal"}
        </div>
      </div>
    </div>
  );
}
