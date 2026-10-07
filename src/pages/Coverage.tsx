/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useId, useMemo, useState } from "react";
import clsx from "clsx";
import { Download } from "lucide-react";
import Table from "../components/Table";
import Skeleton from "../components/Skeleton";
import StatCard from "../components/StatCard";
import { Section } from "../components/Section";
import { QueryErrorState, StateMessage } from "../components/StateMessage";
import {
  type CoverageReport,
  type CoverageReportParams,
  type SignInMethod,
  useCoverageReport,
  useDownloadCoverageCsv,
} from "../hooks/useCoverageReport";
import { useOrganizations } from "../hooks/useOrganizations";
import { getErrorMessage } from "../lib/errorMessage";

const ORGANIZATION_OPTIONS_LIMIT = 100;
const DEFAULT_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

const controlClassName =
  "min-h-10 w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]";

const METHOD_LABELS: Record<SignInMethod, string> = {
  passkey: "Passkey",
  email_otp: "Email code",
  phone_otp: "Phone code",
  otp: "Code (channel not recorded)",
  magic_link: "Magic link",
  totp: "Authenticator app (TOTP)",
  oauth: "OAuth",
};

function isoDay(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

type OrganizationRow = CoverageReport["byOrganization"][number] & {
  key: string;
};
type TrendRow = CoverageReport["trend"][number];
type AuthenticatorRow = CoverageReport["authenticatorMix"][number] & {
  key: string;
};
type SignInRow = CoverageReport["signInMix"]["methods"][number];

function PolicyList({ policy }: { policy: CoverageReport["policy"] }) {
  const { authenticator } = policy;
  const rows: [string, string][] = [
    [
      "Phishing-resistant only",
      policy.phishingResistantOnly ? "On, passkeys only" : "Off",
    ],
    ["Login methods", policy.loginMethods.join(", ") || "None"],
    [
      "Passkey fallback",
      policy.passkeyFallbackEnabled ? "Allowed" : "Not allowed",
    ],
    ["Attestation", authenticator.attestation],
    ["User verification", authenticator.userVerification],
    ["Authenticator attachment", authenticator.attachment],
    ["Synced passkeys", authenticator.syncedPasskeys],
    [
      "Known authenticators only",
      authenticator.requireKnownAuthenticator ? "Yes" : "No",
    ],
  ];

  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-4 border-b border-subtle pb-2"
        >
          <dt className="text-sm text-muted">{label}</dt>
          <dd className="text-sm font-medium text-primary">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function Coverage() {
  const fromId = useId();
  const toId = useId();
  const organizationFilterId = useId();
  const bucketId = useId();

  const [to, setTo] = useState(() => isoDay(Date.now()));
  const [from, setFrom] = useState(() =>
    isoDay(Date.now() - (DEFAULT_DAYS - 1) * DAY_MS),
  );
  const [organizationId, setOrganizationId] = useState("");
  const [bucket, setBucket] = useState<"week" | "month">("month");

  const params: CoverageReportParams = {
    from,
    to,
    organizationId: organizationId || undefined,
    bucket,
  };
  const invalidRange = Boolean(from && to && from > to);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useCoverageReport(params);
  const download = useDownloadCoverageCsv();
  const { data: organizationData } = useOrganizations({
    limit: ORGANIZATION_OPTIONS_LIMIT,
  });
  const organizations = organizationData?.organizations ?? [];

  const organizationRows = useMemo<OrganizationRow[]>(
    () =>
      (data?.byOrganization ?? []).map((row) => ({
        ...row,
        key: row.organizationId ?? "none",
      })),
    [data],
  );
  const authenticatorRows = useMemo<AuthenticatorRow[]>(
    () =>
      (data?.authenticatorMix ?? []).map((row, index) => ({
        ...row,
        key: row.aaguid ?? `unknown-${index}`,
      })),
    [data],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-[28px]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <QueryErrorState
        title="Could not load the coverage report"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-subtle bg-surface shadow-[0_1px_0_rgba(255,255,255,0.35)_inset]">
        <div className="space-y-3 px-6 py-6 lg:px-8 lg:py-8">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Assessment Evidence
          </div>
          <h1 className="heading-1">Authentication coverage</h1>
          <p className="max-w-2xl text-sm text-muted">
            How many users hold a phishing-resistant credential, how they
            actually sign in, and the login policy this deployment enforces.
            Download the CSV to paste the figures into an assessment or
            insurance questionnaire.
          </p>
        </div>
      </section>

      <Section
        title="Period"
        description="Dates are whole UTC days and both ends are included. Organization figures use current membership."
        actions={
          <button
            type="button"
            onClick={() => download.mutate(params)}
            disabled={download.isPending || invalidRange}
            className="btn btn-secondary inline-flex items-center justify-center gap-2"
          >
            <Download size={16} />
            Download CSV
          </button>
        }
      >
        {download.isError && (
          <StateMessage
            tone="error"
            title="CSV not downloaded"
            description={getErrorMessage(download.error)}
          />
        )}
        {invalidRange && (
          <StateMessage
            tone="error"
            title="Check the dates"
            description="The start of the period is after its end."
          />
        )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <label htmlFor={fromId} className="text-xs text-muted">
              From
            </label>
            <input
              id={fromId}
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
              className={controlClassName}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={toId} className="text-xs text-muted">
              To
            </label>
            <input
              id={toId}
              type="date"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
              className={controlClassName}
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor={organizationFilterId}
              className="text-xs text-muted"
            >
              Organization
            </label>
            <select
              id={organizationFilterId}
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
              className={controlClassName}
            >
              <option value="">All organizations</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor={bucketId} className="text-xs text-muted">
              Trend by
            </label>
            <select
              id={bucketId}
              value={bucket}
              onChange={(event) =>
                setBucket(event.target.value as "week" | "month")
              }
              className={controlClassName}
            >
              <option value="month">Month</option>
              <option value="week">Week</option>
            </select>
          </div>
        </div>
      </Section>

      <div
        aria-busy={isFetching}
        className={clsx(
          "space-y-8 transition-opacity",
          isFetching && "opacity-60",
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Active Users"
            value={data.coverage.users}
            hint={`As of ${data.period.to}`}
          />
          <StatCard
            label="Passkey Holders"
            value={data.coverage.passkeyUsers}
            hint="At least one passkey or security key"
          />
          <StatCard
            label="Passkey Coverage"
            value={percent(data.coverage.percent)}
            hint="Users holding a phishing-resistant credential"
          />
          <StatCard
            label="Phishing-Resistant Sign-Ins"
            value={percent(data.signInMix.percent)}
            hint={`${data.signInMix.phishingResistant} of ${data.signInMix.total} in the period`}
          />
        </div>

        <Section
          title="Enforced Policy"
          description="What the deployment enforces now. Coverage without the policy is only half the answer."
        >
          <PolicyList policy={data.policy} />
        </Section>

        <Section
          title="By Organization"
          description="Users with no organization are listed last."
        >
          <Table<OrganizationRow>
            label="Coverage by organization"
            rowKey={(row) => row.key}
            rowLabel={(row) => row.name ?? "No organization"}
            data={organizationRows}
            emptyTitle="No users in this period"
            columns={[
              {
                key: "name",
                label: "Organization",
                width: "wide",
                render: (value) =>
                  value ?? <span className="text-muted">No organization</span>,
              },
              { key: "users", label: "Users", align: "right", sortable: true },
              {
                key: "passkeyUsers",
                label: "Passkey holders",
                align: "right",
                sortable: true,
              },
              {
                key: "percent",
                label: "Coverage",
                align: "right",
                sortable: true,
                render: (value) => percent(value),
              },
            ]}
          />
        </Section>

        <Section
          title="Trend"
          description="Users and passkey holders at the end of each period. Credentials that were later removed are not counted."
        >
          <Table<TrendRow>
            label="Coverage trend"
            rowKey={(row) => row.start}
            rowLabel={(row) => `${row.start} to ${row.end}`}
            data={data.trend}
            emptyTitle="No periods to show"
            columns={[
              { key: "start", label: "From", width: "medium" },
              { key: "end", label: "To", width: "medium" },
              { key: "users", label: "Users", align: "right" },
              { key: "passkeyUsers", label: "Passkey holders", align: "right" },
              {
                key: "percent",
                label: "Coverage",
                align: "right",
                render: (value) => percent(value),
              },
            ]}
          />
        </Section>

        <Section
          title="Authenticator Mix"
          description="Credentials by authenticator model. Synced passkeys are held by a platform password manager."
        >
          <Table<AuthenticatorRow>
            label="Authenticator mix"
            rowKey={(row) => row.key}
            rowLabel={(row) =>
              row.name ?? row.aaguid ?? "Unknown authenticator"
            }
            data={authenticatorRows}
            emptyTitle="No credentials yet"
            columns={[
              {
                key: "name",
                label: "Authenticator",
                width: "wide",
                render: (value, row) =>
                  value ?? (
                    <span className="text-muted">
                      {row.aaguid ? `Unknown (${row.aaguid})` : "Not reported"}
                    </span>
                  ),
              },
              {
                key: "credentials",
                label: "Credentials",
                align: "right",
                sortable: true,
              },
              { key: "users", label: "Users", align: "right", sortable: true },
              {
                key: "backupEligible",
                label: "Synced",
                align: "right",
                sortable: true,
              },
            ]}
          />
        </Section>

        <Section
          title="Sign-In Mix"
          description="Successful sign-ins in the period, counted once per attempt. Only passkeys are phishing resistant."
        >
          <Table<SignInRow>
            label="Sign-in mix"
            rowKey={(row) => row.method}
            rowLabel={(row) => METHOD_LABELS[row.method]}
            data={data.signInMix.methods}
            emptyTitle="No sign-ins in this period"
            columns={[
              {
                key: "method",
                label: "Method",
                width: "wide",
                render: (value) => METHOD_LABELS[value],
              },
              {
                key: "phishingResistant",
                label: "Phishing resistant",
                render: (value) => (value ? "Yes" : "No"),
              },
              {
                key: "signIns",
                label: "Sign-ins",
                align: "right",
                sortable: true,
              },
              { key: "users", label: "Users", align: "right", sortable: true },
            ]}
          />
        </Section>
      </div>
    </div>
  );
}
