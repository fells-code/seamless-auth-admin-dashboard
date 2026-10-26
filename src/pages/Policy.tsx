/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GitCompare } from "lucide-react";
import type {
  PolicyDocument,
  PolicyDryRunUser,
  PolicyVersion,
} from "@seamless-auth/types";
import {
  useDiscardPolicyDraft,
  usePolicyDryRun,
  usePolicyState,
  usePolicyVersions,
  usePublishPolicy,
  useRollbackPolicy,
  useSavePolicyDraft,
} from "../hooks/usePolicy";
import { useAdminPermissions } from "../hooks/useAdminPermissions";
import { useStepUpGuard } from "../hooks/useStepUpGuard";
import { useToast } from "../hooks/useToast";
import { useConfirm } from "../hooks/useConfirm";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import { Section } from "../components/Section";
import Skeleton from "../components/Skeleton";
import StatCard from "../components/StatCard";
import Table from "../components/Table";
import RiskBadge from "../components/RiskBadge";
import PolicyDraftEditor from "../components/PolicyDraftEditor";
import {
  QueryErrorState,
  ReadOnlyNotice,
  StateMessage,
} from "../components/StateMessage";
import { ApiError } from "../lib/api";
import { getErrorMessage } from "../lib/errorMessage";
import {
  diffPolicy,
  DRY_RUN_REASON_LABELS,
  POLICY_SOURCE_LABELS,
  type PolicyChange,
} from "../lib/policyDiff";

// Mirrors POLICY_DRY_RUN_USER_CAP in the API's policyDryRun service.
const DRY_RUN_USER_CAP = 10_000;
const MIN_DAYS = 1;
const MAX_DAYS = 30;

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function Actor({ userId }: { userId: string | null }) {
  if (!userId) {
    return <span className="text-sm text-muted">System</span>;
  }

  return (
    <Link
      to={`/users/${userId}`}
      className="font-mono text-sm text-[var(--primary)] underline-offset-2 hover:underline"
    >
      {userId.slice(0, 8)}...
    </Link>
  );
}

function PolicyDiffTable({
  changes,
  beforeLabel,
  afterLabel,
  emptyTitle,
}: {
  changes: PolicyChange[];
  beforeLabel: string;
  afterLabel: string;
  emptyTitle: string;
}) {
  if (changes.length === 0) {
    return <StateMessage title={emptyTitle} />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-subtle">
      <table className="w-full min-w-[560px] text-sm">
        <caption className="sr-only">
          Policy changes from {beforeLabel} to {afterLabel}
        </caption>
        <thead className="bg-surface-alt text-left text-xs uppercase tracking-[0.18em] text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Setting
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              {beforeLabel}
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              {afterLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change) => (
            <tr
              key={`${change.key}.${change.field ?? ""}`}
              className="border-t border-subtle align-top"
            >
              <th scope="row" className="px-4 py-3 text-left font-medium">
                <span className="text-primary">{change.label}</span>
                {change.field && (
                  <span className="block font-mono text-xs text-muted">
                    {change.field}
                  </span>
                )}
              </th>
              <td className="px-4 py-3 break-words text-muted">
                {change.before}
              </td>
              <td className="px-4 py-3 break-words text-primary">
                {change.after}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Policy() {
  const { data, isLoading, isError, error, refetch } = usePolicyState();
  const versionsQuery = usePolicyVersions();
  const saveDraft = useSavePolicyDraft();
  const discardDraft = useDiscardPolicyDraft();
  const publish = usePublishPolicy();
  const rollback = useRollbackPolicy();
  const dryRun = usePolicyDryRun();
  const { canWrite } = useAdminPermissions();
  const ensureStepUp = useStepUpGuard();
  const toast = useToast();
  const confirm = useConfirm();

  const [editing, setEditing] = useState<PolicyDocument | null>(null);
  const [days, setDays] = useState(7);
  const [daysText, setDaysText] = useState("7");
  const [reviewVersion, setReviewVersion] = useState<number | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const published = data?.published;
  const draft = data?.draft ?? null;
  const isDirty =
    editing !== null &&
    !same(editing, draft?.policy ?? published?.policy ?? null);

  useUnsavedChangesGuard(isDirty);

  const candidate = editing ?? draft?.policy ?? null;
  const changes = useMemo(
    () =>
      published && candidate ? diffPolicy(published.policy, candidate) : [],
    [published, candidate],
  );

  const versions = versionsQuery.data?.versions ?? [];
  const reviewed = versions.find((entry) => entry.version === reviewVersion);
  const reviewChanges = useMemo(
    () =>
      published && reviewed
        ? diffPolicy(published.policy, reviewed.policy)
        : [],
    [published, reviewed],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-[28px]" />
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
    );
  }

  if (isError || !published) {
    return (
      <QueryErrorState
        title="Could not load the sign-in policy"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  const stale = draft !== null && draft.basedOnVersion !== published.version;
  const busy =
    verifying ||
    saveDraft.isPending ||
    discardDraft.isPending ||
    publish.isPending ||
    rollback.isPending;

  const handleWriteError = (title: string, writeError: unknown) => {
    if (
      writeError instanceof ApiError &&
      writeError.code === "policy_version_conflict"
    ) {
      setConflict(writeError.message);
      toast.warning(
        "The policy changed while you were reviewing it",
        "Another version was published. The page has reloaded it, so review the changes and try again.",
      );
      void refetch();
      void versionsQuery.refetch();
      return;
    }

    toast.error(title, getErrorMessage(writeError));
  };

  const startEditing = () => {
    if (!canWrite) return;
    setEditing(structuredClone(draft?.policy ?? published.policy));
  };

  const cancelEditing = async () => {
    if (
      isDirty &&
      !(await confirm({
        title: "Discard unsaved edits",
        description:
          "Throw away the edits you have not saved? The saved draft, if there is one, is kept.",
        confirmLabel: "Discard edits",
        tone: "danger",
      }))
    ) {
      return;
    }

    setEditing(null);
  };

  const handleSaveDraft = () => {
    if (!canWrite || !editing) return;

    saveDraft.mutate(editing, {
      onSuccess: () => {
        setEditing(null);
        dryRun.reset();
        toast.success(
          "Draft saved",
          "Nothing changes for users until the draft is published.",
        );
      },
      onError: (saveError) =>
        toast.error("Draft save failed", getErrorMessage(saveError)),
    });
  };

  const handleDiscardDraft = async () => {
    if (!canWrite || !draft) return;

    if (
      !(await confirm({
        title: "Discard draft",
        description:
          "Delete the policy draft? There is one draft per instance, so this discards it for every administrator. The published policy is not affected.",
        confirmLabel: "Discard draft",
        tone: "danger",
      }))
    ) {
      return;
    }

    discardDraft.mutate(undefined, {
      onSuccess: () => {
        setEditing(null);
        dryRun.reset();
        toast.success("Draft discarded", "The published policy is unchanged.");
      },
      onError: (discardError) =>
        toast.error("Draft discard failed", getErrorMessage(discardError)),
    });
  };

  const handleDaysChange = (next: string) => {
    setDaysText(next);
    const parsed = Number(next);
    if (Number.isInteger(parsed) && parsed >= MIN_DAYS && parsed <= MAX_DAYS) {
      setDays(parsed);
    }
  };
  const daysInvalid = (() => {
    const parsed = Number(daysText);
    return !Number.isInteger(parsed) || parsed < MIN_DAYS || parsed > MAX_DAYS;
  })();

  const runDryRun = () => {
    if (daysInvalid || !candidate) return;

    dryRun.mutate(
      { days, ...(isDirty && editing ? { policy: editing } : {}) },
      {
        onError: (runError) =>
          toast.error("Dry run failed", getErrorMessage(runError)),
      },
    );
  };

  const handlePublish = async () => {
    if (!canWrite || !draft || isDirty) return;

    const count = changes.length;
    const warnings = [
      `Publish the draft as version ${published.version + 1}? ${count} ${
        count === 1 ? "setting changes" : "settings change"
      }, and the new policy applies to every sign-in at once.`,
    ];
    if (stale) {
      warnings.push(
        `The draft was started from version ${draft.basedOnVersion}, and version ${published.version} is published now. Publishing replaces version ${published.version} with the draft.`,
      );
    }
    if (!dryRun.data) {
      warnings.push("You have not run a dry run of this draft.");
    }

    if (
      !(await confirm({
        title: "Publish policy",
        description: warnings.join(" "),
        confirmLabel: "Publish",
        tone: "danger",
      }))
    ) {
      return;
    }

    setVerifying(true);
    try {
      if (!(await ensureStepUp())) return;
    } finally {
      setVerifying(false);
    }

    publish.mutate(
      { expectedVersion: published.version },
      {
        onSuccess: (version) => {
          setConflict(null);
          dryRun.reset();
          toast.success(
            `Version ${version.version} published`,
            "The new sign-in policy is in force.",
          );
        },
        onError: (publishError) =>
          handleWriteError("Publish failed", publishError),
      },
    );
  };

  const handleRollback = async (version: PolicyVersion) => {
    if (!canWrite || version.version === published.version) return;

    if (
      !(await confirm({
        title: `Roll back to version ${version.version}`,
        description: `Publish a copy of version ${version.version} as version ${
          published.version + 1
        }? It replaces the policy in force for every sign-in at once. History is kept, so this can be rolled back too.`,
        confirmLabel: "Roll back",
        tone: "danger",
      }))
    ) {
      return;
    }

    setVerifying(true);
    try {
      if (!(await ensureStepUp())) return;
    } finally {
      setVerifying(false);
    }

    rollback.mutate(
      { version: version.version, expectedVersion: published.version },
      {
        onSuccess: (next) => {
          setConflict(null);
          setReviewVersion(null);
          toast.success(
            `Version ${next.version} published`,
            `The policy from version ${version.version} is in force again.`,
          );
        },
        onError: (rollbackError) =>
          handleWriteError("Rollback failed", rollbackError),
      },
    );
  };

  const report = dryRun.data;
  const capped =
    report !== undefined &&
    (report.capped === true ||
      report.usersEvaluated + report.breakGlassAccounts >= DRY_RUN_USER_CAP);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-subtle bg-surface shadow-[0_1px_0_rgba(255,255,255,0.35)_inset]">
        <div className="relative px-6 py-6 lg:px-8 lg:py-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-0 top-0 h-40 w-40 rounded-full bg-[color:var(--accent-soft)] blur-3xl opacity-70" />
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[color:var(--highlight)]/10 blur-3xl" />
          </div>

          <div className="relative space-y-4">
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
                Staged Changes
              </div>
              <h1 className="heading-1">Sign-in Policy</h1>
              <p className="max-w-2xl text-sm text-muted">
                Stage a change to who can sign in, and how, as a draft. Dry run
                it against recent sign-ins, then publish it, or roll back to any
                earlier version.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <InfoPill
                label="Published version"
                value={`v${published.version}`}
              />
              <InfoPill
                label="Draft"
                value={draft ? `From v${draft.basedOnVersion}` : "No draft"}
              />
              <InfoPill
                label="Last published"
                value={formatDate(published.publishedAt)}
              />
            </div>
          </div>
        </div>
      </section>

      {!canWrite && (
        <ReadOnlyNotice description="You have read-only admin access. You can review the policy, its history and dry runs, but not edit, publish or roll back." />
      )}

      <StateMessage
        title="System Configuration saves are versioned too"
        description={
          <>
            Saving a sign-in setting on{" "}
            <Link
              to="/system"
              className="text-[var(--primary)] underline-offset-2 hover:underline"
            >
              System Configuration
            </Link>{" "}
            applies at once, without a draft or dry run, and is recorded here as
            a new version. A draft started before that save says so below.
          </>
        }
      />

      {conflict && (
        <StateMessage
          tone="warning"
          title="Another version was published"
          description={`${conflict} The page now shows the current policy.`}
          action={
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConflict(null)}
            >
              Dismiss
            </button>
          }
        />
      )}

      <Section
        title="Draft"
        description={`Changes from the published policy, version ${published.version}.`}
        actions={
          canWrite ? (
            <div className="flex flex-wrap gap-2">
              {editing ? (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void cancelEditing()}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary disabled:opacity-50"
                    onClick={handleSaveDraft}
                    disabled={busy || !isDirty}
                  >
                    {saveDraft.isPending ? "Saving..." : "Save Draft"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={startEditing}
                    disabled={busy}
                  >
                    {draft ? "Edit Draft" : "Start Draft"}
                  </button>
                  {draft && (
                    <>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => void handleDiscardDraft()}
                        disabled={busy}
                      >
                        Discard Draft
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary disabled:opacity-50"
                        onClick={() => void handlePublish()}
                        disabled={busy || changes.length === 0}
                      >
                        {verifying
                          ? "Verifying..."
                          : publish.isPending
                            ? "Publishing..."
                            : "Publish"}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          ) : undefined
        }
      >
        {draft && (
          <p className="text-sm text-muted">
            Last saved {formatDate(draft.updatedAt)} by{" "}
            <Actor userId={draft.updatedBy} />, started from version{" "}
            {draft.basedOnVersion}.
          </p>
        )}

        {stale && (
          <StateMessage
            tone="warning"
            title="The draft is behind the published policy"
            description={`It was started from version ${draft.basedOnVersion}, and version ${published.version} has been published since. The diff compares against version ${published.version}, so a setting changed since then shows as reverted.`}
          />
        )}

        {!draft && !editing ? (
          <StateMessage
            title="No draft"
            description={
              canWrite
                ? "Start a draft to stage a policy change. Nothing changes for users until it is published."
                : "No policy change is staged."
            }
          />
        ) : (
          <PolicyDiffTable
            changes={changes}
            beforeLabel={`Published v${published.version}`}
            afterLabel={isDirty ? "Unsaved edits" : "Draft"}
            emptyTitle="The draft matches the published policy"
          />
        )}

        {isDirty && (
          <StateMessage
            tone="warning"
            title="Unsaved edits"
            description="Save the draft before publishing it. A dry run evaluates these edits as they are."
          />
        )}

        {editing && (
          <PolicyDraftEditor
            value={editing}
            onChange={setEditing}
            disabled={!canWrite || busy}
          />
        )}
      </Section>

      <Section
        title="Dry Run"
        description="Evaluate the draft against completed sign-ins, and see who it would refuse."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <label
              htmlFor="policy-dry-run-days"
              className="text-xs uppercase tracking-[0.18em] text-muted"
            >
              Days of sign-ins
            </label>
            <input
              id="policy-dry-run-days"
              type="number"
              inputMode="numeric"
              min={MIN_DAYS}
              max={MAX_DAYS}
              step={1}
              value={daysText}
              aria-invalid={daysInvalid ? true : undefined}
              aria-describedby="policy-dry-run-days-help"
              onChange={(event) => handleDaysChange(event.target.value)}
              className="w-32 rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>
          <button
            type="button"
            className="btn btn-primary disabled:opacity-50"
            onClick={runDryRun}
            disabled={!candidate || daysInvalid || dryRun.isPending}
          >
            {dryRun.isPending ? "Running..." : "Run Dry Run"}
          </button>
        </div>
        <p
          id="policy-dry-run-days-help"
          className={
            daysInvalid
              ? "text-sm text-[var(--highlight)]"
              : "text-sm text-muted"
          }
        >
          {daysInvalid
            ? `Enter a whole number from ${MIN_DAYS} to ${MAX_DAYS}.`
            : isDirty
              ? "Evaluates your unsaved edits."
              : candidate
                ? "Evaluates the saved draft."
                : "Start a draft to run a dry run."}
        </p>

        {report && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Sign-ins from {formatDate(report.window.from)} to{" "}
              {formatDate(report.window.to)}.
            </p>

            {capped && (
              <StateMessage
                tone="warning"
                title="The dry run may have reached its account limit"
                description={`The API evaluates at most ${DRY_RUN_USER_CAP.toLocaleString()} accounts per run. Accounts past the limit were not evaluated, so the real impact can be larger.`}
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Sign-ins evaluated"
                value={report.signInsEvaluated}
                hint="Completed sign-ins in the window"
              />
              <StatCard
                label="Accounts evaluated"
                value={report.usersEvaluated}
                hint="Accounts that signed in during the window"
              />
              <StatCard
                label="Would be refused"
                value={report.wouldFail.length}
                hint="Accounts with a sign-in or enrollment the draft refuses"
              />
              <StatCard
                label="No remaining method"
                value={report.usersLockedOut}
                hint="Accounts none of whose factors would still sign them in"
              />
            </div>

            <StateMessage
              title={`${report.breakGlassAccounts} break-glass ${
                report.breakGlassAccounts === 1 ? "account" : "accounts"
              }`}
              description="Break-glass accounts are exempt from policy, so they are counted here and never evaluated or listed below."
            />

            {report.usersLockedOut > 0 && (
              <StateMessage
                tone="error"
                title="This draft would lock accounts out"
                description={`${report.usersLockedOut} ${
                  report.usersLockedOut === 1 ? "account has" : "accounts have"
                } no enrolled factor the draft would still accept. They are listed first.`}
              />
            )}

            <Table<PolicyDryRunUser>
              label="Accounts the draft would refuse"
              rowKey={(row) => row.userId}
              emptyTitle="No account would be refused"
              emptyDescription="Every sign-in in the window would still be allowed under this draft."
              columns={[
                {
                  key: "email",
                  label: "Account",
                  width: "wide",
                  wrap: true,
                  render: (value, row) => (
                    <Link
                      to={`/users/${row.userId}`}
                      className="text-sm text-[var(--primary)] underline-offset-2 hover:underline"
                    >
                      {value}
                    </Link>
                  ),
                },
                {
                  key: "signIns",
                  label: "Refused sign-ins",
                  width: "small",
                },
                {
                  key: "reasons",
                  label: "Why",
                  width: "wide",
                  wrap: true,
                  render: (value) => (
                    <span className="text-sm text-muted">
                      {value
                        .map(
                          (reason) => DRY_RUN_REASON_LABELS[reason] ?? reason,
                        )
                        .join(", ")}
                    </span>
                  ),
                },
                {
                  key: "lockedOut",
                  label: "Remaining method",
                  width: "medium",
                  render: (value) =>
                    value ? (
                      <RiskBadge level="None left" color="red" />
                    ) : (
                      <span className="text-sm text-muted">Yes</span>
                    ),
                },
              ]}
              data={report.wouldFail}
            />
          </div>
        )}
      </Section>

      <Section
        title="Version History"
        description="Every published policy, newest first. Review one to compare it with the policy in force, or roll back to it."
      >
        {versionsQuery.isLoading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : versionsQuery.isError ? (
          <QueryErrorState
            title="Could not load policy versions"
            error={versionsQuery.error}
            onRetry={() => void versionsQuery.refetch()}
          />
        ) : (
          <Table<PolicyVersion>
            label="Policy versions"
            rowKey={(row) => String(row.version)}
            emptyTitle="No versions recorded"
            emptyDescription="The API records a version each time the policy changes."
            columns={[
              {
                key: "version",
                label: "Version",
                width: "small",
                render: (value) => (
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-primary">
                      v{value}
                    </span>
                    {value === published.version && (
                      <RiskBadge level="In force" color="green" />
                    )}
                  </span>
                ),
              },
              {
                key: "source",
                label: "Source",
                width: "medium",
                wrap: true,
                render: (value, row) => (
                  <span className="flex flex-col">
                    <span className="text-sm text-primary">
                      {POLICY_SOURCE_LABELS[value] ?? value}
                    </span>
                    {row.rolledBackTo !== undefined && (
                      <span className="text-xs text-muted">
                        Restored v{row.rolledBackTo}
                      </span>
                    )}
                  </span>
                ),
              },
              {
                key: "publishedAt",
                label: "When",
                width: "medium",
                wrap: true,
                render: (value) => (
                  <span className="text-sm text-primary">
                    {formatDate(value)}
                  </span>
                ),
              },
              {
                key: "publishedBy",
                label: "Who",
                width: "small",
                render: (value) => <Actor userId={value} />,
              },
            ]}
            actions={[
              {
                icon: GitCompare,
                label: "Review",
                onClick: (row) => setReviewVersion(row.version),
              },
            ]}
            data={versions}
          />
        )}

        {reviewed && (
          <div className="space-y-4 rounded-xl border border-subtle p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-primary">
                  Version {reviewed.version}
                </h3>
                <p className="text-sm text-muted">
                  {POLICY_SOURCE_LABELS[reviewed.source] ?? reviewed.source},{" "}
                  {formatDate(reviewed.publishedAt)}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setReviewVersion(null)}
                >
                  Close
                </button>
                {canWrite && reviewed.version !== published.version && (
                  <button
                    type="button"
                    className="btn btn-danger disabled:opacity-50"
                    onClick={() => void handleRollback(reviewed)}
                    disabled={busy}
                  >
                    {rollback.isPending
                      ? "Rolling back..."
                      : `Roll Back To v${reviewed.version}`}
                  </button>
                )}
              </div>
            </div>

            <PolicyDiffTable
              changes={reviewChanges}
              beforeLabel={`In force v${published.version}`}
              afterLabel={`Version ${reviewed.version}`}
              emptyTitle={
                reviewed.version === published.version
                  ? "This is the policy in force"
                  : "This version matches the policy in force"
              }
            />
          </div>
        )}
      </Section>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-subtle bg-surface px-3 py-1.5 text-xs text-muted">
      <span className="font-medium text-primary">{value}</span>
      <span className="mx-1 opacity-60">•</span>
      <span>{label}</span>
    </div>
  );
}
