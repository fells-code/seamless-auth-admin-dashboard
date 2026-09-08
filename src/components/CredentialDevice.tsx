/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

/**
 * Names a credential in a table cell. The device type alone repeats across
 * every passkey registered from the same machine, so the name the user set
 * leads and the device type falls back to being the whole cell without it.
 */
export default function CredentialDevice({
  friendlyName,
  deviceType,
}: {
  friendlyName?: string | null;
  deviceType?: string | null;
}) {
  const device = deviceType ?? "Unknown device";
  const name = friendlyName?.trim();

  if (!name) {
    return <span className="text-sm text-primary">{device}</span>;
  }

  return (
    <div className="flex flex-col">
      <span className="text-sm text-primary">{name}</span>
      <span className="text-xs text-muted">{device}</span>
    </div>
  );
}
