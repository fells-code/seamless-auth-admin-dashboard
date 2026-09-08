/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CredentialDevice from "./CredentialDevice";

describe("CredentialDevice", () => {
  it("leads with the friendly name and keeps the device type beneath it", () => {
    const { container } = render(
      <CredentialDevice
        friendlyName="Work MacBook"
        deviceType="singleDevice"
      />,
    );

    expect(container).toHaveTextContent(/^Work MacBooksingleDevice$/);
    expect(screen.getByText("singleDevice")).toHaveClass("text-muted");
  });

  it("falls back to the device type when no friendly name is set", () => {
    const { container } = render(
      <CredentialDevice friendlyName={null} deviceType="multiDevice" />,
    );

    expect(container).toHaveTextContent(/^multiDevice$/);
  });

  it("treats a blank friendly name as unset", () => {
    const { container } = render(
      <CredentialDevice friendlyName="   " deviceType="multiDevice" />,
    );

    expect(container).toHaveTextContent(/^multiDevice$/);
  });

  it("names a credential the API described neither way", () => {
    render(<CredentialDevice />);

    expect(screen.getByText("Unknown device")).toBeInTheDocument();
  });
});
