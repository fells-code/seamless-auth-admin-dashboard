/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import {
  Eye,
  KeyRound,
  ListChecks,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RotateCw,
  Send,
  Trash2,
} from "lucide-react";
import {
  CreateWebhookEndpointRequestSchema,
  UpdateWebhookEndpointRequestSchema,
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_RETRY_SCHEDULE_SECONDS,
  WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS,
  WEBHOOK_TIMEOUT_MS,
  type CreateWebhookEndpointRequest,
  type UpdateWebhookEndpointRequest,
  type WebhookDelivery,
  type WebhookDeliveryStatus,
  type WebhookDisabledReason,
  type WebhookEndpoint,
} from "@seamless-auth/types";
import Dialog from "../components/Dialog";
import {
  ChipList,
  DialogFooter,
  Field,
  FieldNote,
  NeedsUpgrade,
  PageHeader,
} from "../components/FormParts";
import RoleChips from "../components/RoleChips";
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
import Tabs from "../components/Tabs";
import { useAdminPermissions } from "../hooks/useAdminPermissions";
import { useConfirm } from "../hooks/useConfirm";
import { useStepUpGuard } from "../hooks/useStepUpGuard";
import { useToast } from "../hooks/useToast";
import {
  useCreateWebhook,
  useDeleteWebhook,
  useRedeliverWebhook,
  useRotateWebhookSecret,
  useTestWebhook,
  useUpdateWebhook,
  useWebhookDeliveries,
  useWebhookDelivery,
  useWebhookEndpoints,
} from "../hooks/useWebhooks";
import {
  describeCalloutFailure,
  describeIssues,
  describeTestResult,
  describeWriteRefusal,
  formatTimestamp,
} from "../lib/callouts";
import { inputClass } from "../lib/formStyles";
import { isRouteMissing } from "../lib/roleRefusals";
import { tabPanelId } from "../lib/tabIds";

type Notice = {
  tone: "info" | "error";
  title: string;
  description: string;
};

type DeliveryRow = WebhookDelivery & { endpointUrl: string };

const DISABLED_REASONS: Record<WebhookDisabledReason, string> = {
  gone: "Turned off because the receiver answered 410 Gone.",
  failing: "Turned off after three days in which every delivery failed.",
  manual: "Turned off by an administrator.",
};

const STATUS_TABS: { label: string; status?: WebhookDeliveryStatus }[] = [
  { label: "All" },
  { label: "Failed", status: "failed" },
  { label: "Dead letter", status: "dead" },
  { label: "Pending", status: "pending" },
  { label: "Delivered", status: "succeeded" },
];

const STATUS_LABELS: Record<WebhookDeliveryStatus, string> = {
  pending: "Pending",
  succeeded: "Delivered",
  failed: "Failed, retrying",
  dead: "Dead letter",
};

const retryHours = Math.round(
  WEBHOOK_RETRY_SCHEDULE_SECONDS.reduce<number>((sum, s) => sum + s, 0) / 3600,
);

function disabledText(endpoint: WebhookEndpoint) {
  return endpoint.disabledReason
    ? DISABLED_REASONS[endpoint.disabledReason]
    : "Turned off.";
}

export default function Webhooks() {
  const endpointQuery = useWebhookEndpoints();
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const rotateSecret = useRotateWebhookSecret();
  const testWebhook = useTestWebhook();
  const redeliver = useRedeliverWebhook();
  const { canWrite } = useAdminPermissions();
  const ensureStepUp = useStepUpGuard();
  const toast = useToast();
  const confirm = useConfirm();

  const [dialog, setDialog] = useState<WebhookEndpoint | "new" | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RevealedSecret | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [endpointFilter, setEndpointFilter] = useState("");
  const [statusTab, setStatusTab] = useState(STATUS_TABS[0].label);
  // Each entry is the cursor that opened a page, so "Newer" pops back to it.
  const [cursors, setCursors] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);

  const status = STATUS_TABS.find((tab) => tab.label === statusTab)?.status;
  const deliveryQuery = useWebhookDeliveries({
    endpointId: endpointFilter || undefined,
    status,
    cursor: cursors.at(-1),
  });

  const endpoints = useMemo(
    () => endpointQuery.data?.endpoints ?? [],
    [endpointQuery.data],
  );
  const deliveries = useMemo<DeliveryRow[]>(
    () =>
      (deliveryQuery.data?.deliveries ?? []).map((delivery) => ({
        ...delivery,
        endpointUrl:
          endpoints.find((endpoint) => endpoint.id === delivery.endpointId)
            ?.url ?? delivery.endpointId,
      })),
    [deliveryQuery.data, endpoints],
  );
  const nextCursor = deliveryQuery.data?.nextCursor ?? null;

  const resetPaging = () => setCursors([]);

  const openDialog = (value: WebhookEndpoint | "new") => {
    setDialogError(null);
    setDialog(value);
  };

  const showDeliveries = (endpoint: WebhookEndpoint, tab = "All") => {
    setEndpointFilter(endpoint.id);
    setStatusTab(tab);
    resetPaging();
    document
      .getElementById("webhook-deliveries")
      ?.scrollIntoView?.({ block: "start" });
  };

  const handleSubmit = async (
    form:
      | { mode: "create"; request: CreateWebhookEndpointRequest }
      | { mode: "edit"; changes: UpdateWebhookEndpointRequest },
  ) => {
    if (!canWrite || !dialog) return;
    if (!(await ensureStepUp())) return;

    const onError = (error: Error) =>
      setDialogError(describeWriteRefusal(error));

    if (form.mode === "create") {
      createWebhook.mutate(form.request, {
        onSuccess: ({ endpoint, secret }) => {
          setDialog(null);
          setRevealed({ name: endpoint.url, secret });
          toast.success("Webhook created", `${endpoint.url} was added.`);
        },
        onError,
      });
      return;
    }

    if (dialog === "new") return;
    updateWebhook.mutate(
      { id: dialog.id, changes: form.changes },
      {
        onSuccess: ({ endpoint }) => {
          setDialog(null);
          toast.success("Webhook updated", `${endpoint.url} was saved.`);
        },
        onError,
      },
    );
  };

  const handleToggle = async (endpoint: WebhookEndpoint) => {
    if (!canWrite) return;
    if (!(await ensureStepUp())) return;

    const enabled = !endpoint.enabled;
    updateWebhook.mutate(
      { id: endpoint.id, changes: { enabled } },
      {
        onSuccess: () =>
          toast.success(
            enabled ? "Webhook turned on" : "Webhook turned off",
            enabled
              ? `${endpoint.url} receives new events again.`
              : `${endpoint.url} receives nothing until it is turned back on.`,
          ),
        onError: (error) =>
          setNotice({
            tone: "error",
            title: `Could not change ${endpoint.url}`,
            description: describeWriteRefusal(error),
          }),
      },
    );
  };

  const handleRotate = async (endpoint: WebhookEndpoint) => {
    if (!canWrite) return;

    if (
      !(await confirm({
        title: "Rotate signing secret",
        description: `Issue a new signing secret for ${endpoint.url}? The current secret keeps signing beside the new one for 24 hours, so a receiver holding either verifies while you update it.`,
        confirmLabel: "Rotate",
      }))
    ) {
      return;
    }

    if (!(await ensureStepUp())) return;

    rotateSecret.mutate(endpoint.id, {
      onSuccess: ({ secret, previousSecretExpiresAt }) =>
        setRevealed({ name: endpoint.url, secret, previousSecretExpiresAt }),
      onError: (error) =>
        setNotice({
          tone: "error",
          title: `Could not rotate the secret for ${endpoint.url}`,
          description: describeWriteRefusal(error),
        }),
    });
  };

  const handleTest = async (endpoint: WebhookEndpoint) => {
    if (!canWrite) return;
    if (!(await ensureStepUp())) return;

    setNotice(null);
    testWebhook.mutate(endpoint.id, {
      onSuccess: (result) =>
        setNotice({
          tone: result.ok ? "info" : "error",
          title: result.ok
            ? `Test event delivered to ${endpoint.url}`
            : `Test event to ${endpoint.url} failed`,
          description: describeTestResult(result),
        }),
      onError: (error) =>
        setNotice({
          tone: "error",
          title: `Could not send a test event to ${endpoint.url}`,
          description: describeWriteRefusal(error),
        }),
    });
  };

  const handleDelete = async (endpoint: WebhookEndpoint) => {
    if (!canWrite) return;

    if (
      !(await confirm({
        title: "Delete webhook",
        description: `Delete ${endpoint.url}? Its delivery history is deleted with it, and nothing pending is sent.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    ) {
      return;
    }

    if (!(await ensureStepUp())) return;

    if (endpointFilter === endpoint.id) {
      setEndpointFilter("");
      resetPaging();
    }
    deleteWebhook.mutate(endpoint.id, {
      onSuccess: () =>
        toast.success("Webhook deleted", `${endpoint.url} was deleted.`),
      onError: (error) =>
        setNotice({
          tone: "error",
          title: `Could not delete ${endpoint.url}`,
          description: describeWriteRefusal(error),
        }),
    });
  };

  const handleRedeliver = async (delivery: DeliveryRow) => {
    if (!canWrite) return;
    if (!(await ensureStepUp())) return;

    redeliver.mutate(delivery.id, {
      onSuccess: ({ delivery: result }) => {
        if (result.status === "succeeded") {
          toast.success(
            "Redelivered",
            `${result.eventType} reached ${delivery.endpointUrl}.`,
          );
          return;
        }

        setNotice({
          tone: "error",
          title: `Redelivery of ${result.eventType} failed`,
          description:
            describeCalloutFailure(result.lastFailure, result.lastStatusCode) ??
            "The delivery did not succeed.",
        });
      },
      onError: (error) =>
        setNotice({
          tone: "error",
          title: "Could not redeliver",
          description: describeWriteRefusal(error),
        }),
    });
  };

  const header = (
    <PageHeader eyebrow="Integrations" title="Webhooks">
      Signed calls to your own endpoints when users, sessions, credentials or
      organization members change. Each request follows Standard Webhooks, so
      any Standard Webhooks library can verify it.
    </PageHeader>
  );

  if (endpointQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-[28px]" />
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
    );
  }

  if (isRouteMissing(endpointQuery.error)) {
    return (
      <div className="space-y-8">
        {header}
        <NeedsUpgrade what="webhook" />
      </div>
    );
  }

  if (endpointQuery.isError) {
    return (
      <div className="space-y-8">
        {header}
        <QueryErrorState
          title="Could not load webhooks"
          error={endpointQuery.error}
          onRetry={() => void endpointQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {header}

      <div className="grid gap-4 lg:grid-cols-2">
        <StateMessage
          title="How deliveries work"
          description={`At least once and in no set order, so receivers dedupe on webhook-id. Success is a 2xx within ${WEBHOOK_TIMEOUT_MS / 1000} seconds, and a redirect is a failure. A delivery gets ${WEBHOOK_RETRY_SCHEDULE_SECONDS.length} attempts over about ${retryHours} hours, then it is dead. A 410 Gone, or three days in which every delivery failed, turns the endpoint off.`}
        />
        <StateMessage
          title="Verifying a request"
          description={`Each request carries webhook-id, webhook-timestamp and webhook-signature, an HMAC-SHA256 of the id, timestamp and body. Reject a timestamp more than ${WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS} seconds from your clock. While a secret rotates, the header carries two signatures and either one verifies.`}
        />
      </div>

      {!canWrite && (
        <ReadOnlyNotice description="You have read-only admin access. Create, edit, test, redeliver and delete controls are hidden." />
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

      <Section
        title="Endpoints"
        description="Each endpoint receives the event types it subscribes to, signed with its own secret."
        actions={
          canWrite ? (
            <button
              type="button"
              className="btn btn-primary inline-flex items-center gap-2"
              onClick={() => openDialog("new")}
            >
              <Plus size={16} />
              New webhook
            </button>
          ) : undefined
        }
      >
        <Table<WebhookEndpoint>
          label="Webhook endpoints"
          data={endpoints}
          rowLabel={(endpoint) => endpoint.url}
          emptyTitle="No webhooks"
          emptyDescription={
            canWrite
              ? "Create a webhook to have events sent to your own endpoint."
              : "No webhooks are set up."
          }
          columns={[
            {
              key: "url",
              label: "Endpoint",
              width: "wide",
              wrap: true,
              render: (value, row) => (
                <div className="flex flex-col gap-0.5">
                  <span className="break-all font-mono text-sm font-medium text-primary">
                    {value}
                  </span>
                  {row.description && (
                    <span className="text-xs text-muted">
                      {row.description}
                    </span>
                  )}
                  {row.previousSecretExpiresAt && (
                    <span className="text-xs text-muted">
                      The previous secret signs too until{" "}
                      {formatTimestamp(row.previousSecretExpiresAt)}.
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: "eventTypes",
              label: "Events",
              width: "large",
              wrap: true,
              render: (value) => <ChipList values={value} empty="None" />,
            },
            {
              key: "enabled",
              label: "State",
              width: "medium",
              wrap: true,
              render: (value, row) =>
                value ? (
                  <span className="text-sm text-primary">On</span>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-[var(--highlight)]">
                      Off
                    </span>
                    <span className="text-xs text-muted">
                      {disabledText(row)}
                    </span>
                  </div>
                ),
            },
          ]}
          actions={[
            {
              icon: ListChecks,
              label: "Deliveries",
              onClick: (row: WebhookEndpoint) => showDeliveries(row),
            },
            ...(canWrite
              ? [
                  {
                    icon: Pencil,
                    label: "Edit",
                    onClick: (row: WebhookEndpoint) => openDialog(row),
                  },
                  {
                    icon: Send,
                    label: "Send test",
                    onClick: (row: WebhookEndpoint) => void handleTest(row),
                  },
                  {
                    icon: PowerOff,
                    label: "Turn off",
                    hidden: (row: WebhookEndpoint) => !row.enabled,
                    onClick: (row: WebhookEndpoint) => void handleToggle(row),
                  },
                  {
                    icon: Power,
                    label: "Turn on",
                    hidden: (row: WebhookEndpoint) => row.enabled,
                    onClick: (row: WebhookEndpoint) => void handleToggle(row),
                  },
                  {
                    icon: KeyRound,
                    label: "Rotate secret",
                    onClick: (row: WebhookEndpoint) => void handleRotate(row),
                  },
                  {
                    icon: Trash2,
                    label: "Delete",
                    variant: "danger" as const,
                    onClick: (row: WebhookEndpoint) => void handleDelete(row),
                  },
                ]
              : []),
          ]}
        />
      </Section>

      <div id="webhook-deliveries">
        <Section
          title="Deliveries"
          description="Newest first, kept for 30 days. A dead delivery has used every attempt; redeliver sends it once more with the same webhook-id and body."
          actions={
            <label className="flex items-center gap-2 text-sm text-muted">
              <span>Endpoint</span>
              <select
                aria-label="Delivery endpoint"
                value={endpointFilter}
                onChange={(event) => {
                  setEndpointFilter(event.target.value);
                  resetPaging();
                }}
                className={`${inputClass} w-auto`}
              >
                <option value="">All endpoints</option>
                {endpoints.map((endpoint) => (
                  <option key={endpoint.id} value={endpoint.id}>
                    {endpoint.url}
                  </option>
                ))}
              </select>
            </label>
          }
        >
          <Tabs
            idBase="webhook-deliveries"
            tabs={STATUS_TABS.map((tab) => tab.label)}
            active={statusTab}
            onChange={(tab) => {
              setStatusTab(tab);
              resetPaging();
            }}
          />

          <div role="tabpanel" id={tabPanelId("webhook-deliveries")}>
            {deliveryQuery.isLoading ? (
              <Skeleton className="h-48 rounded-xl" />
            ) : deliveryQuery.isError ? (
              <QueryErrorState
                title="Could not load deliveries"
                error={deliveryQuery.error}
                onRetry={() => void deliveryQuery.refetch()}
              />
            ) : (
              <Table<DeliveryRow>
                label="Webhook deliveries"
                data={deliveries}
                rowLabel={(delivery) =>
                  `${delivery.eventType} ${delivery.createdAt}`
                }
                emptyTitle={
                  status === "dead" ? "No dead deliveries" : "No deliveries"
                }
                emptyDescription={
                  status === "dead"
                    ? "Nothing has used up its attempts."
                    : "Nothing matches this view yet."
                }
                columns={[
                  {
                    key: "createdAt",
                    label: "Queued",
                    width: "medium",
                    render: (value) => formatTimestamp(value),
                  },
                  {
                    key: "eventType",
                    label: "Event",
                    width: "medium",
                    render: (value) => (
                      <span className="font-mono text-xs">{value}</span>
                    ),
                  },
                  {
                    key: "endpointUrl",
                    label: "Endpoint",
                    width: "large",
                    wrap: true,
                    render: (value) => (
                      <span className="break-all font-mono text-xs">
                        {value}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    label: "Status",
                    width: "small",
                    render: (value) => STATUS_LABELS[value] ?? value,
                  },
                  {
                    key: "attempts",
                    label: "Attempts",
                    width: "compact",
                    align: "right",
                  },
                  {
                    key: "lastStatusCode",
                    label: "Last status",
                    width: "compact",
                    align: "right",
                    render: (value) => value ?? "None",
                  },
                  {
                    key: "lastFailure",
                    label: "Failure",
                    width: "wide",
                    wrap: true,
                    render: (value, row) => (
                      <span className="text-xs text-muted">
                        {describeCalloutFailure(value, row.lastStatusCode) ??
                          ""}
                        {row.nextAttemptAt &&
                          ` Next attempt ${formatTimestamp(row.nextAttemptAt)}.`}
                      </span>
                    ),
                  },
                ]}
                actions={[
                  {
                    icon: Eye,
                    label: "View",
                    onClick: (row: DeliveryRow) => setDetailId(row.id),
                  },
                  ...(canWrite
                    ? [
                        {
                          icon: RotateCw,
                          label: "Redeliver",
                          hidden: (row: DeliveryRow) =>
                            row.status === "pending",
                          onClick: (row: DeliveryRow) =>
                            void handleRedeliver(row),
                        },
                      ]
                    : []),
                ]}
              />
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary disabled:opacity-50"
              disabled={cursors.length === 0}
              onClick={() => setCursors((stack) => stack.slice(0, -1))}
            >
              Newer
            </button>
            <button
              type="button"
              className="btn btn-secondary disabled:opacity-50"
              disabled={!nextCursor || deliveryQuery.isPlaceholderData}
              onClick={() =>
                nextCursor && setCursors((stack) => [...stack, nextCursor])
              }
            >
              Older
            </button>
          </div>
        </Section>
      </div>

      {dialog && (
        <EndpointDialog
          endpoint={dialog === "new" ? null : dialog}
          error={dialogError}
          isPending={createWebhook.isPending || updateWebhook.isPending}
          onSubmit={(form) => void handleSubmit(form)}
          onClose={() => setDialog(null)}
        />
      )}

      {revealed && (
        <SigningSecretDialog
          revealed={revealed}
          onClose={() => setRevealed(null)}
        />
      )}

      {detailId && (
        <DeliveryDetailDialog
          deliveryId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}

function sameSet(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((item) => b.includes(item));
}

function EndpointDialog({
  endpoint,
  error,
  isPending,
  onSubmit,
  onClose,
}: {
  endpoint: WebhookEndpoint | null;
  error: string | null;
  isPending: boolean;
  onSubmit: (
    form:
      | { mode: "create"; request: CreateWebhookEndpointRequest }
      | { mode: "edit"; changes: UpdateWebhookEndpointRequest },
  ) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(endpoint?.url ?? "");
  const [description, setDescription] = useState(endpoint?.description ?? "");
  const [eventTypes, setEventTypes] = useState<string[]>(
    endpoint?.eventTypes ?? [],
  );
  const [submitted, setSubmitted] = useState(false);

  const changes: Record<string, unknown> = {};
  if (endpoint) {
    if (url.trim() !== endpoint.url) changes.url = url;
    if ((description.trim() || null) !== endpoint.description) {
      changes.description = description.trim() || null;
    }
    if (!sameSet(eventTypes, endpoint.eventTypes))
      changes.eventTypes = eventTypes;
  }

  const update = UpdateWebhookEndpointRequestSchema.safeParse(changes);
  const create = CreateWebhookEndpointRequestSchema.safeParse({
    url,
    ...(description.trim() ? { description } : {}),
    eventTypes,
  });
  const candidate = endpoint ? update : create;
  const dirty = endpoint === null || Object.keys(changes).length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);

    if (endpoint && update.success) {
      onSubmit({ mode: "edit", changes: update.data });
    } else if (!endpoint && create.success) {
      onSubmit({ mode: "create", request: create.data });
    }
  };

  return (
    <Dialog
      className="max-h-[90vh] overflow-y-auto"
      title={endpoint ? "Edit webhook" : "New webhook"}
      description="The API signs every request to this URL. It must be https in production and reachable from the API."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="URL">
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://hooks.example.com/seamless"
            className={`${inputClass} font-mono`}
          />
        </Field>
        <Field label="Description">
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
            className={inputClass}
          />
        </Field>
        <div className="space-y-2">
          <span className="block text-xs uppercase tracking-[0.18em] text-muted">
            Event types
          </span>
          <RoleChips
            roles={[...WEBHOOK_EVENT_TYPES]}
            selected={eventTypes}
            onChange={setEventTypes}
          />
          <FieldNote>
            Choose at least one. webhook.test is sent only by Send test,
            whatever an endpoint subscribes to.
          </FieldNote>
        </div>

        <DialogFooter
          problem={
            submitted && !candidate.success
              ? describeIssues(candidate.error.issues)
              : error
          }
          isPending={isPending}
          submitDisabled={!dirty}
          submitLabel={endpoint ? "Save" : "Create webhook"}
          onClose={onClose}
        />
      </form>
    </Dialog>
  );
}

function DeliveryDetailDialog({
  deliveryId,
  onClose,
}: {
  deliveryId: string;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useWebhookDelivery(deliveryId);
  const delivery = data?.delivery;

  return (
    <Dialog
      className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
      title="Delivery"
      description="The body sent is the same on every attempt and redelivery. Only the status code and a coarse failure reason of each answer are kept."
      onClose={onClose}
    >
      <div className="space-y-3">
        {isLoading && <Skeleton className="h-40 rounded-xl" />}
        {error && (
          <QueryErrorState title="Could not load the delivery" error={error} />
        )}
        {delivery && (
          <>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted">webhook-id</dt>
              <dd className="break-all font-mono text-xs">{delivery.id}</dd>
              <dt className="text-muted">Status</dt>
              <dd>{STATUS_LABELS[delivery.status] ?? delivery.status}</dd>
              <dt className="text-muted">Attempts</dt>
              <dd>{delivery.attempts}</dd>
              <dt className="text-muted">Last attempt</dt>
              <dd>{formatTimestamp(delivery.lastAttemptAt) ?? "None"}</dd>
              <dt className="text-muted">Last status</dt>
              <dd>{delivery.lastStatusCode ?? "None"}</dd>
              <dt className="text-muted">Failure</dt>
              <dd>
                {describeCalloutFailure(
                  delivery.lastFailure,
                  delivery.lastStatusCode,
                ) ?? "None"}
              </dd>
            </dl>
            <pre
              aria-label="Event body"
              className="max-h-72 overflow-auto rounded-md border border-subtle bg-surface-alt p-3 font-mono text-xs"
            >
              {JSON.stringify(delivery.event, null, 2)}
            </pre>
          </>
        )}
        <div className="flex justify-end">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Dialog>
  );
}
