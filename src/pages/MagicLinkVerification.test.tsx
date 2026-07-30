/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
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
});
