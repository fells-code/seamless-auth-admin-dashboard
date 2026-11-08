/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Pencil, Plus, Power, PowerOff, Send, Trash2, X } from "lucide-react";
import {
  AUDIT_EXPORT_FORMAT,
  AUDIT_SINK_SECRET_ENV_PATTERN,
  CreateAuditSinkRequestSchema,
  UpdateAuditSinkRequestSchema,
  type AuditSink,
  type AuditSinkSettings,
  type CreateAuditSinkRequest,
  type UpdateAuditSinkRequest,
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
import Skeleton from "../components/Skeleton";
import {
  QueryErrorState,
  ReadOnlyNotice,
  StateMessage,
} from "../components/StateMessage";
import Table from "../components/Table";
import { useAdminPermissions } from "../hooks/useAdminPermissions";
import {
  useAuditSinks,
  useCreateAuditSink,
  useDeleteAuditSink,
  useTestAuditSink,
  useUpdateAuditSink,
} from "../hooks/useAuditSinks";
import { useConfirm } from "../hooks/useConfirm";
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

type SinkRow = AuditSink & { destination: string };

function destination(settings: AuditSinkSettings) {
  if (settings.kind === "otlp") {
    return `OTLP ${settings.endpoint.replace(/\/+$/, "")}/v1/logs`;
  }

  return `Syslog ${settings.host}:${settings.port} over ${settings.transport === "tls" ? "TLS" : "plain TCP"}`;
}

// The API never deletes an event a sink has not delivered, so a sink that is
// off but behind keeps the audit log from being pruned past it.
const RETAINED_NOTE =
  "This sink still holds audit retention, so no event is lost. Delete it to release.";

function holdsRetention(sink: AuditSink) {
  return !sink.enabled && (sink.status.lagEvents ?? 0) > 0;
}

function lagText(sink: AuditSink) {
  const { lagEvents } = sink.status;
  if (lagEvents === null) return "Not started";
  if (lagEvents === 0) return "Caught up";
  return `${lagEvents.toLocaleString()} ${lagEvents === 1 ? "event" : "events"} behind`;
}

export default function AuditSinks() {
  const sinkQuery = useAuditSinks();
  const createSink = useCreateAuditSink();
  const updateSink = useUpdateAuditSink();
  const deleteSink = useDeleteAuditSink();
  const testSink = useTestAuditSink();
  const { canWrite } = useAdminPermissions();
  const ensureStepUp = useStepUpGuard();
  const toast = useToast();
  const confirm = useConfirm();

  const [dialog, setDialog] = useState<AuditSink | "new" | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const rows = useMemo<SinkRow[]>(
    () =>
      (sinkQuery.data?.sinks ?? []).map((sink) => ({
        ...sink,
        destination: destination(sink.settings),
      })),
    [sinkQuery.data],
  );

  const refused = (title: string) => (error: Error) =>
    setNotice({
      tone: "error",
      title,
      description: describeWriteRefusal(error),
    });

  const handleSubmit = async (
    form:
      | { mode: "create"; request: CreateAuditSinkRequest }
      | { mode: "edit"; changes: UpdateAuditSinkRequest },
  ) => {
    if (!canWrite || !dialog) return;
    if (!(await ensureStepUp())) return;

    const onError = (error: Error) =>
      setDialogError(describeWriteRefusal(error));

    if (form.mode === "create") {
      createSink.mutate(form.request, {
        onSuccess: ({ sink }) => {
          setDialog(null);
          toast.success(
            "Audit sink created",
            `${sink.name} streams events from after the newest one.`,
          );
        },
        onError,
      });
      return;
    }

    if (dialog === "new") return;
    updateSink.mutate(
      { id: dialog.id, changes: form.changes },
      {
        onSuccess: ({ sink }) => {
          setDialog(null);
          toast.success("Audit sink updated", `${sink.name} was saved.`);
        },
        onError,
      },
    );
  };

  const handleToggle = async (sink: AuditSink) => {
    if (!canWrite) return;

    const enabled = !sink.enabled;
    if (
      !enabled &&
      !(await confirm({
        title: "Turn off audit sink",
        description: `Turn off ${sink.name}? It stops sending but keeps its place, and it still holds audit retention: the API keeps every event it has not delivered, so no event is lost. Delete the sink to release them.`,
        confirmLabel: "Turn off",
      }))
    ) {
      return;
    }

    if (!(await ensureStepUp())) return;

    updateSink.mutate(
      { id: sink.id, changes: { enabled } },
      {
        onSuccess: () =>
          toast.success(
            enabled ? "Audit sink turned on" : "Audit sink turned off",
            enabled
              ? `${sink.name} resumes where it stopped.`
              : `${sink.name} keeps its place and resumes from there when turned back on.`,
          ),
        onError: refused(`Could not change ${sink.name}`),
      },
    );
  };

  const handleTest = async (sink: AuditSink) => {
    if (!canWrite) return;
    if (!(await ensureStepUp())) return;

    setNotice(null);
    testSink.mutate(sink.id, {
      onSuccess: (result) =>
        setNotice({
          tone: result.ok ? "info" : "error",
          title: result.ok
            ? `${sink.name} accepted the test record`
            : `The test record to ${sink.name} failed`,
          description: `${describeTestResult(result)} The test record is marked as a test, is not part of the chain and does not move the stream.`,
        }),
      onError: refused(`Could not test ${sink.name}`),
    });
  };

  const handleDelete = async (sink: AuditSink) => {
    if (!canWrite) return;

    if (
      !(await confirm({
        title: "Delete audit sink",
        description: `Delete ${sink.name}? It stops streaming at once and its place in the log is lost. While it exists it holds audit retention, so the API keeps every event it has not delivered; deleting it releases them.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    ) {
      return;
    }

    if (!(await ensureStepUp())) return;

    deleteSink.mutate(sink.id, {
      onSuccess: () =>
        toast.success("Audit sink deleted", `${sink.name} was deleted.`),
      onError: refused(`Could not delete ${sink.name}`),
    });
  };

  const header = (
    <PageHeader eyebrow="Security" title="Audit streaming">
      Stream the audit log to a SIEM or log pipeline over OTLP or syslog. Every
      record carries its {AUDIT_EXPORT_FORMAT} line with its hash, so the chain
      verifies downstream as an export does.
    </PageHeader>
  );

  if (sinkQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-[28px]" />
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
    );
  }

  if (isRouteMissing(sinkQuery.error)) {
    return (
      <div className="space-y-8">
        {header}
        <NeedsUpgrade what="audit sink" />
      </div>
    );
  }

  if (sinkQuery.isError) {
    return (
      <div className="space-y-8">
        {header}
        <QueryErrorState
          title="Could not load audit sinks"
          error={sinkQuery.error}
          onRetry={() => void sinkQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {header}

      <div className="grid gap-4 lg:grid-cols-2">
        <StateMessage
          title="Credentials stay in env vars"
          description="A sink names env vars ending _AUDIT_SINK_SECRET that hold its header values and TLS material. Set them on the API. Values are never sent or stored through the console."
        />
        <StateMessage
          title="A sink falls behind rather than dropping events"
          description="Each sink keeps its own place in the log and retries until its destination takes the events, backing off to once a minute. There is no dead letter: lag shows how far behind it is."
        />
      </div>

      {!canWrite && (
        <ReadOnlyNotice description="You have read-only admin access. Create, edit, test and delete controls are hidden." />
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
        title="Sinks"
        description="A new sink starts after the newest event. A sink that is turned off still holds audit retention: the API keeps every event it has not delivered until the sink is deleted. Status refreshes every 30 seconds."
        actions={
          canWrite ? (
            <button
              type="button"
              className="btn btn-primary inline-flex items-center gap-2"
              onClick={() => {
                setDialogError(null);
                setDialog("new");
              }}
            >
              <Plus size={16} />
              New sink
            </button>
          ) : undefined
        }
      >
        <Table<SinkRow>
          label="Audit sinks"
          data={rows}
          rowLabel={(sink) => sink.name}
          emptyTitle="No audit sinks"
          emptyDescription={
            canWrite
              ? "Create a sink to stream the audit log to your SIEM."
              : "The audit log is not streamed anywhere."
          }
          columns={[
            {
              key: "name",
              label: "Sink",
              width: "wide",
              wrap: true,
              render: (value, row) => (
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-primary">
                    {value}
                  </span>
                  <span className="break-all font-mono text-xs text-muted">
                    {row.destination}
                  </span>
                  {!row.enabled && (
                    <span className="text-xs font-medium text-[var(--highlight)]">
                      Off
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: "status",
              label: "Status",
              width: "large",
              wrap: true,
              render: (value, row) => (
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="text-sm text-primary">{lagText(row)}</span>
                  <span className="text-muted">
                    Last delivery:{" "}
                    {formatTimestamp(value.lastDeliveredAt) ?? "never"}
                  </span>
                  {holdsRetention(row) && (
                    <span className="text-primary">{RETAINED_NOTE}</span>
                  )}
                </div>
              ),
            },
            {
              key: "updatedAt",
              label: "Last failure",
              width: "wide",
              wrap: true,
              render: (_value, row) =>
                row.status.lastFailure ? (
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="text-[var(--highlight)]">
                      {describeCalloutFailure(row.status.lastFailure)}
                    </span>
                    <span className="text-muted">
                      {formatTimestamp(row.status.lastFailureAt)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted">None</span>
                ),
            },
          ]}
          actions={
            canWrite
              ? [
                  {
                    icon: Pencil,
                    label: "Edit",
                    onClick: (row: SinkRow) => {
                      setDialogError(null);
                      setDialog(row);
                    },
                  },
                  {
                    icon: Send,
                    label: "Send test",
                    onClick: (row: SinkRow) => void handleTest(row),
                  },
                  {
                    icon: PowerOff,
                    label: "Turn off",
                    hidden: (row: SinkRow) => !row.enabled,
                    onClick: (row: SinkRow) => void handleToggle(row),
                  },
                  {
                    icon: Power,
                    label: "Turn on",
                    hidden: (row: SinkRow) => row.enabled,
                    onClick: (row: SinkRow) => void handleToggle(row),
                  },
                  {
                    icon: Trash2,
                    label: "Delete",
                    variant: "danger" as const,
                    onClick: (row: SinkRow) => void handleDelete(row),
                  },
                ]
              : []
          }
        />
      </Section>

      {dialog && (
        <SinkDialog
          sink={dialog === "new" ? null : dialog}
          error={dialogError}
          isPending={createSink.isPending || updateSink.isPending}
          onSubmit={(form) => void handleSubmit(form)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

type HeaderRow = { name: string; env: string };

const ENV_HINT =
  "The name of an env var on the API ending _AUDIT_SINK_SECRET, such as DD_AUDIT_SINK_SECRET. Never the value itself.";

/**
 * Every credential field takes an env var name. A value pasted in by mistake
 * would otherwise be stored and shown to every admin, so it is refused here
 * with that reason before the schema's generic pattern message.
 */
function envProblem(fields: { label: string; value: string }[]) {
  const wrong = fields.filter(
    (field) => field.value && !AUDIT_SINK_SECRET_ENV_PATTERN.test(field.value),
  );

  return wrong.length > 0
    ? `${wrong.map((field) => field.label).join(", ")} must name an env var ending _AUDIT_SINK_SECRET, not hold a value.`
    : null;
}

function SinkDialog({
  sink,
  error,
  isPending,
  onSubmit,
  onClose,
}: {
  sink: AuditSink | null;
  error: string | null;
  isPending: boolean;
  onSubmit: (
    form:
      | { mode: "create"; request: CreateAuditSinkRequest }
      | { mode: "edit"; changes: UpdateAuditSinkRequest },
  ) => void;
  onClose: () => void;
}) {
  const initial = sink?.settings;
  const [name, setName] = useState(sink?.name ?? "");
  const [kind, setKind] = useState<AuditSinkSettings["kind"]>(
    initial?.kind ?? "otlp",
  );
  const [enabled, setEnabled] = useState(sink?.enabled ?? true);

  const [endpoint, setEndpoint] = useState(
    initial?.kind === "otlp" ? initial.endpoint : "",
  );
  const [serviceName, setServiceName] = useState(
    initial?.kind === "otlp" ? initial.serviceName : "seamless-auth",
  );
  const [headers, setHeaders] = useState<HeaderRow[]>(
    initial?.kind === "otlp"
      ? Object.entries(initial.headersFromEnv).map(([header, env]) => ({
          name: header,
          env,
        }))
      : [],
  );

  const syslog = initial?.kind === "syslog" ? initial : null;
  const [host, setHost] = useState(syslog?.host ?? "");
  const [port, setPort] = useState(String(syslog?.port ?? 6514));
  const [transport, setTransport] = useState<"tls" | "tcp">(
    syslog?.transport ?? "tls",
  );
  const [appName, setAppName] = useState(syslog?.appName ?? "seamless-auth");
  const [facility, setFacility] = useState(String(syslog?.facility ?? 10));
  const [tlsCaEnv, setTlsCaEnv] = useState(syslog?.tlsCaEnv ?? "");
  const [tlsClientCertEnv, setTlsClientCertEnv] = useState(
    syslog?.tlsClientCertEnv ?? "",
  );
  const [tlsClientKeyEnv, setTlsClientKeyEnv] = useState(
    syslog?.tlsClientKeyEnv ?? "",
  );
  const [submitted, setSubmitted] = useState(false);

  const settings =
    kind === "otlp"
      ? {
          kind,
          endpoint,
          serviceName,
          headersFromEnv: Object.fromEntries(
            headers
              .filter((row) => row.name || row.env)
              .map((row) => [row.name.trim(), row.env.trim()]),
          ),
        }
      : {
          kind,
          host,
          port: Number(port),
          transport,
          appName,
          facility: Number(facility),
          ...(tlsCaEnv.trim() ? { tlsCaEnv: tlsCaEnv.trim() } : {}),
          ...(tlsClientCertEnv.trim()
            ? { tlsClientCertEnv: tlsClientCertEnv.trim() }
            : {}),
          ...(tlsClientKeyEnv.trim()
            ? { tlsClientKeyEnv: tlsClientKeyEnv.trim() }
            : {}),
        };

  const envFields =
    kind === "otlp"
      ? headers.map((row) => ({
          label: `The env var for ${row.name || "a header"}`,
          value: row.env.trim(),
        }))
      : [
          { label: "The CA env var", value: tlsCaEnv.trim() },
          {
            label: "The client certificate env var",
            value: tlsClientCertEnv.trim(),
          },
          { label: "The client key env var", value: tlsClientKeyEnv.trim() },
        ];
  const credentialProblem = envProblem(envFields);

  const create = CreateAuditSinkRequestSchema.safeParse({
    name,
    settings,
    enabled,
  });
  const update = UpdateAuditSinkRequestSchema.safeParse({ name, settings });
  const candidate = sink ? update : create;

  const problem =
    credentialProblem ??
    (candidate.success ? null : describeIssues(candidate.error.issues));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (credentialProblem) return;

    if (sink && update.success) {
      onSubmit({ mode: "edit", changes: update.data });
    } else if (!sink && create.success) {
      onSubmit({ mode: "create", request: create.data });
    }
  };

  return (
    <Dialog
      className="max-h-[90vh] overflow-y-auto"
      title={sink ? `Edit ${sink.name}` : "New audit sink"}
      description={
        sink
          ? "The sink keeps its place in the log."
          : "The sink starts after the newest event."
      }
      onClose={onClose}
    >
      <form className="space-y-4" noValidate onSubmit={handleSubmit}>
        <Field label="Name">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            className={inputClass}
          />
        </Field>
        <Field label="Protocol">
          <select
            value={kind}
            disabled={sink !== null}
            onChange={(event) =>
              setKind(event.target.value as AuditSinkSettings["kind"])
            }
            className={inputClass}
          >
            <option value="otlp">OTLP over HTTP (JSON)</option>
            <option value="syslog">Syslog (RFC 5424)</option>
          </select>
        </Field>

        {kind === "otlp" ? (
          <>
            <Field label="Collector URL">
              <input
                value={endpoint}
                onChange={(event) => setEndpoint(event.target.value)}
                placeholder="https://otel.example.com"
                className={`${inputClass} font-mono`}
              />
            </Field>
            <FieldNote>/v1/logs is appended.</FieldNote>
            <Field label="Service name">
              <input
                value={serviceName}
                onChange={(event) => setServiceName(event.target.value)}
                maxLength={100}
                className={inputClass}
              />
            </Field>
            <div className="space-y-2">
              <span className="block text-xs uppercase tracking-[0.18em] text-muted">
                Headers from env vars
              </span>
              {headers.map((row, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    aria-label={`Header ${index + 1} name`}
                    value={row.name}
                    placeholder="DD-API-KEY"
                    onChange={(event) =>
                      setHeaders((rows) =>
                        rows.map((item, i) =>
                          i === index
                            ? { ...item, name: event.target.value }
                            : item,
                        ),
                      )
                    }
                    className={`${inputClass} font-mono`}
                  />
                  <input
                    aria-label={`Header ${index + 1} env var`}
                    value={row.env}
                    placeholder="DD_AUDIT_SINK_SECRET"
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) =>
                      setHeaders((rows) =>
                        rows.map((item, i) =>
                          i === index
                            ? { ...item, env: event.target.value }
                            : item,
                        ),
                      )
                    }
                    className={`${inputClass} font-mono`}
                  />
                  <button
                    type="button"
                    aria-label={`Remove header ${index + 1}`}
                    className="btn btn-secondary"
                    onClick={() =>
                      setHeaders((rows) => rows.filter((_, i) => i !== index))
                    }
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-secondary inline-flex items-center gap-2"
                onClick={() =>
                  setHeaders((rows) => [...rows, { name: "", env: "" }])
                }
              >
                <Plus size={15} />
                Add header
              </button>
              <FieldNote>{ENV_HINT}</FieldNote>
            </div>
          </>
        ) : (
          <>
            <Field label="Host">
              <input
                value={host}
                onChange={(event) => setHost(event.target.value)}
                placeholder="siem.example.com"
                className={`${inputClass} font-mono`}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Port">
                <input
                  type="number"
                  min={1}
                  max={65535}
                  value={port}
                  onChange={(event) => setPort(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Transport">
                <select
                  value={transport}
                  onChange={(event) =>
                    setTransport(event.target.value as "tls" | "tcp")
                  }
                  className={inputClass}
                >
                  <option value="tls">TLS (RFC 5425)</option>
                  <option value="tcp">Plain TCP</option>
                </select>
              </Field>
            </div>
            {transport === "tcp" && (
              <FieldNote>
                Plain TCP is refused in production. Use it only against a local
                collector.
              </FieldNote>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="App name">
                <input
                  value={appName}
                  onChange={(event) => setAppName(event.target.value)}
                  maxLength={48}
                  className={inputClass}
                />
              </Field>
              <Field label="Facility">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={facility}
                  onChange={(event) => setFacility(event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            <FieldNote>The default facility, 10, is authpriv.</FieldNote>
            <Field label="CA certificate env var">
              <input
                value={tlsCaEnv}
                onChange={(event) => setTlsCaEnv(event.target.value)}
                placeholder="SIEM_CA_AUDIT_SINK_SECRET"
                autoComplete="off"
                spellCheck={false}
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field label="Client certificate env var">
              <input
                value={tlsClientCertEnv}
                onChange={(event) => setTlsClientCertEnv(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field label="Client key env var">
              <input
                value={tlsClientKeyEnv}
                onChange={(event) => setTlsClientKeyEnv(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                className={`${inputClass} font-mono`}
              />
            </Field>
            <FieldNote>
              Optional PEM for a private CA or a collector that checks client
              certificates. {ENV_HINT}
            </FieldNote>
          </>
        )}

        {sink === null && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            On
          </label>
        )}

        <DialogFooter
          problem={submitted && problem ? problem : error}
          isPending={isPending}
          submitLabel={sink ? "Save" : "Create sink"}
          onClose={onClose}
        />
      </form>
    </Dialog>
  );
}
