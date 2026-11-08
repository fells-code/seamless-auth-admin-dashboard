/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import Dialog from "./Dialog";

export type RevealedSecret = {
  /** What the secret signs for, such as a webhook URL. */
  name: string;
  secret: string;
  /** Set after a rotation: until then the old secret signs beside this one. */
  previousSecretExpiresAt?: string | null;
};

/**
 * Shows a signing secret the API returns once. The caller drops it from state
 * on close, so it cannot be shown again without another rotation.
 */
export default function SigningSecretDialog({
  revealed,
  onClose,
}: {
  revealed: RevealedSecret;
  onClose: () => void;
}) {
  return (
    <Dialog
      title="Signing secret"
      description={`Copy the secret for ${revealed.name} now. It is shown once and cannot be read again.`}
      onClose={onClose}
    >
      <div className="space-y-3">
        <label className="block space-y-2">
          <span className="block text-xs uppercase tracking-[0.18em] text-muted">
            Signing secret
          </span>
          <input
            readOnly
            value={revealed.secret}
            onFocus={(event) => event.target.select()}
            className="w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 font-mono text-sm"
          />
        </label>
        <p className="text-xs text-muted">
          {revealed.previousSecretExpiresAt
            ? `The previous secret keeps signing beside this one for 24 hours, until ${new Date(revealed.previousSecretExpiresAt).toLocaleString()}, so a receiver holding either verifies. Update the receiver before then.`
            : "Requests are signed with Standard Webhooks headers (webhook-id, webhook-timestamp, webhook-signature). Give this secret to the receiver so it can verify them."}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void navigator.clipboard?.writeText(revealed.secret)}
          >
            Copy
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Dialog>
  );
}
