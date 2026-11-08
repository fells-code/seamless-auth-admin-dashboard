/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditSink } from "@seamless-auth/types";
import { ApiError } from "../lib/api";
import AuditSinks from "./AuditSinks";

const mocks = vi.hoisted(() => ({
  useAuditSinks: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  test: vi.fn(),
  useAdminPermissions: vi.fn(),
  ensureStepUp: vi.fn(),
  confirm: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

const { mutation } = vi.hoisted(() => ({
  mutation: (mutate: ReturnType<typeof vi.fn>) => () => ({
    mutate,
    isPending: false,
  }),
}));

vi.mock("../hooks/useAuditSinks", () => ({
  useAuditSinks: mocks.useAuditSinks,
  useCreateAuditSink: mutation(mocks.create),
  useUpdateAuditSink: mutation(mocks.update),
  useDeleteAuditSink: mutation(mocks.remove),
  useTestAuditSink: mutation(mocks.test),
}));

vi.mock("../hooks/useAdminPermissions", () => ({
  useAdminPermissions: mocks.useAdminPermissions,
}));

vi.mock("../hooks/useStepUpGuard", () => ({
  useStepUpGuard: () => mocks.ensureStepUp,
}));

vi.mock("../hooks/useToast", () => ({
  useToast: () => ({ success: mocks.toastSuccess, error: mocks.toastError }),
}));

vi.mock("../hooks/useConfirm", () => ({
  useConfirm: () => mocks.confirm,
}));

const datadog: AuditSink = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Datadog",
  enabled: true,
  settings: {
    kind: "otlp",
    endpoint: "https://otel.example.com/",
    headersFromEnv: { "DD-API-KEY": "DD_AUDIT_SINK_SECRET" },
    serviceName: "seamless-auth",
  },
  status: {
    cursorSeq: 120,
    lagEvents: 0,
    lastDeliveredAt: "2026-11-01T00:00:00.000Z",
    lastFailure: null,
    lastFailureAt: null,
  },
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

const splunk: AuditSink = {
  ...datadog,
  id: "22222222-2222-4222-8222-222222222222",
  name: "Splunk",
  enabled: false,
  settings: {
    kind: "syslog",
    host: "siem.example.com",
    port: 6514,
    transport: "tcp",
    appName: "seamless-auth",
    facility: 10,
  },
  status: {
    cursorSeq: null,
    lagEvents: 1,
    lastDeliveredAt: null,
    lastFailure: "connection_failed",
    lastFailureAt: "2026-11-01T00:00:00.000Z",
  },
};

function setText(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("AuditSinks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuditSinks.mockReturnValue({
      data: { sinks: [datadog, splunk] },
      isLoading: false,
    });
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: true,
    });
    mocks.ensureStepUp.mockResolvedValue(true);
    mocks.confirm.mockResolvedValue(true);
  });

  it("shows each sink's destination, lag, last delivery and last failure", () => {
    render(<AuditSinks />);

    const table = screen.getByRole("table", { name: "Audit sinks" });
    expect(table).toHaveTextContent("OTLP https://otel.example.com/v1/logs");
    expect(table).toHaveTextContent(
      "Syslog siem.example.com:6514 over plain TCP",
    );
    expect(table).toHaveTextContent("Caught up");
    expect(table).toHaveTextContent("1 event behind");
    expect(table).toHaveTextContent("Last delivery: never");
    expect(table).toHaveTextContent(
      "The API could not connect to the destination.",
    );
  });

  it("says a turned-off sink that is behind still holds audit retention", () => {
    render(<AuditSinks />);

    expect(
      screen.getByText(
        "This sink still holds audit retention, so no event is lost. Delete it to release.",
      ),
    ).toBeVisible();
    expect(screen.getAllByText(/still holds audit retention/)).toHaveLength(2);
  });

  it.each([
    ["on and behind", { enabled: true, lagEvents: 5 }],
    ["off and caught up", { enabled: false, lagEvents: 0 }],
    ["off and not started", { enabled: false, lagEvents: null }],
  ])("does not say so for a sink %s", (_name, { enabled, lagEvents }) => {
    mocks.useAuditSinks.mockReturnValue({
      data: {
        sinks: [
          { ...splunk, enabled, status: { ...splunk.status, lagEvents } },
        ],
      },
      isLoading: false,
    });
    render(<AuditSinks />);

    expect(screen.queryByText(/Delete it to release/)).toBeNull();
  });

  it("says retention is held when turning a sink off and when deleting it", async () => {
    mocks.confirm.mockResolvedValueOnce(false);
    render(<AuditSinks />);

    fireEvent.click(screen.getByRole("button", { name: "Turn off Datadog" }));
    await waitFor(() =>
      expect(mocks.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Turn off audit sink",
          description: expect.stringMatching(
            /still holds audit retention.*no event is lost/,
          ),
        }),
      ),
    );
    expect(mocks.ensureStepUp).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Delete Splunk" }));
    await waitFor(() =>
      expect(mocks.confirm).toHaveBeenLastCalledWith(
        expect.objectContaining({
          description: expect.stringMatching(
            /holds audit retention.*deleting it releases them/,
          ),
        }),
      ),
    );
  });

  it("turns a sink on without a confirmation", async () => {
    render(<AuditSinks />);

    fireEvent.click(screen.getByRole("button", { name: "Turn on Splunk" }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it("reports a sink that has not started", () => {
    mocks.useAuditSinks.mockReturnValue({
      data: {
        sinks: [{ ...datadog, status: { ...datadog.status, lagEvents: null } }],
      },
      isLoading: false,
    });
    render(<AuditSinks />);

    expect(screen.getByText("Not started")).toBeVisible();
  });

  it("creates an OTLP sink with a header named by env var after step-up", async () => {
    mocks.create.mockImplementation((_request, options) =>
      options.onSuccess({ sink: datadog }),
    );
    render(<AuditSinks />);

    fireEvent.click(screen.getByRole("button", { name: "New sink" }));
    setText("Name", "Honeycomb");
    setText("Collector URL", "https://api.honeycomb.io");
    fireEvent.click(screen.getByRole("button", { name: "Add header" }));
    setText("Header 1 name", "x-honeycomb-team");
    setText("Header 1 env var", "HONEYCOMB_AUDIT_SINK_SECRET");
    fireEvent.click(screen.getByRole("button", { name: "Create sink" }));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        {
          name: "Honeycomb",
          enabled: true,
          settings: {
            kind: "otlp",
            endpoint: "https://api.honeycomb.io",
            serviceName: "seamless-auth",
            headersFromEnv: {
              "x-honeycomb-team": "HONEYCOMB_AUDIT_SINK_SECRET",
            },
          },
        },
        expect.anything(),
      ),
    );
    expect(mocks.ensureStepUp).toHaveBeenCalled();
  });

  it("never sends a credential value typed where an env var name belongs", async () => {
    render(<AuditSinks />);

    fireEvent.click(screen.getByRole("button", { name: "New sink" }));
    setText("Name", "Datadog EU");
    setText("Collector URL", "https://otel.example.com");
    fireEvent.click(screen.getByRole("button", { name: "Add header" }));
    setText("Header 1 name", "DD-API-KEY");
    setText("Header 1 env var", "dd0123456789abcdef");
    fireEvent.click(screen.getByRole("button", { name: "Create sink" }));

    expect(
      await screen.findByText(/must name an env var ending _AUDIT_SINK_SECRET/),
    ).toBeVisible();
    expect(mocks.ensureStepUp).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("refuses a TLS value in place of its env var on a syslog sink", async () => {
    render(<AuditSinks />);

    fireEvent.click(screen.getByRole("button", { name: "New sink" }));
    setText("Name", "Graylog");
    setText("Protocol", "syslog");
    setText("Host", "graylog.example.com");
    setText("Client key env var", "-----BEGIN PRIVATE KEY-----");
    fireEvent.click(screen.getByRole("button", { name: "Create sink" }));

    expect(
      await screen.findByText(/The client key env var must name an env var/),
    ).toBeVisible();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates a syslog sink and warns about plain TCP", async () => {
    render(<AuditSinks />);

    fireEvent.click(screen.getByRole("button", { name: "New sink" }));
    setText("Name", "Graylog");
    setText("Protocol", "syslog");
    setText("Host", "graylog.example.com");
    setText("Transport", "tcp");
    expect(
      screen.getByText(/Plain TCP is refused in production/),
    ).toBeVisible();
    setText("CA certificate env var", "GRAYLOG_CA_AUDIT_SINK_SECRET");
    fireEvent.click(screen.getByRole("button", { name: "Create sink" }));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        {
          name: "Graylog",
          enabled: true,
          settings: {
            kind: "syslog",
            host: "graylog.example.com",
            port: 6514,
            transport: "tcp",
            appName: "seamless-auth",
            facility: 10,
            tlsCaEnv: "GRAYLOG_CA_AUDIT_SINK_SECRET",
          },
        },
        expect.anything(),
      ),
    );
  });

  it("edits a sink keeping its env var names, and shows a refusal", async () => {
    mocks.update.mockImplementation((_request, options) =>
      options.onError(
        new ApiError(
          "Request failed schema validation.",
          400,
          "invalid_request",
          {
            issues: [
              { path: ["settings", "endpoint"], message: "must use https" },
            ],
          },
        ),
      ),
    );
    render(<AuditSinks />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Datadog" }));
    expect(screen.getByDisplayValue("DD_AUDIT_SINK_SECRET")).toBeVisible();
    setText("Service name", "auth-prod");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(
        {
          id: datadog.id,
          changes: {
            name: "Datadog",
            settings: {
              ...datadog.settings,
              serviceName: "auth-prod",
            },
          },
        },
        expect.anything(),
      ),
    );
    expect(
      await screen.findByText(/settings\.endpoint: must use https/),
    ).toBeVisible();
  });

  it("tests, toggles and deletes", async () => {
    mocks.test.mockImplementation((_id, options) =>
      options.onSuccess({
        ok: false,
        failure: "refused",
        statusCode: null,
        durationMs: 2,
      }),
    );
    render(<AuditSinks />);

    fireEvent.click(screen.getByRole("button", { name: "Send test Datadog" }));
    expect(
      await screen.findByText("The test record to Datadog failed"),
    ).toBeVisible();
    expect(screen.getByText(/does not move the stream/)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Turn on Splunk" }));
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(
        { id: splunk.id, changes: { enabled: true } },
        expect.anything(),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Splunk" }));
    await waitFor(() =>
      expect(mocks.remove).toHaveBeenCalledWith(splunk.id, expect.anything()),
    );
  });

  it("does not write when step-up is refused", async () => {
    mocks.ensureStepUp.mockResolvedValue(false);
    render(<AuditSinks />);

    fireEvent.click(screen.getByRole("button", { name: "Send test Datadog" }));
    fireEvent.click(screen.getByRole("button", { name: "Turn off Datadog" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Datadog" }));

    await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalledTimes(3));
    expect(mocks.test).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("hides write controls from a read-only admin", () => {
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: false,
    });
    render(<AuditSinks />);

    expect(screen.getByText("Read-only access")).toBeVisible();
    expect(screen.queryByRole("button", { name: "New sink" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Send test / })).toBeNull();
  });

  it("says the API needs upgrading on a 404", () => {
    mocks.useAuditSinks.mockReturnValue({
      isError: true,
      error: new ApiError("Not found", 404),
    });
    render(<AuditSinks />);

    expect(screen.getByText("Needs Seamless Auth API v0.23")).toBeVisible();
  });

  it("shows a skeleton and a load failure", () => {
    mocks.useAuditSinks.mockReturnValue({ isLoading: true });
    const { unmount } = render(<AuditSinks />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    unmount();

    const refetch = vi.fn();
    mocks.useAuditSinks.mockReturnValue({
      isError: true,
      error: new ApiError("The API had a problem", 500),
      refetch,
    });
    render(<AuditSinks />);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });
});
