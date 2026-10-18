/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MagicLinkVerification from "./MagicLinkVerification";

const mocks = vi.hoisted(() => ({
  auth: {
    markSignedIn: vi.fn(),
    refreshSession: vi.fn(),
  },
  client: {
    verifyMagicLink: vi.fn(),
    confirmMagicLink: vi.fn(),
  },
}));

vi.mock("@seamless-auth/react", () => ({
  useAuth: () => mocks.auth,
  useAuthClient: () => mocks.client,
}));

class MockBroadcastChannel {
  close = vi.fn();
  postMessage = vi.fn();
}

describe("MagicLinkVerification", () => {
  beforeEach(() => {
    mocks.auth.markSignedIn.mockReset();
    mocks.auth.refreshSession.mockReset();
    mocks.auth.refreshSession.mockResolvedValue(undefined);
    mocks.client.verifyMagicLink.mockReset();
    mocks.client.confirmMagicLink.mockReset();

    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("verifies the token and refreshes the session", async () => {
    mocks.client.verifyMagicLink.mockResolvedValue(new Response(null));

    render(
      <MemoryRouter initialEntries={["/verify-magiclink?token=abc123"]}>
        <Routes>
          <Route path="/verify-magiclink" element={<MagicLinkVerification />} />
          <Route path="/" element={<div>Dashboard destination</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // The component awaits refreshSession before navigating, so waiting only for
    // verifyMagicLink to be called leaves the redirect still pending. Wait for
    // the destination itself, then assert the steps that must precede it.
    expect(
      await screen.findByText("Dashboard destination"),
    ).toBeInTheDocument();

    expect(mocks.client.verifyMagicLink).toHaveBeenCalledWith("abc123");
    expect(mocks.auth.markSignedIn).toHaveBeenCalled();
    expect(mocks.auth.refreshSession).toHaveBeenCalled();
  });

  it("offers a way back to sign in when verification fails", async () => {
    mocks.client.verifyMagicLink.mockResolvedValue({
      data: null,
      error: new Error("expired"),
    });

    render(
      <MemoryRouter initialEntries={["/verify-magiclink?token=stale"]}>
        <Routes>
          <Route path="/verify-magiclink" element={<MagicLinkVerification />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // The screen used to show the failure and nothing else, so a stale link was
    // a dead end escapable only by editing the URL.
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Magic-link verification failed.");
    expect(alert).toHaveTextContent("may have expired or already been used");

    fireEvent.click(screen.getByRole("button", { name: "Back to sign in" }));
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });

  const confirmationRequired = {
    data: null,
    error: Object.assign(new Error("confirmation_required"), {
      status: 409,
      body: {
        error: "confirmation_required",
        message: "Confirm",
        requestedFrom: {
          deviceClass: "windows",
          requestedAt: "2026-10-18T12:00:00.000Z",
        },
      },
    }),
  };

  function renderAt(token: string) {
    render(
      <MemoryRouter initialEntries={[`/verify-magiclink?token=${token}`]}>
        <Routes>
          <Route path="/verify-magiclink" element={<MagicLinkVerification />} />
          <Route path="/" element={<div>Dashboard destination</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("asks before signing in a device that requested the link elsewhere", async () => {
    mocks.client.verifyMagicLink.mockResolvedValue(confirmationRequired);

    renderAt("abc123");

    expect(
      await screen.findByRole("heading", { name: "Confirm this sign-in" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/requested from a Windows PC/)).toBeInTheDocument();
    expect(mocks.auth.markSignedIn).not.toHaveBeenCalled();
    expect(mocks.auth.refreshSession).not.toHaveBeenCalled();
  });

  it("confirms the link and sends the reader back to the other device", async () => {
    mocks.client.verifyMagicLink.mockResolvedValue(confirmationRequired);
    mocks.client.confirmMagicLink.mockResolvedValue({
      data: { message: "Success" },
      error: null,
    });

    renderAt("abc123");
    fireEvent.click(
      await screen.findByRole("button", { name: "Yes, sign in that device" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Return to your other device",
    );
    expect(mocks.client.confirmMagicLink).toHaveBeenCalledWith("abc123");
    expect(mocks.auth.markSignedIn).not.toHaveBeenCalled();
  });

  it("keeps the choice open when the confirmation is refused", async () => {
    mocks.client.verifyMagicLink.mockResolvedValue(confirmationRequired);
    mocks.client.confirmMagicLink.mockResolvedValue({
      data: null,
      error: new Error("used"),
    });

    renderAt("abc123");
    fireEvent.click(
      await screen.findByRole("button", { name: "Yes, sign in that device" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "could not be approved",
    );
    expect(
      screen.getByRole("button", { name: "Yes, sign in that device" }),
    ).toBeEnabled();
  });

  it("signs nothing in when the reader declines", async () => {
    mocks.client.verifyMagicLink.mockResolvedValue(confirmationRequired);

    renderAt("abc123");
    fireEvent.click(
      await screen.findByRole("button", { name: "No, this wasn't me" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "No one was signed in",
    );
    expect(mocks.client.confirmMagicLink).not.toHaveBeenCalled();
  });
});
