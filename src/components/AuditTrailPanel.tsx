/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useId, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import { Section } from "./Section";
import { StateMessage } from "./StateMessage";
import {
  type AuditIntegrityReport,
  exportBounds,
  useExportAuditTrail,
  useVerifyAuditTrail,
} from "../hooks/useAuditTrail";
import { useStepUpGuard } from "../hooks/useStepUpGuard";
import { useToast } from "../hooks/useToast";
import { getErrorMessage } from "../lib/errorMessage";

const controlClassName =
  "min-h-10 w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]";

const FAILURE_EXPLANATIONS: Record<
  NonNullable<AuditIntegrityReport["firstFailure"]>["reason"],
  string
> = {
  hash_mismatch:
    "an event's content no longer matches its hash, so it was edited",
  sequence_gap: "events are missing from the middle of the trail",
  broken_link:
    "an event does not link to the one before it, so events were reordered",
  head_mismatch: "the newest events are missing, or the chain head was changed",
};

function shortHash(hash: string | null | undefined) {
  return hash ? `${hash.slice(0, 12)}…${hash.slice(-6)}` : "none";
}

function IntegrityResult({ report }: { report: AuditIntegrityReport }) {
  const checkedAt = new Date(report.checkedAt).toLocaleString();

  if (!report.verified && report.firstFailure) {
    return (
      <StateMessage
        tone="error"
        title={`Audit trail failed verification at event ${report.firstFailure.seq}`}
        description={`The check found that ${FAILURE_EXPLANATIONS[report.firstFailure.reason]}. Checked ${report.rowsChecked} events at ${checkedAt}. Treat this as a security incident.`}
      />
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-subtle bg-surface-alt p-4 text-sm">
      <div className="font-medium text-primary">
        Audit trail verified: {report.rowsChecked} events, checked {checkedAt}
      </div>
      <p className="text-muted">
        Record the chain head somewhere outside this deployment. A later check
        whose trail does not pass through it shows the history was rewritten.
      </p>
      <dl className="grid gap-1 font-mono text-xs text-primary sm:grid-cols-[auto_1fr] sm:gap-x-4">
        <dt className="text-muted">Head</dt>
        <dd className="break-all">
          event {report.head?.seq ?? 0}, {report.head?.hash ?? "none"}
        </dd>
        <dt className="text-muted">Oldest event</dt>
        <dd>{report.firstSeq ?? "none"}</dd>
        <dt className="text-muted">Anchor</dt>
        <dd title={report.anchorHash ?? undefined}>
          {report.anchorHash
            ? `${shortHash(report.anchorHash)} (last archived event)`
            : "start of the trail"}
        </dd>
      </dl>
    </div>
  );
}

export default function AuditTrailPanel() {
  const fromId = useId();
  const toId = useId();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const verify = useVerifyAuditTrail();
  const exportTrail = useExportAuditTrail();
  const ensureStepUp = useStepUpGuard();
  const toast = useToast();
  const [stepUpPending, setStepUpPending] = useState(false);

  const invalidRange = Boolean(from && to && from > to);

  const handleExport = async () => {
    setStepUpPending(true);
    try {
      // The API asks for a fresh step-up too. Checking first means the operator
      // is prompted here rather than shown a refusal after the fact.
      if (!(await ensureStepUp())) return;

      exportTrail.mutate(exportBounds(from, to), {
        onSuccess: () =>
          toast.success(
            "Audit events exported",
            "The file ends with a manifest line. A file without one is incomplete.",
          ),
      });
    } finally {
      setStepUpPending(false);
    }
  };

  return (
    <Section
      title="Audit Trail"
      description="Every auth event is hash-chained to the one before it and cannot be edited or deleted through the application. Verify the chain, or export a period for an auditor."
    >
      <div className="space-y-5">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => verify.mutate()}
            disabled={verify.isPending}
            className="btn btn-secondary inline-flex items-center gap-2"
          >
            <ShieldCheck size={16} />
            {verify.isPending ? "Verifying…" : "Verify integrity"}
          </button>

          {verify.isError && (
            <StateMessage
              tone="error"
              title="Integrity check did not run"
              description={getErrorMessage(verify.error)}
            />
          )}
          {verify.data && <IntegrityResult report={verify.data} />}
        </div>

        <div className="space-y-3 border-t border-subtle pt-5">
          <p className="text-sm text-muted">
            Exports are newline-delimited JSON with each event&apos;s hash, so
            the file can be verified without this deployment. Leave both dates
            empty to export the whole trail. Exporting requires a fresh step-up
            and is itself recorded.
          </p>

          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="space-y-1">
              <label htmlFor={fromId} className="text-xs text-muted">
                From (UTC)
              </label>
              <input
                id={fromId}
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => setFrom(event.target.value)}
                className={controlClassName}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={toId} className="text-xs text-muted">
                To (UTC, included)
              </label>
              <input
                id={toId}
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => setTo(event.target.value)}
                className={controlClassName}
              />
            </div>
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={exportTrail.isPending || stepUpPending || invalidRange}
              className="btn btn-secondary inline-flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Export events
            </button>
          </div>

          {invalidRange && (
            <StateMessage
              tone="error"
              title="Check the dates"
              description="The start of the period is after its end."
            />
          )}
          {exportTrail.isError && (
            <StateMessage
              tone="error"
              title="Export failed"
              description={getErrorMessage(exportTrail.error)}
            />
          )}
        </div>
      </div>
    </Section>
  );
}
