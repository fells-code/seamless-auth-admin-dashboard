/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

/**
 * Lets `apiFetch` ask the React tree for a step-up when the API answers
 * `403 step_up_required`, the same way `sessionExpiry` reports a 401.
 *
 * The step-up ceremony needs the SDK's auth context and the TOTP prompt, and
 * neither is reachable from a plain module, so a component registers the
 * handler and `apiFetch` awaits it.
 */
type StepUpHandler = () => Promise<boolean>;

let handler: StepUpHandler | null = null;
let pending: Promise<boolean> | null = null;

export function onStepUpRequired(next: StepUpHandler) {
  handler = next;

  return () => {
    if (handler === next) {
      handler = null;
    }
  };
}

/**
 * Resolves true once the session has a fresh step-up. Concurrent callers share
 * one ceremony, so a screen whose writes all lapse together prompts once.
 */
export function requestStepUp(): Promise<boolean> {
  if (!handler) {
    return Promise.resolve(false);
  }

  pending ??= handler()
    .catch(() => false)
    .finally(() => {
      pending = null;
    });

  return pending;
}
