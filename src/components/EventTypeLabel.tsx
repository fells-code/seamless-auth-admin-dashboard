/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import clsx from "clsx";
import RiskBadge from "./RiskBadge";
import { getEventLabel, isHighSeverityEvent } from "../lib/eventLabels";

export default function EventTypeLabel({
  type,
  metadata,
  tone = "primary",
}: {
  type: string;
  metadata?: Record<string, unknown> | null;
  tone?: "primary" | "highlight";
}) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="flex flex-wrap items-center gap-2">
        <span
          className={clsx(
            "text-sm font-medium",
            tone === "highlight" ? "text-[var(--highlight)]" : "text-primary",
          )}
        >
          {getEventLabel(type)}
        </span>
        {isHighSeverityEvent(type, metadata) && (
          <RiskBadge level="High severity" color="red" />
        )}
      </span>
      <span className="font-mono text-xs text-muted">{type}</span>
    </span>
  );
}
