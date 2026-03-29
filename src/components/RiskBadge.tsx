/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

export default function RiskBadge({
  level,
  color,
}: {
  level: string;
  color: "red" | "yellow" | "green";
}) {
  const styles = {
    red: "bg-[rgba(229,127,96,0.12)] text-[var(--highlight)] border-[rgba(229,127,96,0.3)]",
    yellow:
      "bg-[rgba(212,163,115,0.12)] text-[#d4a373] border-[rgba(212,163,115,0.3)]",
    green:
      "bg-[rgba(63,98,106,0.12)] text-[var(--accent)] border-[rgba(63,98,106,0.3)]",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium tracking-tight ${styles[color]}`}
    >
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {level}
      </span>
    </span>
  );
}
