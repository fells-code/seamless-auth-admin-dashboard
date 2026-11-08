/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebhookDelivery, WebhookEndpoint } from "@seamless-auth/types";
import { ApiError } from "../lib/api";
import Webhooks from "./Webhooks";

const mocks = vi.hoisted(() => ({
  useWebhookEndpoints: vi.fn(),
  useWebhookDeliveries: vi.fn(),
  useWebhookDelivery: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  rotate: vi.fn(),
  test: vi.fn(),
  redeliver: vi.fn(),
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

vi.mock("../hooks/useWebhooks", () => ({
  useWebhookEndpoints: mocks.useWebhookEndpoints,
  useWebhookDeliveries: mocks.useWebhookDeliveries,
  useWebhookDelivery: mocks.useWebhookDelivery,
  useCreateWebhook: mutation(mocks.create),
  useUpdateWebhook: mutation(mocks.update),
  useDeleteWebhook: mutation(mocks.remove),
  useRotateWebhookSecret: mutation(mocks.rotate),
  useTestWebhook: mutation(mocks.test),
  useRedeliverWebhook: mutation(mocks.redeliver),
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

const SECRET = `whsec_${"A".repeat(43)}=`;

const live: WebhookEndpoint = {
  id: "11111111-1111-4111-8111-111111111111",
  url: "https://hooks.example.com/live",
  description: "CRM sync",
  eventTypes: ["user.created", "user.deleted"],
  enabled: true,
  disabledReason: null,
  version: 1,
  previousSecretExpiresAt: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

const failing: WebhookEndpoint = {
  ...live,
  id: "22222222-2222-4222-8222-222222222222",
  url: "https://old.example.com/hook",
  description: null,
  enabled: false,
  disabledReason: "failing",
};

const dead: WebhookDelivery = {
  id: "33333333-3333-4333-8333-333333333333",
  endpointId: live.id,
  eventType: "user.deleted",
  status: "dead",
  attempts: 8,
  nextAttemptAt: null,
  lastAttemptAt: "2026-11-01T00:00:00.000Z",
  lastStatusCode: 500,
  lastFailure: "http_status",
  createdAt: "2026-10-30T00:00:00.000Z",
};

const deadRow = `user.deleted ${dead.createdAt}`;

function renderWebhooks() {
  return render(<Webhooks />);
}

function lastDeliveryFilter() {
  return mocks.useWebhookDeliveries.mock.calls.at(-1)?.[0];
}

describe("Webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useWebhookEndpoints.mockReturnValue({
      data: { endpoints: [live, failing] },
      isLoading: false,
    });
    mocks.useWebhookDeliveries.mockReturnValue({
      data: { deliveries: [dead], nextCursor: "next-page" },
      isLoading: false,
    });
    mocks.useWebhookDelivery.mockReturnValue({ isLoading: true });
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: true,
    });
    mocks.ensureStepUp.mockResolvedValue(true);
    mocks.confirm.mockResolvedValue(true);
  });

  it("lists endpoints, why one is off, and the delivery log", () => {
    renderWebhooks();

    const endpoints = screen.getByRole("table", { name: "Webhook endpoints" });
    expect(endpoints).toHaveTextContent("CRM sync");
    expect(endpoints).toHaveTextContent(
      "Turned off after three days in which every delivery failed.",
    );

    const deliveries = screen.getByRole("table", {
      name: "Webhook deliveries",
    });
    expect(deliveries).toHaveTextContent("Dead letter");
    expect(deliveries).toHaveTextContent(live.url);
    expect(deliveries).toHaveTextContent("The destination answered HTTP 500.");
    expect(deliveries).toHaveTextContent("8");
  });

  it("explains delivery and verification", () => {
    renderWebhooks();

    expect(screen.getByText(/8 attempts over about 42 hours/)).toBeVisible();
    expect(screen.getByText(/more than 300 seconds/)).toBeVisible();
  });

  it("creates a webhook after step-up and shows its secret once", async () => {
    mocks.create.mockImplementation((_request, options) =>
      options.onSuccess({ endpoint: live, secret: SECRET }),
    );
    renderWebhooks();

    fireEvent.click(screen.getByRole("button", { name: "New webhook" }));
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://hooks.example.com/new" },
    });
    fireEvent.click(screen.getByRole("button", { name: "session.revoked" }));
    fireEvent.click(screen.getByRole("button", { name: "Create webhook" }));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        {
          url: "https://hooks.example.com/new",
          eventTypes: ["session.revoked"],
        },
        expect.anything(),
      ),
    );
    expect(mocks.ensureStepUp).toHaveBeenCalled();
    expect(screen.getByDisplayValue(SECRET)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByDisplayValue(SECRET)).toBeNull();
    expect(document.body.textContent).not.toContain(SECRET);
  });

  it("refuses an invalid webhook before step-up", async () => {
    renderWebhooks();

    fireEvent.click(screen.getByRole("button", { name: "New webhook" }));
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "ftp://hooks.example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create webhook" }));

    expect(await screen.findByText(/url: must use https/)).toBeVisible();
    expect(screen.getByText(/eventTypes/)).toBeVisible();
    expect(mocks.ensureStepUp).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("does not write when step-up is refused", async () => {
    mocks.ensureStepUp.mockResolvedValue(false);
    renderWebhooks();

    fireEvent.click(
      screen.getByRole("button", { name: `Send test ${live.url}` }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: `Turn on ${failing.url}` }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: `Redeliver ${deadRow}` }),
    );

    await waitFor(() => expect(mocks.ensureStepUp).toHaveBeenCalledTimes(3));
    expect(mocks.test).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.redeliver).not.toHaveBeenCalled();
  });

  it("sends only what changed on edit, and shows a refusal", async () => {
    mocks.update.mockImplementation((_request, options) =>
      options.onError(
        new ApiError(
          "Request failed schema validation.",
          400,
          "invalid_request",
          {
            issues: [{ path: ["url"], message: "must use https" }],
          },
        ),
      ),
    );
    renderWebhooks();

    fireEvent.click(screen.getByRole("button", { name: `Edit ${live.url}` }));
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(
        { id: live.id, changes: { description: null } },
        expect.anything(),
      ),
    );
    expect(
      await screen.findByText(
        "Request failed schema validation. url: must use https",
      ),
    ).toBeVisible();
  });

  it("turns a disabled endpoint back on", async () => {
    mocks.update.mockImplementation((_request, options) => options.onSuccess());
    renderWebhooks();

    fireEvent.click(
      screen.getByRole("button", { name: `Turn on ${failing.url}` }),
    );

    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(
        { id: failing.id, changes: { enabled: true } },
        expect.anything(),
      ),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Webhook turned on",
      expect.any(String),
    );
  });

  it("rotates a secret behind a confirmation and says the old one signs for 24 hours", async () => {
    mocks.rotate.mockImplementation((_id, options) =>
      options.onSuccess({
        secret: SECRET,
        previousSecretExpiresAt: "2026-11-08T00:00:00.000Z",
      }),
    );
    renderWebhooks();

    fireEvent.click(
      screen.getByRole("button", { name: `Rotate secret ${live.url}` }),
    );

    expect(await screen.findByDisplayValue(SECRET)).toBeVisible();
    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringMatching(/24 hours/),
      }),
    );
    expect(
      screen.getByText(/keeps signing beside this one for 24 hours/),
    ).toBeVisible();
  });

  it("does not rotate when the confirmation is declined", async () => {
    mocks.confirm.mockResolvedValue(false);
    renderWebhooks();

    fireEvent.click(
      screen.getByRole("button", { name: `Rotate secret ${live.url}` }),
    );

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.ensureStepUp).not.toHaveBeenCalled();
    expect(mocks.rotate).not.toHaveBeenCalled();
  });

  it("shows a test result", async () => {
    mocks.test.mockImplementation((_id, options) =>
      options.onSuccess({
        ok: true,
        failure: null,
        statusCode: 204,
        durationMs: 31,
      }),
    );
    renderWebhooks();

    fireEvent.click(
      screen.getByRole("button", { name: `Send test ${live.url}` }),
    );

    expect(
      await screen.findByText(`Test event delivered to ${live.url}`),
    ).toBeVisible();
    expect(screen.getByText("Answered HTTP 204 in 31 ms.")).toBeVisible();
  });

  it("deletes an endpoint behind a confirmation", async () => {
    renderWebhooks();

    fireEvent.click(screen.getByRole("button", { name: `Delete ${live.url}` }));

    await waitFor(() =>
      expect(mocks.remove).toHaveBeenCalledWith(live.id, expect.anything()),
    );
    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "danger" }),
    );
  });

  it("filters to the dead letter view and one endpoint, and pages by cursor", () => {
    renderWebhooks();

    fireEvent.click(screen.getByRole("tab", { name: "Dead letter" }));
    expect(lastDeliveryFilter()).toEqual({
      endpointId: undefined,
      status: "dead",
      cursor: undefined,
    });

    fireEvent.change(screen.getByLabelText("Delivery endpoint"), {
      target: { value: live.id },
    });
    fireEvent.click(screen.getByRole("button", { name: "Older" }));
    expect(lastDeliveryFilter()).toEqual({
      endpointId: live.id,
      status: "dead",
      cursor: "next-page",
    });

    fireEvent.click(screen.getByRole("button", { name: "Newer" }));
    expect(lastDeliveryFilter()?.cursor).toBeUndefined();
    expect(screen.getByRole("button", { name: "Newer" })).toBeDisabled();
  });

  it("opens an endpoint's deliveries from its row", () => {
    renderWebhooks();

    fireEvent.click(
      screen.getByRole("button", { name: `Deliveries ${failing.url}` }),
    );

    expect(lastDeliveryFilter()?.endpointId).toBe(failing.id);
  });

  it("disables Older on the last page", () => {
    mocks.useWebhookDeliveries.mockReturnValue({
      data: { deliveries: [dead], nextCursor: null },
      isLoading: false,
    });
    renderWebhooks();

    expect(screen.getByRole("button", { name: "Older" })).toBeDisabled();
  });

  it("redelivers, and reports a redelivery that failed again", async () => {
    mocks.redeliver.mockImplementationOnce((_id, options) =>
      options.onSuccess({ delivery: { ...dead, status: "succeeded" } }),
    );
    mocks.redeliver.mockImplementationOnce((_id, options) =>
      options.onSuccess({
        delivery: { ...dead, lastFailure: "timed_out", lastStatusCode: null },
      }),
    );
    renderWebhooks();

    fireEvent.click(
      screen.getByRole("button", { name: `Redeliver ${deadRow}` }),
    );
    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "Redelivered",
        expect.any(String),
      ),
    );

    fireEvent.click(
      screen.getByRole("button", { name: `Redeliver ${deadRow}` }),
    );
    expect(
      await screen.findByText("The destination did not answer in time."),
    ).toBeVisible();
  });

  it("shows the body of a delivery", () => {
    mocks.useWebhookDelivery.mockReturnValue({
      data: {
        delivery: {
          ...dead,
          event: {
            id: dead.id,
            type: "user.deleted",
            version: 1,
            timestamp: dead.createdAt,
            data: { userId: "user_42" },
          },
        },
      },
    });
    renderWebhooks();

    fireEvent.click(screen.getByRole("button", { name: `View ${deadRow}` }));

    expect(screen.getByLabelText("Event body")).toHaveTextContent("user_42");
    expect(mocks.useWebhookDelivery).toHaveBeenLastCalledWith(dead.id);
  });

  it("hides write controls from a read-only admin", () => {
    mocks.useAdminPermissions.mockReturnValue({
      canRead: true,
      canWrite: false,
    });
    renderWebhooks();

    expect(screen.getByText("Read-only access")).toBeVisible();
    expect(screen.queryByRole("button", { name: "New webhook" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Redeliver / })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /^Rotate secret / }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: `Deliveries ${live.url}` }),
    ).toBeVisible();
  });

  it("says the API needs upgrading on a 404", () => {
    mocks.useWebhookEndpoints.mockReturnValue({
      isError: true,
      error: new ApiError("Not found", 404),
    });
    renderWebhooks();

    expect(screen.getByText("Needs Seamless Auth API v0.23")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("shows a skeleton and a load failure", () => {
    mocks.useWebhookEndpoints.mockReturnValue({ isLoading: true });
    const { unmount } = renderWebhooks();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    unmount();

    const refetch = vi.fn();
    mocks.useWebhookEndpoints.mockReturnValue({
      isError: true,
      error: new ApiError("The API had a problem", 500),
      refetch,
    });
    renderWebhooks();

    expect(screen.getByText("Could not load webhooks")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });
});
