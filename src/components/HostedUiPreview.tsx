/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { type CSSProperties, type ReactNode, useId } from "react";
import type { HostedUiColors } from "../lib/hostedUi";

type PreviewProps = {
  appName: string;
  logoUrl: string | null;
  colors: HostedUiColors;
  fontFamily: string;
};

/**
 * A static stand-in for the provider's hosted pages. Nothing in it is
 * interactive, so it carries no focusable controls, only the text a reader
 * would see on the real pages.
 */
export default function HostedUiPreview(props: PreviewProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <PreviewFrame caption="Sign-in page preview" {...props}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          Sign in to {props.appName}
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: props.colors.muted }}>
          Use your passkey, or get a one-time code by email.
        </p>
        <div style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Email</span>
          <span
            style={{
              border: `1px solid ${props.colors.muted}`,
              borderRadius: 6,
              padding: "6px 8px",
              fontSize: 13,
              color: props.colors.muted,
            }}
          >
            you@example.com
          </span>
        </div>
        <MockButton colors={props.colors}>Continue</MockButton>
        <span
          style={{
            fontSize: 13,
            color: props.colors.primary,
            textDecoration: "underline",
          }}
        >
          Use a different method
        </span>
      </PreviewFrame>

      <PreviewFrame caption="Consent page preview" {...props}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          Example App wants to access your account
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: props.colors.muted }}>
          Signed in to {props.appName} as you@example.com
        </p>
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            fontSize: 13,
            display: "grid",
            gap: 4,
          }}
        >
          <li>Know who you are</li>
          <li>See your email address</li>
          <li>Stay signed in</li>
        </ul>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <MockButton colors={props.colors}>Allow</MockButton>
          <span
            style={{
              border: `1px solid ${props.colors.muted}`,
              borderRadius: 6,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Deny
          </span>
        </div>
      </PreviewFrame>
    </div>
  );
}

function PreviewFrame({
  caption,
  appName,
  logoUrl,
  colors,
  fontFamily,
  children,
}: PreviewProps & { caption: string; children: ReactNode }) {
  const captionId = useId();
  const page: CSSProperties = {
    background: colors.background,
    color: colors.text,
    fontFamily,
    padding: 20,
    borderRadius: 12,
  };
  const card: CSSProperties = {
    background: colors.surface,
    borderRadius: 10,
    padding: 18,
    display: "grid",
    gap: 12,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12)",
  };

  return (
    <figure className="m-0 space-y-2" aria-labelledby={captionId}>
      <figcaption
        id={captionId}
        className="text-xs uppercase tracking-[0.18em] text-muted"
      >
        {caption}
      </figcaption>
      <div style={page} className="border border-subtle">
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${appName} logo`}
                referrerPolicy="no-referrer"
                style={{ maxHeight: 28, maxWidth: 120, objectFit: "contain" }}
              />
            ) : (
              <span style={{ fontWeight: 700 }}>{appName}</span>
            )}
          </div>
          {children}
        </div>
      </div>
    </figure>
  );
}

function MockButton({
  colors,
  children,
}: {
  colors: HostedUiColors;
  children: ReactNode;
}) {
  return (
    <span
      style={{
        background: colors.primary,
        color: colors.onPrimary,
        borderRadius: 6,
        padding: "6px 14px",
        fontSize: 13,
        fontWeight: 600,
        justifySelf: "start",
      }}
    >
      {children}
    </span>
  );
}
