/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useId, useState } from "react";
import type { RecoveryProofingMethod } from "@seamless-auth/types";
import Dialog from "./Dialog";
import { useDeviceReplacementRecovery } from "../hooks/useDeviceReplacementRecovery";
import { useStepUpGuard } from "../hooks/useStepUpGuard";
import { StateMessage } from "./StateMessage";
import { getErrorMessage } from "../lib/errorMessage";
import { useToast } from "../hooks/useToast";

/**
 * Collects the identity proofing the API requires before it will revoke a
 * user's sessions, remove their passkeys and disable their TOTP.
 *
 * A remote exception needs a named approver, matching the server rule, so the
 * weaker path cannot be taken without someone's name on it.
 */
export default function DeviceReplacementModal({
  userId,
  userLabel,
  onClose,
}: {
  userId: string;
  userLabel: string;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<RecoveryProofingMethod>("in_person");
  const [evidenceRef, setEvidenceRef] = useState("");
  const [approver, setApprover] = useState("");
  const [stepUpPending, setStepUpPending] = useState(false);

  const deviceReplacement = useDeviceReplacementRecovery();
  const ensureStepUp = useStepUpGuard();
  const toast = useToast();

  const approverRequired = method === "remote_exception";
  const canSubmit =
    evidenceRef.trim().length > 0 &&
    (!approverRequired || approver.trim().length > 0);

  const submit = async () => {
    setStepUpPending(true);
    try {
      if (!(await ensureStepUp())) {
        return;
      }

      deviceReplacement.mutate(
        {
          userId,
          proofing: {
            method,
            evidenceRef: evidenceRef.trim(),
            ...(approverRequired ? { approver: approver.trim() } : {}),
          },
        },
        {
          onSuccess: (result) => {
            toast.success(
              "Device replacement prepared",
              `${result.revokedSessions} sessions revoked, ${result.removedCredentials} passkeys removed, ${result.disabledTotpCredentials} TOTP credentials disabled.`,
            );
            onClose();
          },
          onError: (error) => {
            toast.error("Device replacement failed", getErrorMessage(error));
          },
        },
      );
    } finally {
      setStepUpPending(false);
    }
  };

  const isSaving = deviceReplacement.isPending || stepUpPending;

  return (
    <Dialog
      title="Prepare device replacement"
      description={`Revoke every session, remove every passkey and disable TOTP for ${userLabel}`}
      onClose={onClose}
    >
      <>
        <div className="space-y-4">
          {deviceReplacement.isError && (
            <StateMessage
              tone="error"
              title="Device replacement failed"
              description={getErrorMessage(deviceReplacement.error)}
            />
          )}

          <StateMessage
            tone="warning"
            title="This cannot be undone"
            description="The user will have to enrol a new credential before they can sign in again."
          />

          <Choice
            label="How was identity confirmed?"
            value={method}
            onChange={setMethod}
          />

          <Input
            label="Evidence reference"
            value={evidenceRef}
            onChange={setEvidenceRef}
            hint="A ticket or case number. Do not enter personal data: identifiers are redacted from the audit trail."
          />

          {approverRequired && (
            <Input
              label="Approver"
              value={approver}
              onChange={setApprover}
              hint="Who authorised the exception to in-person proofing."
            />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>

          <button
            onClick={() => void submit()}
            disabled={isSaving || !canSubmit}
            className="btn btn-danger disabled:opacity-50"
          >
            {stepUpPending
              ? "Verifying..."
              : isSaving
                ? "Preparing..."
                : "Prepare"}
          </button>
        </div>
      </>
    </Dialog>
  );
}

/* ---------- Fields ---------- */

function Choice({
  label,
  value,
  onChange,
}: {
  label: string;
  value: RecoveryProofingMethod;
  onChange: (v: RecoveryProofingMethod) => void;
}) {
  const id = useId();

  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="text-xs text-muted uppercase tracking-wide"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as RecoveryProofingMethod)}
        className="w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
      >
        <option value="in_person">In person</option>
        <option value="remote_exception">Remote exception</option>
      </select>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const id = useId();
  const hintId = useId();

  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="text-xs text-muted uppercase tracking-wide"
      >
        {label}
      </label>

      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? hintId : undefined}
        className="w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
      />

      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
