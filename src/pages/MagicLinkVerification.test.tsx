/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, waitFor } from "@testing-library/react";
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

    await waitFor(() =>
      expect(mocks.client.verifyMagicLink).toHaveBeenCalledWith("abc123"),
    );
    expect(mocks.auth.markSignedIn).toHaveBeenCalled();
    expect(mocks.auth.refreshSession).toHaveBeenCalled();
    expect(screen.getByText("Dashboard destination")).toBeInTheDocument();
  });
});
