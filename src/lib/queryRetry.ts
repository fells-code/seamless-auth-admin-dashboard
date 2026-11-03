/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { ApiError } from "./api";

// An expired session is not a transient failure, and retrying it delays the
// redirect while firing more requests that cannot succeed. A rejected request
// (a range over the API's maximum, say) fails the same way every time, and
// retrying it held the page in a loading state for seconds before the error.
const NON_RETRYABLE_STATUSES = new Set([400, 401, 422]);

export function shouldRetryQuery(failureCount: number, error: unknown) {
  return (
    !(error instanceof ApiError && NON_RETRYABLE_STATUSES.has(error.status)) &&
    failureCount < 3
  );
}
