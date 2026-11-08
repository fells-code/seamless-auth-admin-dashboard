/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  CalloutTestResponse,
  CreateWebhookEndpointRequest,
  MessageResponse,
  UpdateWebhookEndpointRequest,
  WebhookDeliveryListResponse,
  WebhookDeliveryResponse,
  WebhookDeliveryStatus,
  WebhookEndpointCreatedResponse,
  WebhookEndpointListResponse,
  WebhookEndpointResponse,
  WebhookSecretRotatedResponse,
} from "@seamless-auth/types";
import { apiFetch } from "../lib/api";
import { retryUnlessMissing } from "../lib/callouts";

const segment = encodeURIComponent;

export const DELIVERY_PAGE_SIZE = 25;

export type DeliveryFilter = {
  endpointId?: string;
  status?: WebhookDeliveryStatus;
  cursor?: string;
};

export function useWebhookEndpoints() {
  return useQuery({
    queryKey: ["webhooks"],
    queryFn: () => apiFetch<WebhookEndpointListResponse>("/admin/webhooks"),
    retry: retryUnlessMissing,
  });
}

export function useWebhookDeliveries(filter: DeliveryFilter) {
  return useQuery({
    queryKey: ["webhook-deliveries", filter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(DELIVERY_PAGE_SIZE) });
      if (filter.endpointId) params.set("endpointId", filter.endpointId);
      if (filter.status) params.set("status", filter.status);
      if (filter.cursor) params.set("cursor", filter.cursor);

      return apiFetch<WebhookDeliveryListResponse>(
        `/admin/webhook-deliveries?${params}`,
      );
    },
    placeholderData: keepPreviousData,
    retry: retryUnlessMissing,
  });
}

export function useWebhookDelivery(deliveryId: string | null) {
  return useQuery({
    queryKey: ["webhook-delivery", deliveryId],
    queryFn: () =>
      apiFetch<WebhookDeliveryResponse>(
        `/admin/webhook-deliveries/${segment(deliveryId!)}`,
      ),
    enabled: Boolean(deliveryId),
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();

  return useMutation<
    WebhookEndpointCreatedResponse,
    Error,
    CreateWebhookEndpointRequest
  >({
    mutationFn: (data) =>
      apiFetch<WebhookEndpointCreatedResponse>("/admin/webhooks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useUpdateWebhook() {
  const qc = useQueryClient();

  return useMutation<
    WebhookEndpointResponse,
    Error,
    { id: string; changes: UpdateWebhookEndpointRequest }
  >({
    mutationFn: ({ id, changes }) =>
      apiFetch<WebhookEndpointResponse>(`/admin/webhooks/${segment(id)}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();

  return useMutation<MessageResponse, Error, string>({
    mutationFn: (id) =>
      apiFetch<MessageResponse>(`/admin/webhooks/${segment(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
      // Deleting an endpoint deletes its delivery history too.
      qc.invalidateQueries({ queryKey: ["webhook-deliveries"] });
    },
  });
}

export function useRotateWebhookSecret() {
  const qc = useQueryClient();

  return useMutation<WebhookSecretRotatedResponse, Error, string>({
    mutationFn: (id) =>
      apiFetch<WebhookSecretRotatedResponse>(
        `/admin/webhooks/${segment(id)}/secret`,
        { method: "POST" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useTestWebhook() {
  const qc = useQueryClient();

  return useMutation<CalloutTestResponse, Error, string>({
    mutationFn: (id) =>
      apiFetch<CalloutTestResponse>(`/admin/webhooks/${segment(id)}/test`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhook-deliveries"] });
    },
  });
}

export function useRedeliverWebhook() {
  const qc = useQueryClient();

  return useMutation<WebhookDeliveryResponse, Error, string>({
    mutationFn: (deliveryId) =>
      apiFetch<WebhookDeliveryResponse>(
        `/admin/webhook-deliveries/${segment(deliveryId)}/redeliver`,
        { method: "POST" },
      ),
    onSuccess: (_data, deliveryId) => {
      qc.invalidateQueries({ queryKey: ["webhook-deliveries"] });
      qc.invalidateQueries({ queryKey: ["webhook-delivery", deliveryId] });
    },
  });
}
