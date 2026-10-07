/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReviewAccountsNotice from "./ReviewAccountsNotice";

const useReviewAccounts = vi.hoisted(() => vi.fn());

vi.mock("../hooks/useReviewAccounts", () => ({ useReviewAccounts }));

function accounts(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    emails: ["review@example.com", "apple@example.com"],
    codeConfigured: true,
    recentSignIns: {
      days: 30,
      count: 2,
      failedVerifications: 0,
      lastSignInAt: "2026-10-01T12:00:00.000Z",
    },
    ...overrides,
  };
}

describe("ReviewAccountsNotice", () => {
  beforeEach(() => {
    useReviewAccounts.mockReset();
  });

  it("warns while review accounts are enabled, with how often the code was used", () => {
    useReviewAccounts.mockReturnValue({ data: accounts() });

    render(<ReviewAccountsNotice />);

    expect(
      screen.getByText("Store review accounts are enabled"),
    ).toBeInTheDocument();
    const description = screen.getByText(
      /review@example.com, apple@example.com/,
    );
    expect(description).toHaveTextContent(
      "used to sign in 2 times in the last 30 days",
    );
    expect(description).toHaveTextContent("Clear REVIEW_ACCOUNT_EMAILS");
  });

  it("says when the code has not been used and reports wrong guesses", () => {
    useReviewAccounts.mockReturnValue({
      data: accounts({
        recentSignIns: {
          days: 30,
          count: 0,
          failedVerifications: 3,
          lastSignInAt: null,
        },
      }),
    });

    render(<ReviewAccountsNotice />);

    const description = screen.getByText(/fixed code/);
    expect(description).toHaveTextContent(
      "has not been used to sign in during the last 30 days",
    );
    expect(description).toHaveTextContent("3 wrong codes were entered");
  });

  it("shows nothing when review accounts are off", () => {
    useReviewAccounts.mockReturnValue({ data: accounts({ enabled: false }) });

    const { container } = render(<ReviewAccountsNotice />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing when the API or adapter does not know the route", () => {
    useReviewAccounts.mockReturnValue({ data: undefined, isError: true });

    const { container } = render(<ReviewAccountsNotice />);

    expect(container).toBeEmptyDOMElement();
  });
});
