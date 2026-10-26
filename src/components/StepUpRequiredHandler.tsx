/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useEffect } from "react";
import { useStepUpGuard } from "../hooks/useStepUpGuard";
import { onStepUpRequired } from "../lib/stepUpRequired";

/**
 * Answers a `403 step_up_required` from any write with the step-up prompt, so
 * `apiFetch` can retry the write once it is satisfied.
 *
 * Renders nothing. It sits inside AuthProvider because the ceremony needs the
 * SDK's auth context.
 */
export default function StepUpRequiredHandler() {
  const ensureStepUp = useStepUpGuard();

  useEffect(
    () => onStepUpRequired(() => ensureStepUp({ force: true })),
    [ensureStepUp],
  );

  return null;
}
