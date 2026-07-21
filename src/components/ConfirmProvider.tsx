/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useCallback, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import Dialog from "./Dialog";
import {
  ConfirmContext,
  type ConfirmFn,
  type ConfirmOptions,
} from "../lib/confirmContext";

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);

  // The resolver lives outside render state: it is only ever touched from the
  // confirm() and settle() callbacks, never while rendering, so the dialog can
  // resolve the awaiting caller without stale-closure risk.
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setPending(null);
    resolve?.(confirmed);
  }, []);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      // A second request while one is open cancels the first, so its caller is
      // not left awaiting a promise that never settles.
      resolveRef.current?.(false);
      resolveRef.current = resolve;
      setPending(options);
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {pending && (
        <Dialog
          title={pending.title}
          description={pending.description}
          onClose={() => settle(false)}
        >
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => settle(false)}
            >
              {pending.cancelLabel ?? "Cancel"}
            </button>
            <button
              type="button"
              className={clsx(
                "btn",
                pending.tone === "danger" ? "btn-danger" : "btn-primary",
              )}
              onClick={() => settle(true)}
            >
              {pending.confirmLabel ?? "Confirm"}
            </button>
          </div>
        </Dialog>
      )}
    </ConfirmContext.Provider>
  );
}
