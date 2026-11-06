/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { ApiError } from "./api";
import { getErrorMessage } from "./errorMessage";

/** An API older than v0.23 has no permission routes, and answers 404 on them. */
export function isRouteMissing(error: unknown) {
  return error instanceof ApiError && error.status === 404;
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function grantingRoles(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item: { kind?: unknown; name?: unknown }) =>
    typeof item?.name === "string" && typeof item?.kind === "string"
      ? [`${item.kind} role ${item.name}`]
      : [],
  );
}

/**
 * The role and permission refusals name what stood in the way in `details`.
 * Without them an operator is told a delete failed but not what to change first.
 */
export function describeRefusal(error: unknown) {
  const message = getErrorMessage(error);

  if (
    !(error instanceof ApiError) ||
    typeof error.details !== "object" ||
    error.details === null
  ) {
    return message;
  }

  const details = error.details as Record<string, unknown>;

  const permissions = strings(details.permissions);
  if (permissions.length > 0) {
    return `${message}: ${permissions.join(", ")}. Add them to the permission catalogue first.`;
  }

  const granting = grantingRoles(details.roles);
  if (granting.length > 0) {
    return `${message}: ${granting.join(", ")}. Take it off these roles first.`;
  }

  const roles = strings(details.roles);
  if (roles.length > 0 && error.status === 403) {
    return `You may not change these roles: ${roles.join(", ")}. Only an owner or an instance admin:write can grant or remove owner, and any other manager can only grant a role whose permissions they hold.`;
  }
  if (roles.length > 0) {
    return `${message}: ${roles.join(", ")}. Add them to the organization role catalogue first.`;
  }

  if (typeof details.holders === "number") {
    return `${message}: ${details.holders} ${
      details.holders === 1 ? "membership holds" : "memberships hold"
    } it. Move those members to another role first.`;
  }

  return message;
}
