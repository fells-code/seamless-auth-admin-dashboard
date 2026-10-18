/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

/**
 * What the auth server says about a magic link opened on a device other than the one
 * that asked for it: `409 { error: "confirmation_required", requestedFrom }`. The link
 * is still unused, and confirming it signs the requesting device in, not this one.
 */
export interface MagicLinkConfirmation {
  deviceLabel: string;
  requestedAt: Date | null;
}

const DEVICE_LABELS: Record<string, string> = {
  ios: "an iPhone or iPad",
  android: "an Android device",
  macos: "a Mac",
  windows: "a Windows PC",
  linux: "a Linux computer",
  chromeos: "a Chromebook",
  bot: "an automated client",
};

export function getMagicLinkConfirmation(
  error: unknown,
): MagicLinkConfirmation | null {
  if (!error || typeof error !== "object") return null;

  const { status, body } = error as { status?: unknown; body?: unknown };
  if (status !== 409 || !body || typeof body !== "object") return null;

  const { error: code, requestedFrom } = body as {
    error?: unknown;
    requestedFrom?: { deviceClass?: unknown; requestedAt?: unknown };
  };
  if (code !== "confirmation_required") return null;

  const deviceClass =
    typeof requestedFrom?.deviceClass === "string"
      ? requestedFrom.deviceClass
      : "";
  const at =
    typeof requestedFrom?.requestedAt === "string"
      ? new Date(requestedFrom.requestedAt)
      : null;

  return {
    deviceLabel: DEVICE_LABELS[deviceClass] ?? "an unknown device",
    requestedAt: at && !Number.isNaN(at.getTime()) ? at : null,
  };
}
