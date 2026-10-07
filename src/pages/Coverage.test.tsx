/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Coverage from "./Coverage";

const mocks = vi.hoisted(() => ({
  useCoverageReport: vi.fn(),
  useDownloadCoverageCsv: vi.fn(),
  useOrganizations: vi.fn(),
  download: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("../hooks/useCoverageReport", () => ({
  useCoverageReport: mocks.useCoverageReport,
  useDownloadCoverageCsv: mocks.useDownloadCoverageCsv,
}));

vi.mock("../hooks/useOrganizations", () => ({
  useOrganizations: mocks.useOrganizations,
}));

const report = {
  period: { from: "2026-07-01", to: "2026-09-28" },
  generatedAt: "2026-09-28T12:00:00.000Z",
  organizationId: null,
  bucket: "month",
  policy: {
    phishingResistantOnly: true,
    loginMethods: ["passkey"],
    passkeyFallbackEnabled: false,
    authenticator: {
      attestation: "none",
      userVerification: "required",
      attachment: "any",
      syncedPasskeys: "allow",
      requireKnownAuthenticator: false,
      aaguidAllowList: [],
      aaguidDenyList: [],
    },
  },
  coverage: { users: 40, passkeyUsers: 30, percent: 75 },
  byOrganization: [
    {
      organizationId: "org-1",
      name: "Clerk's Office",
      users: 30,
      passkeyUsers: 27,
      percent: 90,
    },
    {
      organizationId: null,
      name: null,
      users: 10,
      passkeyUsers: 3,
      percent: 30,
    },
  ],
  trend: [
    {
      start: "2026-09-01",
      end: "2026-09-28",
      users: 40,
      passkeyUsers: 28,
      percent: 70,
    },
  ],
  authenticatorMix: [
    {
      aaguid: "fbfc3007-154e-4ecc-8c0b-6e020557d7bd",
      name: "iCloud Keychain",
      credentials: 20,
      users: 18,
      backupEligible: 20,
      backedUp: 20,
    },
    {
      aaguid: "00000000-0000-0000-0000-000000000000",
      name: null,
      credentials: 5,
      users: 5,
      backupEligible: 0,
      backedUp: 0,
    },
  ],
  signInMix: {
    total: 100,
    phishingResistant: 82,
    percent: 82,
    methods: [
      {
        method: "passkey",
        phishingResistant: true,
        signIns: 82,
        users: 28,
      },
      {
        method: "magic_link",
        phishingResistant: false,
        signIns: 18,
        users: 9,
      },
    ],
  },
};

describe("Coverage", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.useCoverageReport.mockReturnValue({
      data: report,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: mocks.refetch,
    });
    mocks.useDownloadCoverageCsv.mockReturnValue({
      mutate: mocks.download,
      isPending: false,
      isError: false,
    });
    mocks.useOrganizations.mockReturnValue({
      data: { organizations: [{ id: "org-1", name: "Clerk's Office" }] },
    });
  });

  it("shows coverage, sign-in mix and the enforced policy", () => {
    render(<Coverage />);

    expect(screen.getByText("75.0%")).toBeInTheDocument();
    expect(screen.getByText("82.0%")).toBeInTheDocument();
    expect(screen.getByText("On, passkeys only")).toBeInTheDocument();
    expect(screen.getByText("Not allowed")).toBeInTheDocument();
  });

  it("lists organizations with users in no organization last", () => {
    render(<Coverage />);

    const table = screen.getByRole("table", {
      name: "Coverage by organization",
    });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Clerk's Office");
    expect(rows[1]).toHaveTextContent("No organization");
  });

  it("names authenticators, and says which ones it cannot", () => {
    render(<Coverage />);

    const table = screen.getByRole("table", { name: "Authenticator mix" });
    expect(within(table).getByText("iCloud Keychain")).toBeInTheDocument();
    expect(
      within(table).getByText("Unknown (00000000-0000-0000-0000-000000000000)"),
    ).toBeInTheDocument();
  });

  it("labels sign-in methods for people", () => {
    render(<Coverage />);

    const table = screen.getByRole("table", { name: "Sign-in mix" });
    expect(within(table).getByText("Passkey")).toBeInTheDocument();
    expect(within(table).getByText("Magic link")).toBeInTheDocument();
  });

  it("asks for the chosen period, organization and bucket", () => {
    render(<Coverage />);

    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-01-01" },
    });
    fireEvent.change(screen.getByLabelText("Organization"), {
      target: { value: "org-1" },
    });
    fireEvent.change(screen.getByLabelText("Trend by"), {
      target: { value: "week" },
    });

    expect(mocks.useCoverageReport).toHaveBeenLastCalledWith(
      expect.objectContaining({
        from: "2026-01-01",
        organizationId: "org-1",
        bucket: "week",
      }),
    );
  });

  it("downloads the CSV for the same filters", () => {
    render(<Coverage />);

    fireEvent.click(screen.getByRole("button", { name: /download csv/i }));

    expect(mocks.download).toHaveBeenCalledWith(
      mocks.useCoverageReport.mock.lastCall![0],
    );
  });

  it("refuses a period that ends before it starts", () => {
    render(<Coverage />);

    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2099-01-01" },
    });

    expect(screen.getByText("Check the dates")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /download csv/i }),
    ).toBeDisabled();
  });

  it("offers a retry when the report fails to load", () => {
    mocks.useCoverageReport.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("boom"),
      isFetching: false,
      refetch: mocks.refetch,
    });

    render(<Coverage />);

    expect(
      screen.getByText("Could not load the coverage report"),
    ).toBeInTheDocument();
  });
});
