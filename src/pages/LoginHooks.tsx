/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { FormEvent } from "react";
import { useState } from "react";
import {
  KeyRound,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Send,
  Trash2,
} from "lucide-react";
import {
  LOGIN_HOOK_DEFAULT_TIMEOUT_MS,
  LOGIN_HOOK_MAX_TIMEOUT_MS,
  LOGIN_HOOK_MIN_TIMEOUT_MS,
  SetLoginHookRequestSchema,
  type LoginHook,
  type LoginHookFailureMode,
  type LoginHookInvocation,
  type LoginHookOutcome,
  type LoginHookTrigger,
  type SetLoginHookRequest,
} from "@seamless-auth/types";
import Dialog from "../components/Dialog";
import {
  DialogFooter,
  Field,
  FieldNote,
  NeedsUpgrade,
  PageHeader,
} from "../components/FormParts";
import { Section } from "../components/Section";
import SigningSecretDialog, {
  type RevealedSecret,
} from "../components/SigningSecretDialog";
import Skeleton from "../components/Skeleton";
import {
  QueryErrorState,
  ReadOnlyNotice,
  StateMessage,
} from "../components/StateMessage";
import Table from "../components/Table";
import { useAdminPermissions } from "../hooks/useAdminPermissions";
import { useConfirm } from "../hooks/useConfirm";
import {
  useDeleteLoginHook,
  useLoginHookInvocations,
  useLoginHooks,
  useRotateLoginHookSecret,
  useSetLoginHook,
  useTestLoginHook,
} from "../hooks/useLoginHooks";
import { useStepUpGuard } from "../hooks/useStepUpGuard";
import { useToast } from "../hooks/useToast";
import {
  describeCalloutFailure,
  describeIssues,
  describeTestResult,
  describeWriteRefusal,
  formatTimestamp,
} from "../lib/callouts";
import { inputClass } from "../lib/formStyles";
import { isRouteMissing } from "../lib/roleRefusals";

type Notice = { tone: "info" | "error"; title: string; description: string };

const TRIGGERS: {
  trigger: LoginHookTrigger;
  title: string;
  description: string;
}[] = [
  {
    trigger: "post_login",
    title: "After sign-in (post_login)",
    description:
      "Runs once the user has proven their factor and before the session exists. It can allow or deny the sign-in. It cannot add claims.",
  },
  {
    trigger: "pre_token",
    title: "Before a token (pre_token)",
    description:
      "Runs when a token is minted for a new session and when the user switches organization. It can add claims or deny. It is not called on refresh: its claims are kept on the session, so a refresh never waits on your server.",
  },
];

const FAILURE_MODES: Record<
  LoginHookFailureMode,
  { label: string; explanation: string }
> = {
  closed: {
    label: "Fail closed",
    explanation:
      "If the hook times out, answers anything but a 2xx, or sends a body that does not parse, the sign-in fails and the user is asked to try again. Use this when the hook enforces a rule.",
  },
  open: {
    label: "Fail open",
    explanation:
      "If the hook cannot answer, the sign-in carries on as if it had allowed it, with no claims from it. Use this when the hook only adds something optional.",
  },
};

const OUTCOME_LABELS: Record<LoginHookOutcome, string> = {
  allowed: "Allowed",
  denied: "Denied",
  failed_open: "Failed, sign-in continued",
  failed_closed: "Failed, sign-in refused",
};

function hookRequest(hook: LoginHook, enabled = hook.enabled) {
  return {
    url: hook.url,
    timeoutMs: hook.timeoutMs,
    failureMode: hook.failureMode,
    enabled,
  };
}

export default function LoginHooks() {
  const hookQuery = useLoginHooks();
  const setHook = useSetLoginHook();
  const deleteHook = useDeleteLoginHook();
  const rotateSecret = useRotateLoginHookSecret();
  const testHook = useTestLoginHook();
  const { canWrite } = useAdminPermissions();
  const ensureStepUp = useStepUpGuard();
  const toast = useToast();
  const confirm = useConfirm();

  const [editing, setEditing] = useState<{
    trigger: LoginHookTrigger;
    hook: LoginHook | null;
  } | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RevealedSecret | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const hooks = hookQuery.data?.hooks ?? [];
  const hookFor = (trigger: LoginHookTrigger) =>
    hooks.find((hook) => hook.trigger === trigger) ?? null;

  const refused = (title: string) => (error: Error) =>
    setNotice({
      tone: "error",
      title,
      description: describeWriteRefusal(error),
    });

  const handleSubmit = async (request: SetLoginHookRequest) => {
    if (!canWrite || !editing) return;
    if (!(await ensureStepUp())) return;

    const { trigger } = editing;
    setHook.mutate(
      { trigger, hook: request },
      {
        onSuccess: ({ hook, secret }) => {
          setEditing(null);
          if (secret) {
            setRevealed({ name: `the ${trigger} hook`, secret });
          }
          toast.success("Login hook saved", `${trigger} calls ${hook.url}.`);
        },
        onError: (error) => setDialogError(describeWriteRefusal(error)),
      },
    );
  };

  const handleToggle = async (hook: LoginHook) => {
    if (!canWrite) return;
    if (!(await ensureStepUp())) return;

    const enabled = !hook.enabled;
    setHook.mutate(
      { trigger: hook.trigger, hook: hookRequest(hook, enabled) },
      {
        onSuccess: () =>
          toast.success(
            enabled ? "Login hook turned on" : "Login hook turned off",
            enabled
              ? `Sign-ins call the ${hook.trigger} hook again.`
              : `Sign-ins no longer call the ${hook.trigger} hook.`,
          ),
        onError: refused(`Could not change the ${hook.trigger} hook`),
      },
    );
  };

  const handleRotate = async (hook: LoginHook) => {
    if (!canWrite) return;

    if (
      !(await confirm({
        title: "Rotate signing secret",
        description: `Issue a new signing secret for the ${hook.trigger} hook? The current secret keeps signing beside the new one for 24 hours, so your hook verifies either while you update it.`,
        confirmLabel: "Rotate",
      }))
    ) {
      return;
    }

    if (!(await ensureStepUp())) return;

    rotateSecret.mutate(hook.trigger, {
      onSuccess: ({ secret, previousSecretExpiresAt }) =>
        setRevealed({
          name: `the ${hook.trigger} hook`,
          secret,
          previousSecretExpiresAt,
        }),
      onError: refused(`Could not rotate the ${hook.trigger} secret`),
    });
  };

  const handleTest = async (hook: LoginHook) => {
    if (!canWrite) return;
    if (!(await ensureStepUp())) return;

    setNotice(null);
    testHook.mutate(hook.trigger, {
      onSuccess: (result) =>
        setNotice({
          tone: result.ok ? "info" : "error",
          title: result.ok
            ? `The ${hook.trigger} hook answered the test call`
            : `The ${hook.trigger} test call failed`,
          description: `${describeTestResult(result)} The test sends a placeholder user and is not recorded as an invocation.`,
        }),
      onError: refused(
        `Could not send a test call to the ${hook.trigger} hook`,
      ),
    });
  };

  const handleDelete = async (hook: LoginHook) => {
    if (!canWrite) return;

    if (
      !(await confirm({
        title: "Delete login hook",
        description: `Delete the ${hook.trigger} hook? Sign-ins stop calling ${hook.url} at once.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    ) {
      return;
    }

    if (!(await ensureStepUp())) return;

    deleteHook.mutate(hook.trigger, {
      onSuccess: () =>
        toast.success(
          "Login hook deleted",
          `${hook.trigger} calls nothing now.`,
        ),
      onError: refused(`Could not delete the ${hook.trigger} hook`),
    });
  };

  const header = (
    <PageHeader eyebrow="Integrations" title="Login hooks">
      Your own endpoint, called during sign-in to allow or deny it or to add
      claims to the token. Calls are signed like webhooks and carry the user,
      method, organization, IP and user agent, never a token or secret.
    </PageHeader>
  );

  if (hookQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-[28px]" />
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
    );
  }

  if (isRouteMissing(hookQuery.error)) {
    return (
      <div className="space-y-8">
        {header}
        <NeedsUpgrade what="login hook" />
      </div>
    );
  }

  if (hookQuery.isError) {
    return (
      <div className="space-y-8">
        {header}
        <QueryErrorState
          title="Could not load login hooks"
          error={hookQuery.error}
          onRetry={() => void hookQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {header}

      <StateMessage
        title="Break-glass and recovery never call a hook"
        description="A break-glass sign-in and a recovery session skip every login hook, so a hook that is down or failing closed cannot lock out the administrator who would fix it."
      />

      {!canWrite && (
        <ReadOnlyNotice description="You have read-only admin access. Set up, edit, test and delete controls are hidden." />
      )}

      {notice && (
        <StateMessage
          tone={notice.tone}
          title={notice.title}
          description={notice.description}
          action={
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setNotice(null)}
            >
              Dismiss
            </button>
          }
        />
      )}

      {TRIGGERS.map(({ trigger, title, description }) => (
        <TriggerSection
          key={trigger}
          trigger={trigger}
          title={title}
          description={description}
          hook={hookFor(trigger)}
          canWrite={canWrite}
          onSetUp={() => {
            setDialogError(null);
            setEditing({ trigger, hook: hookFor(trigger) });
          }}
          onToggle={(hook) => void handleToggle(hook)}
          onRotate={(hook) => void handleRotate(hook)}
          onTest={(hook) => void handleTest(hook)}
          onDelete={(hook) => void handleDelete(hook)}
        />
      ))}

      {editing && (
        <HookDialog
          trigger={editing.trigger}
          hook={editing.hook}
          error={dialogError}
          isPending={setHook.isPending}
          onSubmit={(request) => void handleSubmit(request)}
          onClose={() => setEditing(null)}
        />
      )}

      {revealed && (
        <SigningSecretDialog
          revealed={revealed}
          onClose={() => setRevealed(null)}
        />
      )}
    </div>
  );
}

function TriggerSection({
  trigger,
  title,
  description,
  hook,
  canWrite,
  onSetUp,
  onToggle,
  onRotate,
  onTest,
  onDelete,
}: {
  trigger: LoginHookTrigger;
  title: string;
  description: string;
  hook: LoginHook | null;
  canWrite: boolean;
  onSetUp: () => void;
  onToggle: (hook: LoginHook) => void;
  onRotate: (hook: LoginHook) => void;
  onTest: (hook: LoginHook) => void;
  onDelete: (hook: LoginHook) => void;
}) {
  const [outcome, setOutcome] = useState<LoginHookOutcome | "">("");
  const invocationQuery = useLoginHookInvocations(
    trigger,
    outcome || undefined,
  );

  const action = (
    label: string,
    Icon: typeof Pencil,
    onClick: () => void,
    danger = false,
  ) => (
    <button
      type="button"
      aria-label={`${label} ${trigger}`}
      className={`btn ${danger ? "btn-danger" : "btn-secondary"} inline-flex items-center gap-2`}
      onClick={onClick}
    >
      <Icon size={15} />
      {label}
    </button>
  );

  return (
    <Section
      title={title}
      description={description}
      actions={
        canWrite && !hook ? (
          <button
            type="button"
            aria-label={`Set up ${trigger}`}
            className="btn btn-primary inline-flex items-center gap-2"
            onClick={onSetUp}
          >
            <Plus size={16} />
            Set up hook
          </button>
        ) : undefined
      }
    >
      {hook ? (
        <div className="space-y-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-muted">
                URL
              </dt>
              <dd className="break-all font-mono">{hook.url}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-muted">
                State
              </dt>
              <dd>{hook.enabled ? "On" : "Off, sign-ins skip it"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-muted">
                Timeout
              </dt>
              <dd>{hook.timeoutMs} ms, one attempt</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-muted">
                When it cannot answer
              </dt>
              <dd>
                {FAILURE_MODES[hook.failureMode].label}.{" "}
                <span className="text-muted">
                  {FAILURE_MODES[hook.failureMode].explanation}
                </span>
              </dd>
            </div>
            {hook.previousSecretExpiresAt && (
              <div className="sm:col-span-2 text-xs text-muted">
                The previous secret signs too until{" "}
                {formatTimestamp(hook.previousSecretExpiresAt)}.
              </div>
            )}
          </dl>

          {canWrite && (
            <div className="flex flex-wrap gap-2">
              {action("Edit", Pencil, onSetUp)}
              {action("Send test", Send, () => onTest(hook))}
              {hook.enabled
                ? action("Turn off", PowerOff, () => onToggle(hook))
                : action("Turn on", Power, () => onToggle(hook))}
              {action("Rotate secret", KeyRound, () => onRotate(hook))}
              {action("Delete", Trash2, () => onDelete(hook), true)}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">
          No hook. Sign-ins do not call anything at this point.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Recent invocations</h3>
        <label className="flex items-center gap-2 text-sm text-muted">
          <span>Outcome</span>
          <select
            aria-label={`${trigger} invocation outcome`}
            value={outcome}
            onChange={(event) =>
              setOutcome(event.target.value as LoginHookOutcome | "")
            }
            className={`${inputClass} w-auto`}
          >
            <option value="">All</option>
            {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {invocationQuery.isLoading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : invocationQuery.isError ? (
        <QueryErrorState
          title="Could not load invocations"
          error={invocationQuery.error}
          onRetry={() => void invocationQuery.refetch()}
        />
      ) : (
        <Table<LoginHookInvocation>
          label={`${trigger} invocations`}
          data={invocationQuery.data?.invocations ?? []}
          rowLabel={(invocation) => invocation.id}
          emptyTitle="No invocations"
          emptyDescription="Calls from the last 30 days appear here, newest first."
          columns={[
            {
              key: "createdAt",
              label: "When",
              width: "medium",
              render: (value) => formatTimestamp(value),
            },
            {
              key: "outcome",
              label: "Outcome",
              width: "medium",
              render: (value) => OUTCOME_LABELS[value] ?? value,
            },
            {
              key: "userId",
              label: "User",
              width: "medium",
              render: (value) => (
                <span className="break-all font-mono text-xs">
                  {value ?? "None"}
                </span>
              ),
            },
            {
              key: "statusCode",
              label: "Status",
              width: "compact",
              align: "right",
              render: (value) => value ?? "None",
            },
            {
              key: "durationMs",
              label: "Took",
              width: "compact",
              align: "right",
              render: (value) => `${value} ms`,
            },
            {
              key: "failure",
              label: "Failure",
              width: "wide",
              wrap: true,
              render: (value, row) => (
                <span className="text-xs text-muted">
                  {describeCalloutFailure(value, row.statusCode) ?? ""}
                </span>
              ),
            },
          ]}
        />
      )}
    </Section>
  );
}

function HookDialog({
  trigger,
  hook,
  error,
  isPending,
  onSubmit,
  onClose,
}: {
  trigger: LoginHookTrigger;
  hook: LoginHook | null;
  error: string | null;
  isPending: boolean;
  onSubmit: (request: SetLoginHookRequest) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(hook?.url ?? "");
  const [timeout, setTimeoutMs] = useState(
    String(hook?.timeoutMs ?? LOGIN_HOOK_DEFAULT_TIMEOUT_MS),
  );
  const [failureMode, setFailureMode] = useState<LoginHookFailureMode>(
    hook?.failureMode ?? "closed",
  );
  const [enabled, setEnabled] = useState(hook?.enabled ?? true);
  const [submitted, setSubmitted] = useState(false);

  const candidate = SetLoginHookRequestSchema.safeParse({
    url,
    timeoutMs: Number(timeout),
    failureMode,
    enabled,
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (candidate.success) onSubmit(candidate.data);
  };

  return (
    <Dialog
      className="max-h-[90vh] overflow-y-auto"
      title={hook ? `Edit the ${trigger} hook` : `Set up the ${trigger} hook`}
      description={
        hook
          ? "Saving replaces the hook's settings and keeps its signing secret."
          : "The signing secret is shown once, when the hook is created."
      }
      onClose={onClose}
    >
      <form className="space-y-4" noValidate onSubmit={handleSubmit}>
        <Field label="URL">
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://hooks.example.com/sign-in"
            className={`${inputClass} font-mono`}
          />
        </Field>
        <Field label="Timeout (ms)">
          <input
            type="number"
            min={LOGIN_HOOK_MIN_TIMEOUT_MS}
            max={LOGIN_HOOK_MAX_TIMEOUT_MS}
            step={100}
            value={timeout}
            onChange={(event) => setTimeoutMs(event.target.value)}
            className={inputClass}
          />
        </Field>
        <FieldNote>
          {LOGIN_HOOK_MIN_TIMEOUT_MS} to {LOGIN_HOOK_MAX_TIMEOUT_MS} ms, one
          attempt. The user waits this long at most.
        </FieldNote>

        <fieldset className="space-y-2">
          <legend className="text-xs uppercase tracking-[0.18em] text-muted">
            When the hook cannot answer
          </legend>
          {(Object.keys(FAILURE_MODES) as LoginHookFailureMode[]).map(
            (mode) => (
              <label
                key={mode}
                className="flex items-start gap-2 rounded-md border border-subtle p-3 text-sm"
              >
                <input
                  type="radio"
                  name="failureMode"
                  value={mode}
                  checked={failureMode === mode}
                  onChange={() => setFailureMode(mode)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">
                    {FAILURE_MODES[mode].label}
                    {mode === "closed" ? " (default)" : ""}
                  </span>
                  <span className="block text-xs text-muted">
                    {FAILURE_MODES[mode].explanation}
                  </span>
                </span>
              </label>
            ),
          )}
          <FieldNote>
            Either way, break-glass sign-ins and recovery sessions never call
            the hook.
          </FieldNote>
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          On
        </label>

        <DialogFooter
          problem={
            submitted && !candidate.success
              ? describeIssues(candidate.error.issues)
              : error
          }
          isPending={isPending}
          submitLabel={hook ? "Save" : "Create hook"}
          onClose={onClose}
        />
      </form>
    </Dialog>
  );
}
