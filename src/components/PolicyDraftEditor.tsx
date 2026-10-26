/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type {
  AccountRecoveryPolicy,
  AuthenticatorPolicy,
  LockoutPolicy,
  PolicyDocument,
  RecoveryCodesPolicy,
} from "@seamless-auth/types";
import {
  AaguidListEditor,
  CheckboxField,
  Input,
  LoginMethodSelector,
  NumberInput,
  Select,
} from "./ConfigFields";
import {
  ATTACHMENT_OPTIONS,
  ATTESTATION_OPTIONS,
  AUTHENTICATOR_POLICY_FALLBACK,
  SYNCED_PASSKEY_OPTIONS,
  USER_VERIFICATION_OPTIONS,
} from "../lib/configFields";

function Group({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-subtle p-4">
      <legend className="px-1 text-sm font-medium text-primary">{title}</legend>
      <p className="text-sm text-muted">{description}</p>
      {children}
    </fieldset>
  );
}

export default function PolicyDraftEditor({
  value,
  onChange,
  disabled,
}: {
  value: PolicyDocument;
  onChange: (next: PolicyDocument) => void;
  disabled?: boolean;
}) {
  const canWrite = !disabled;
  const set = <K extends keyof PolicyDocument>(
    key: K,
    next: PolicyDocument[K],
  ) => onChange({ ...value, [key]: next });

  const authenticator: AuthenticatorPolicy = {
    ...AUTHENTICATOR_POLICY_FALLBACK,
    ...value.authenticator_policy,
  };
  const setAuthenticator = (patch: Partial<AuthenticatorPolicy>) =>
    set("authenticator_policy", { ...authenticator, ...patch });
  const setLockout = (patch: Partial<LockoutPolicy>) =>
    set("lockout_policy", { ...value.lockout_policy, ...patch });
  const setRecoveryCodes = (patch: Partial<RecoveryCodesPolicy>) =>
    set("recovery_codes", { ...value.recovery_codes, ...patch });
  const setAccountRecovery = (patch: Partial<AccountRecoveryPolicy>) =>
    set("account_recovery", { ...value.account_recovery, ...patch });

  return (
    <div className="space-y-5">
      <Group
        title="Login methods"
        description="Which methods can sign an account in."
      >
        <CheckboxField
          label="Phishing-resistant only"
          description="Accept passkeys only, for every account. Email and phone codes, magic links, TOTP and OAuth are refused whatever is selected below."
          checked={value.phishing_resistant_only}
          onChange={(checked) => set("phishing_resistant_only", checked)}
          disabled={disabled}
        />
        <LoginMethodSelector
          value={value.login_methods}
          onChange={(next) => set("login_methods", next)}
          canWrite={canWrite}
        />
        <CheckboxField
          label="Passkey Login Fallback"
          description="Allow configured fallback methods when passkey login cannot be completed."
          checked={value.passkey_login_fallback_enabled}
          onChange={(checked) => set("passkey_login_fallback_enabled", checked)}
          disabled={disabled}
        />
        <CheckboxField
          label="Prompt for passkey enrollment"
          description="After an email or phone code or magic link sign-in, users without a passkey are sent to add one."
          checked={value.prompt_passkey_enrollment}
          onChange={(checked) => set("prompt_passkey_enrollment", checked)}
          disabled={disabled}
        />
      </Group>

      <Group
        title="Lockout policy"
        description="How many failed attempts lock an identified account, and for how long."
      >
        <CheckboxField
          label="Lockout Enabled"
          description="Lock an identified account after repeated failed sign-in attempts."
          checked={value.lockout_policy.enabled}
          onChange={(checked) => setLockout({ enabled: checked })}
          disabled={disabled}
        />
        <div className="grid gap-4 md:grid-cols-3">
          <NumberInput
            label="Max Failures"
            value={value.lockout_policy.maxFailures}
            onChange={(next) => setLockout({ maxFailures: next })}
            disabled={disabled}
          />
          <NumberInput
            label="Window Seconds"
            value={value.lockout_policy.windowSeconds}
            onChange={(next) => setLockout({ windowSeconds: next })}
            disabled={disabled}
          />
          <NumberInput
            label="Lockout Seconds"
            value={value.lockout_policy.lockoutSeconds}
            onChange={(next) => setLockout({ lockoutSeconds: next })}
            disabled={disabled}
          />
        </div>
      </Group>

      <Group
        title="Authenticator policy"
        description="Which authenticators may enroll. These rules apply when a passkey is registered, not when it signs in."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Synced Passkeys"
            value={authenticator.syncedPasskeys}
            options={SYNCED_PASSKEY_OPTIONS}
            onChange={(next) => setAuthenticator({ syncedPasskeys: next })}
            disabled={disabled}
          />
          <Select
            label="Attachment"
            value={authenticator.attachment}
            options={ATTACHMENT_OPTIONS}
            onChange={(next) => setAuthenticator({ attachment: next })}
            disabled={disabled}
          />
          <Select
            label="User Verification"
            value={authenticator.userVerification}
            options={USER_VERIFICATION_OPTIONS}
            onChange={(next) => setAuthenticator({ userVerification: next })}
            disabled={disabled}
          />
          <Select
            label="Attestation"
            value={authenticator.attestation}
            options={ATTESTATION_OPTIONS}
            helperText="Takes effect only after the API restarts."
            onChange={(next) => setAuthenticator({ attestation: next })}
            disabled={disabled}
          />
        </div>
        <CheckboxField
          label="Require A Known Authenticator"
          description="Refuse any authenticator the FIDO Metadata Service does not list."
          checked={authenticator.requireKnownAuthenticator}
          onChange={(checked) =>
            setAuthenticator({ requireKnownAuthenticator: checked })
          }
          disabled={disabled}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <AaguidListEditor
            label="AAGUID Allow List"
            helperText="Empty means no restriction."
            aaguids={authenticator.aaguidAllowList}
            setAaguids={(next) => setAuthenticator({ aaguidAllowList: next })}
            canWrite={canWrite}
          />
          <AaguidListEditor
            label="AAGUID Deny List"
            helperText="Applied before the allow list."
            aaguids={authenticator.aaguidDenyList}
            setAaguids={(next) => setAuthenticator({ aaguidDenyList: next })}
            canWrite={canWrite}
          />
        </div>
      </Group>

      <Group
        title="Recovery"
        description="How an account gets back in after losing its factors."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <CheckboxField
            label="Recovery Codes"
            description="Let users generate and redeem one-time recovery codes."
            checked={value.recovery_codes.enabled}
            onChange={(checked) => setRecoveryCodes({ enabled: checked })}
            disabled={disabled}
          />
          <CheckboxField
            label="Require Codes At Enrollment"
            description="Ask for a set of codes as part of first passkey enrollment."
            checked={value.recovery_codes.requireAtEnrollment}
            onChange={(checked) =>
              setRecoveryCodes({ requireAtEnrollment: checked })
            }
            disabled={disabled}
          />
          <CheckboxField
            label="Account Recovery"
            description="Self-service recovery through a verified email or phone, completed after a delay the owner can cancel."
            checked={value.account_recovery.enabled}
            onChange={(checked) => setAccountRecovery({ enabled: checked })}
            disabled={disabled}
          />
          <Input
            label="Recovery Delay"
            value={value.account_recovery.delay}
            onChange={(next) => setAccountRecovery({ delay: next.trim() })}
            helperText="Between 1h and 30d, such as 24h."
            disabled={disabled}
          />
        </div>
      </Group>
    </div>
  );
}
