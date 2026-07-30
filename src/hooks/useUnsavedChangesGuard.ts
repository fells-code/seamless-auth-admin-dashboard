/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

/**
 * Warn before leaving a screen that has unsaved work.
 *
 * Two mechanisms, because neither covers the other's cases. `beforeunload`
 * handles a reload, a tab close, and navigation to another origin, none of
 * which the router ever sees. `useBlocker` handles in-app navigation and the
 * back button, which never reach `beforeunload`.
 *
 * `useBlocker` requires a data router, which is why the app mounts one.
 */
export function useUnsavedChangesGuard(
  isDirty: boolean,
  message = "You have unsaved changes. Leave this screen and discard them?",
) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // The browser shows its own wording; assigning returnValue is what marks
      // the navigation as needing confirmation.
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (blocker.state !== "blocked") return;

    // window.confirm rather than the in-app dialog: the blocker has to settle
    // synchronously against the pending navigation, and an awaited dialog lets
    // the route change through before the answer arrives.
    if (window.confirm(message)) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker, message]);
}
