/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { webcrypto } from "node:crypto";
import type { CDPSession, Page } from "@playwright/test";

export type PasskeyInput = {
  /** Must be a registrable domain. An IP address is not a valid RP ID. */
  rpId: string;
  credentialId?: string;
  userHandle?: string;
};

export type VirtualAuthenticator = {
  /** Enrols a discoverable credential, so a passkey login has one to assert. */
  addPasskey(input: PasskeyInput): Promise<{ credentialId: string }>;
  /** Whether a subsequent ceremony should succeed. */
  setUserVerified(verified: boolean): Promise<void>;
  /** Makes the next ceremony fail the way a dismissed prompt does. */
  setAutomaticPresence(enabled: boolean): Promise<void>;
  credentials(): Promise<{ credentialId: string }[]>;
  dispose(): Promise<void>;
};

/**
 * A CDP virtual authenticator, so passkey and step-up ceremonies run headless
 * and deterministically.
 *
 * `hasResidentKey` and `isUserVerified` are what a platform authenticator with
 * a biometric reports, which is the case the dashboard's passkey-first sign-in
 * is built around.
 */
export async function createVirtualAuthenticator(
  page: Page,
): Promise<VirtualAuthenticator> {
  const client: CDPSession = await page.context().newCDPSession(page);

  await client.send("WebAuthn.enable", { enableUI: false });

  const { authenticatorId } = await client.send(
    "WebAuthn.addVirtualAuthenticator",
    {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    },
  );

  return {
    async addPasskey({
      rpId,
      credentialId = "seamless-e2e-credential",
      userHandle = "user_admin",
    }: PasskeyInput) {
      // Generated per test rather than pinned as a constant, so no private key
      // material lives in the repository.
      const keyPair = await webcrypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"],
      );
      const pkcs8 = await webcrypto.subtle.exportKey(
        "pkcs8",
        keyPair.privateKey,
      );

      const encodedCredentialId = Buffer.from(credentialId).toString("base64");

      await client.send("WebAuthn.addCredential", {
        authenticatorId,
        credential: {
          credentialId: encodedCredentialId,
          isResidentCredential: true,
          rpId,
          privateKey: Buffer.from(pkcs8).toString("base64"),
          userHandle: Buffer.from(userHandle).toString("base64"),
          signCount: 0,
        },
      });

      return { credentialId: encodedCredentialId };
    },
    async setUserVerified(verified: boolean) {
      await client.send("WebAuthn.setUserVerified", {
        authenticatorId,
        isUserVerified: verified,
      });
    },
    async setAutomaticPresence(enabled: boolean) {
      await client.send("WebAuthn.setAutomaticPresenceSimulation", {
        authenticatorId,
        enabled,
      });
    },
    async credentials() {
      const { credentials } = await client.send("WebAuthn.getCredentials", {
        authenticatorId,
      });

      return credentials.map((credential) => ({
        credentialId: credential.credentialId,
      }));
    },
    async dispose() {
      await client
        .send("WebAuthn.removeVirtualAuthenticator", { authenticatorId })
        .catch(() => undefined);
      await client.detach().catch(() => undefined);
    },
  };
}
