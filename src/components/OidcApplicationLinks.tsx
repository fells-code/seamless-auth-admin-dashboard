/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useId, useState } from "react";
import { Link2, Trash2 } from "lucide-react";
import Skeleton from "./Skeleton";
import { Section } from "./Section";
import { QueryErrorState, StateMessage } from "./StateMessage";
import {
  useAddOidcApplicationLink,
  useOidcApplicationLinks,
  useRemoveOidcApplicationLink,
} from "../hooks/useOidcApplications";
import { useStepUpGuard } from "../hooks/useStepUpGuard";
import { useToast } from "../hooks/useToast";
import { useConfirm } from "../hooks/useConfirm";
import { getErrorMessage } from "../lib/errorMessage";
import { isRouteMissing } from "../lib/roleRefusals";
import {
  linkCandidates,
  type OidcApplicationLink,
  type OidcApplicationView,
} from "../lib/oidcApplications";

export default function OidcApplicationLinks({
  app,
  applications,
  canWrite,
}: {
  app: OidcApplicationView;
  applications: OidcApplicationView[];
  canWrite: boolean;
}) {
  const linksQuery = useOidcApplicationLinks(app.id);
  const addLink = useAddOidcApplicationLink();
  const removeLink = useRemoveOidcApplicationLink();
  const ensureStepUp = useStepUpGuard();
  const toast = useToast();
  const confirm = useConfirm();
  const selectId = useId();
  const [choice, setChoice] = useState("");

  const byId = new Map(applications.map((other) => [other.id, other]));
  const nameOf = (id: string) => byId.get(id)?.name ?? id;

  const links = linksQuery.data?.links ?? [];
  const linkedFrom = linksQuery.data?.linkedFrom ?? [];
  const candidates = linkCandidates(
    app,
    applications,
    links.map((link) => link.linkedClientId),
  );
  const selected = candidates.some((other) => other.id === choice)
    ? choice
    : (candidates[0]?.id ?? "");

  const handleAdd = async () => {
    if (!canWrite || !selected) return;
    if (!(await ensureStepUp())) return;

    addLink.mutate(
      { clientId: app.id, linkedClientId: selected },
      {
        onSuccess: () => {
          setChoice("");
          toast.success(
            "Link added",
            `${app.name} can now act for ${nameOf(selected)}.`,
          );
        },
        onError: (err) => toast.error("Link refused", getErrorMessage(err)),
      },
    );
  };

  const handleRemove = async (link: OidcApplicationLink) => {
    if (!canWrite) return;

    const acting = nameOf(link.clientId);
    const actedFor = nameOf(link.linkedClientId);
    if (
      !(await confirm({
        title: "Remove link",
        description: `Stop ${acting} acting for ${actedFor}? It can no longer send account notices to ${actedFor} users.`,
        confirmLabel: "Remove",
        tone: "danger",
      }))
    ) {
      return;
    }

    if (!(await ensureStepUp())) return;

    removeLink.mutate(
      { clientId: link.clientId, linkedClientId: link.linkedClientId },
      {
        onSuccess: () =>
          toast.success(
            "Link removed",
            `${acting} no longer acts for ${actedFor}.`,
          ),
        onError: (err) =>
          toast.error("Link removal failed", getErrorMessage(err)),
      },
    );
  };

  const renderList = (
    label: string,
    items: OidcApplicationLink[],
    otherEnd: (link: OidcApplicationLink) => string,
  ) => (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-[0.18em] text-muted">
        {label}
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-muted">None</div>
      ) : (
        <ul className="space-y-2" aria-label={label}>
          {items.map((link) => {
            const id = otherEnd(link);
            const other = byId.get(id);
            return (
              <li
                key={`${link.clientId}:${link.linkedClientId}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-subtle bg-surface-alt px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="font-medium text-primary">{nameOf(id)}</span>{" "}
                  <span className="break-all font-mono text-xs text-muted">
                    {id}
                  </span>
                  {other?.disabled && (
                    <span className="ml-2 text-xs text-muted">
                      Disabled, so the link has no effect
                    </span>
                  )}
                </span>
                {canWrite && (
                  <button
                    type="button"
                    className="btn btn-secondary inline-flex items-center gap-1"
                    aria-label={`Remove link with ${nameOf(id)}`}
                    disabled={removeLink.isPending}
                    onClick={() => void handleRemove(link)}
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  let body;
  if (linksQuery.isLoading) {
    body = <Skeleton className="h-24 rounded-2xl" />;
  } else if (isRouteMissing(linksQuery.error)) {
    body = (
      <StateMessage
        tone="warning"
        title="Needs Seamless Auth API v0.23"
        description="The API answered 404 for application links. Upgrade the API to v0.23 or later. If this console reaches the API through a server adapter, update the adapter too so it forwards these routes."
      />
    );
  } else if (linksQuery.isError) {
    body = (
      <QueryErrorState
        title="Could not load links"
        error={linksQuery.error}
        onRetry={() => void linksQuery.refetch()}
      />
    );
  } else {
    body = (
      <div className="space-y-4">
        {app.clientType === "confidential" ? (
          <>
            {renderList("Acts for", links, (link) => link.linkedClientId)}
            {canWrite &&
              (candidates.length === 0 ? (
                <p className="text-sm text-muted">
                  No public application to link.{" "}
                  {app.firstParty ? "First-party" : "Third-party"} applications
                  link only to {app.firstParty ? "first-party" : "third-party"}{" "}
                  public applications.
                </p>
              ) : (
                <div className="flex flex-wrap items-end gap-2">
                  <label htmlFor={selectId} className="sr-only">
                    Application to act for
                  </label>
                  <select
                    id={selectId}
                    value={selected}
                    onChange={(event) => setChoice(event.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm"
                  >
                    {candidates.map((other) => (
                      <option key={other.id} value={other.id}>
                        {other.name} ({other.id})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-primary inline-flex items-center gap-2"
                    disabled={addLink.isPending}
                    onClick={() => void handleAdd()}
                  >
                    <Link2 size={16} />
                    Add link
                  </button>
                </div>
              ))}
          </>
        ) : (
          <>
            {renderList("Acted for by", linkedFrom, (link) => link.clientId)}
            {canWrite && (
              <p className="text-sm text-muted">
                Links are added from the confidential application that acts.
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <Section
      title="Links"
      description={
        app.clientType === "confidential"
          ? `The public applications ${app.name} acts for. A link lets it send account notices to their users, named as that application.`
          : `The confidential applications that act for ${app.name}. Each can send account notices to its users, named as ${app.name}.`
      }
    >
      {body}
    </Section>
  );
}
