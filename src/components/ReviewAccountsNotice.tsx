/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { StateMessage } from "./StateMessage";
import { useReviewAccounts } from "../hooks/useReviewAccounts";

/**
 * Shown while store review accounts are enabled. Their sign-in code never rotates, and
 * before this the only sign they were on was a warning in the server's boot log, which
 * made it easy to leave them live long after review ended.
 */
export default function ReviewAccountsNotice() {
  const { data } = useReviewAccounts();

  if (!data?.enabled) return null;

  const { count, days, failedVerifications, lastSignInAt } = data.recentSignIns;
  const addresses = data.emails.join(", ");
  const usage =
    count === 0
      ? `The fixed code has not been used to sign in during the last ${days} days.`
      : `The fixed code was used to sign in ${count} ${count === 1 ? "time" : "times"} in the last ${days} days${
          lastSignInAt
            ? `, most recently ${new Date(lastSignInAt).toLocaleString()}`
            : ""
        }.`;
  const failures =
    failedVerifications > 0
      ? ` ${failedVerifications} wrong ${failedVerifications === 1 ? "code was" : "codes were"} entered for these addresses.`
      : "";

  return (
    <StateMessage
      tone="warning"
      title="Store review accounts are enabled"
      description={`${addresses} can sign in with a fixed code that never changes. ${usage}${failures} Clear REVIEW_ACCOUNT_EMAILS on the API once store review is over.`}
    />
  );
}
