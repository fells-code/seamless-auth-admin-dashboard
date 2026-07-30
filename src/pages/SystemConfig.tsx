/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useId, useMemo, useState } from "react";
import { KeyRound, ShieldCheck, TimerReset, Waypoints } from "lucide-react";
import { useSystemConfig } from "../hooks/useSystemConfig";
import type {
  LoginMethod,
  OAuthProviderConfig,
  SystemConfig,
} from "@seamless-auth/types";
import { useUpdateSystemConfig } from "../hooks/useUpdateSystemConfig";
import { useOAuthProviders } from "../hooks/useOAuthProviders";
import { useAdminPermissions } from "../hooks/useAdminPermissions";
import { useStepUpGuard } from "../hooks/useStepUpGuard";
import { useToast } from "../hooks/useToast";
import { useConfirm } from "../hooks/useConfirm";
import Skeleton from "../components/Skeleton";
import RemovableChips from "../components/RemovableChips";
import RoleChips from "../components/RoleChips";
import { Section } from "../components/Section";
import StatCard from "../components/StatCard";
import {
  QueryErrorState,
  ReadOnlyNotice,
  StateMessage,
} from "../components/StateMessage";
import { getErrorMessage } from "../lib/errorMessage";

const LOGIN_METHOD_OPTIONS: {
  value: LoginMethod;
  label: string;
  description: string;
}[] = [
  {
    value: "passkey",
    label: "Passkeys",
    description:
      "WebAuthn passkey login for users with registered credentials.",
  },
  {
    value: "magic_link",
    label: "Magic Links",
    description: "Email sign-in links for passwordless login fallback.",
  },
  {
    value: "email_otp",
    label: "Email OTP",
    description: "One-time email codes after login initiation.",
  },
  {
    value: "phone_otp",
    label: "SMS OTP",
    description: "One-time SMS codes after login initiation.",
  },
  {
    value: "oauth",
    label: "OAuth",
    description: "External identity providers such as Google or GitHub.",
  },
];

// The provider schema types authorizationUrl, tokenUrl, userInfoUrl, and both
// redirect fields as URLs, so a blank or malformed value is rejected by the API
// rather than by anything the operator can see. Validate here instead.
function isAbsoluteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const PROVIDER_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type ProviderFieldErrors = Partial<Record<keyof OAuthProviderConfig, string>>;

function validateProvider(
  draft: OAuthProviderConfig,
  { isNew, existingIds }: { isNew: boolean; existingIds: string[] },
): ProviderFieldErrors {
  const errors: ProviderFieldErrors = {};

  if (!draft.id.trim()) {
    errors.id = "A provider ID is required.";
  } else if (!PROVIDER_ID_PATTERN.test(draft.id.trim())) {
    errors.id = "Use lowercase kebab-case, such as google or azure-ad.";
  } else if (isNew && existingIds.includes(draft.id.trim())) {
    errors.id = "A provider with that ID already exists. Edit it instead.";
  }

  if (!draft.name.trim()) errors.name = "A display name is required.";
  if (!draft.clientId.trim()) errors.clientId = "A client ID is required.";
  if (!draft.clientSecretEnv.trim()) {
    errors.clientSecretEnv = "An environment variable name is required.";
  }

  for (const key of ["authorizationUrl", "tokenUrl", "userInfoUrl"] as const) {
    const value = draft[key].trim();
    if (!value) {
      errors[key] = "This URL is required for OAuth to work.";
    } else if (!isAbsoluteUrl(value)) {
      errors[key] = "Enter a full URL, including https://.";
    }
  }

  const redirectUri = draft.redirectUri?.trim();
  if (redirectUri && !isAbsoluteUrl(redirectUri)) {
    errors.redirectUri = "Enter a full URL, including https://.";
  }

  const invalidAllowlisted = draft.redirectUris.filter(
    (uri) => !isAbsoluteUrl(uri),
  );
  if (invalidAllowlisted.length > 0) {
    errors.redirectUris = `Not a valid URL: ${invalidAllowlisted.join(", ")}`;
  }

  if (!draft.subjectJsonPath.trim()) {
    errors.subjectJsonPath = "A subject claim path is required.";
  }

  return errors;
}

function describeRedirects(provider: OAuthProviderConfig) {
  const allowlisted = (provider.redirectUris ?? []).filter(Boolean);
  const single = provider.redirectUri?.trim();

  if (!allowlisted.length && !single) return "Origin fallback";

  const parts: string[] = [];
  if (single) parts.push("1 fixed");
  if (allowlisted.length) parts.push(`${allowlisted.length} allowlisted`);

  return parts.join(", ");
}

export default function SystemConfigPage() {
  const { data, isLoading, isError, error, refetch } = useSystemConfig();
  const update = useUpdateSystemConfig();
  const { canWrite } = useAdminPermissions();
  const ensureStepUp = useStepUpGuard();
  const toast = useToast();
  const confirm = useConfirm();

  const [draft, setDraft] = useState<Partial<SystemConfig>>({});
  const [stepUpPending, setStepUpPending] = useState(false);

  const form = useMemo<SystemConfig | null>(() => {
    if (!data) return null;
    return { ...data, ...draft };
  }, [data, draft]);

  const isDirty = useMemo(() => {
    if (!data || !form) return false;
    return JSON.stringify(data) !== JSON.stringify(form);
  }, [data, form]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-[28px]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    );
  }

  if (isError || !form) {
    return (
      <QueryErrorState
        title="Could not load system configuration"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  const updateField = <K extends keyof SystemConfig>(
    key: K,
    value: SystemConfig[K],
  ) => {
    if (!canWrite) return;

    setDraft((prev) => {
      if (!data) {
        return { ...prev, [key]: value };
      }

      if (JSON.stringify(data[key]) === JSON.stringify(value)) {
        const next = { ...prev };
        delete next[key];
        return next;
      }

      return { ...prev, [key]: value };
    });
  };

  const removeAvailableRole = async (role: string) => {
    if (!canWrite || !form) return;

    if (
      !(await confirm({
        title: "Remove role",
        description: `Remove "${role}" from the available roles? It will no longer be assignable, and it will be removed from the default roles.`,
        confirmLabel: "Remove",
        tone: "danger",
      }))
    ) {
      return;
    }

    updateField(
      "available_roles",
      form.available_roles.filter((value) => value !== role),
    );

    // A role that is no longer available must not stay a default, or every new
    // user keeps receiving a role the configuration no longer offers, with no
    // chip left in the UI to clear it.
    if (form.default_roles.includes(role)) {
      updateField(
        "default_roles",
        form.default_roles.filter((value) => value !== role),
      );
    }
  };

  const reset = async () => {
    if (!isDirty) return;

    // The screen accumulates edits across every section behind one draft, so a
    // stray click here throws away all of them. Neighbouring actions (removing
    // a role or a provider) already confirm.
    if (
      !(await confirm({
        title: "Discard changes",
        description:
          "Discard all staged configuration changes and return to the last fetched state? This cannot be undone.",
        confirmLabel: "Discard",
        tone: "danger",
      }))
    ) {
      return;
    }

    setDraft({});
  };

  const save = async () => {
    if (!canWrite || !form) return;

    // Send only the changed keys. The API's PATCH body schema is strict and
    // accepts just the mutable fields, so echoing the whole config back (which
    // includes read-only keys from the GET, such as frontend_url) is rejected.
    const changes = draft;
    if (Object.keys(changes).length === 0) return;

    // Both fields decide whether an existing passkey can still be asserted, and
    // neither failure is visible until a user cannot sign in.
    const warnings: string[] = [];
    if (changes.rpid !== undefined && data && changes.rpid !== data.rpid) {
      warnings.push(
        `Changing the relying-party ID from "${data.rpid}" to "${changes.rpid}" invalidates every passkey already registered against the old ID. Those users will have to enrol again.`,
      );
    }
    if (changes.origins !== undefined) {
      warnings.push(
        "Changing the allowed origins stops WebAuthn flows from any origin no longer on the list.",
      );
    }

    if (warnings.length > 0) {
      if (
        !(await confirm({
          title: "Confirm WebAuthn changes",
          description: warnings.join(" "),
          confirmLabel: "Save anyway",
          tone: "danger",
        }))
      ) {
        return;
      }
    }

    setStepUpPending(true);
    try {
      if (!(await ensureStepUp())) {
        return;
      }

      update.mutate(changes, {
        onSuccess: () => {
          setDraft({});
          toast.success(
            "Configuration saved",
            "System configuration changes were applied.",
          );
        },
        onError: (error) => {
          toast.error("Configuration save failed", getErrorMessage(error));
        },
      });
    } finally {
      setStepUpPending(false);
    }
  };

  const isSaving = update.isPending || stepUpPending;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-subtle bg-surface shadow-[0_1px_0_rgba(255,255,255,0.35)_inset]">
        <div className="relative px-6 py-6 lg:px-8 lg:py-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-0 top-0 h-40 w-40 rounded-full bg-[color:var(--accent-soft)] blur-3xl opacity-70" />
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[color:var(--highlight)]/10 blur-3xl" />
          </div>

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
                  Configuration Control
                </div>
                <h1 className="heading-1">System Configuration</h1>
                <p className="max-w-2xl text-sm text-muted">
                  Adjust the operating rules for authentication, role defaults,
                  rate limiting, and WebAuthn origins. Use this page to safely
                  shape how the auth system behaves in production.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <InfoPill label="App name" value={form.app_name} />
                <InfoPill
                  label="Available roles"
                  value={`${form.available_roles.length}`}
                />
                <InfoPill
                  label="Dirty state"
                  value={isDirty ? "Unsaved changes" : "In sync"}
                />
                <InfoPill
                  label="Login methods"
                  value={`${form.login_methods.length}`}
                />
                <InfoPill
                  label="OAuth providers"
                  value={`${form.oauth_providers.length}`}
                />
                <InfoPill
                  label="Lockout"
                  value={form.lockout_policy.enabled ? "Enabled" : "Disabled"}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <FocusPanel
                icon={ShieldCheck}
                title="Role model"
                value={`${form.available_roles.length}`}
                description="Available roles define the access language the rest of the system can assign."
              />

              <FocusPanel
                icon={TimerReset}
                title="Token policy"
                value={form.access_token_ttl}
                description="Current access-token lifetime shown exactly as configured."
              />

              <FocusPanel
                icon={Waypoints}
                title="Allowed origins"
                value={`${form.origins.length}`}
                description="Trusted origins currently allowed for WebAuthn and related flows."
              />

              <FocusPanel
                icon={KeyRound}
                title="Login methods"
                value={`${form.login_methods.length}`}
                description="Enabled passwordless entry points for account sign-in."
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          label="Available Roles"
          value={form.available_roles.length}
          hint={`${form.default_roles.length} default roles configured`}
        />
        <StatCard
          label="Access Token TTL"
          value={form.access_token_ttl}
          hint="How long an access token remains valid"
        />
        <StatCard
          label="Rate Limit"
          value={form.rate_limit}
          hint={`Delay after threshold: ${form.delay_after}`}
        />
        <StatCard
          label="Origins"
          value={form.origins.length}
          hint={`RP ID: ${form.rpid}`}
        />
        <StatCard
          label="Login Methods"
          value={form.login_methods.length}
          hint={
            form.passkey_login_fallback_enabled
              ? "Passkey fallback enabled"
              : "Passkey fallback disabled"
          }
        />
        <StatCard
          label="Lockout Policy"
          value={
            form.lockout_policy.enabled
              ? `${form.lockout_policy.maxFailures}`
              : "Off"
          }
          hint={
            form.lockout_policy.enabled
              ? `Failures per ${form.lockout_policy.windowSeconds}s window`
              : "Account lockout disabled"
          }
        />
      </div>

      {!canWrite && (
        <ReadOnlyNotice description="You can review configuration, but saving changes requires admin write access." />
      )}
      {update.isError && (
        <StateMessage
          tone="error"
          title="Configuration save failed"
          description={getErrorMessage(update.error)}
        />
      )}

      <Section
        title="General"
        description="Top-level product and deployment configuration used by the auth system."
      >
        <Input
          label="App Name"
          value={form.app_name}
          helperText="This is the operator-facing or relying-party name used by the system."
          onChange={(value) => updateField("app_name", value)}
          disabled={!canWrite}
        />
      </Section>

      <Section
        title="Roles"
        description="Define the available role set and the default roles applied to newly created users."
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-[0.18em] text-muted">
              Available Roles
            </label>

            <RemovableChips
              values={form.available_roles}
              disabled={!canWrite}
              onRemove={removeAvailableRole}
              removeLabel={(role) => `Remove ${role} from available roles`}
              emptyLabel="No roles are defined yet. Add one below."
            />

            <AddRoleInput
              roles={form.available_roles}
              onAdd={(role) =>
                updateField("available_roles", [...form.available_roles, role])
              }
              disabled={!canWrite}
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs uppercase tracking-[0.18em] text-muted">
              Default Roles
            </label>

            <RoleChips
              roles={form.available_roles}
              selected={form.default_roles}
              onChange={(roles) => updateField("default_roles", roles)}
              disabled={!canWrite}
            />
          </div>
        </div>
      </Section>

      <Section
        title="Login Policy"
        description="Control which passwordless login methods users can choose after login initiation."
      >
        <div className="space-y-5">
          <LoginMethodSelector
            value={form.login_methods}
            onChange={(value) => updateField("login_methods", value)}
            canWrite={canWrite}
          />

          <CheckboxField
            label="Passkey Login Fallback"
            description="Allow configured fallback methods when passkey login cannot be completed."
            checked={form.passkey_login_fallback_enabled}
            onChange={(checked) =>
              updateField("passkey_login_fallback_enabled", checked)
            }
            disabled={!canWrite}
          />
        </div>
      </Section>

      <Section
        title="OAuth Providers"
        description="Configure external login providers. Client secrets are referenced by environment variable name and are not entered here. Provider changes apply immediately and are not part of the Save action below."
      >
        <OAuthProvidersEditor
          providers={form.oauth_providers}
          canWrite={canWrite}
          ensureStepUp={ensureStepUp}
          toast={toast}
          confirm={confirm}
        />
      </Section>

      <Section
        title="Token Settings"
        description="Token lifetimes directly affect how often users need to refresh or reauthenticate."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Access Token TTL"
            value={form.access_token_ttl}
            helperText="Examples: 15m, 1h, 24h depending on backend expectations."
            onChange={(value) => updateField("access_token_ttl", value)}
            disabled={!canWrite}
          />

          <Input
            label="Refresh Token TTL"
            value={form.refresh_token_ttl}
            helperText="Longer-lived tokens extend session continuity but also extend persistence."
            onChange={(value) => updateField("refresh_token_ttl", value)}
            disabled={!canWrite}
          />
        </div>
      </Section>

      <Section
        title="Rate Limiting"
        description="Throttle repeated auth traffic to reduce brute-force pressure and abuse."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <NumberInput
            label="Rate Limit"
            value={form.rate_limit}
            helperText="Maximum request count before the limiter begins to intervene."
            onChange={(value) => updateField("rate_limit", value)}
            disabled={!canWrite}
          />

          <NumberInput
            label="Delay After"
            value={form.delay_after}
            helperText="How many requests can pass before delay behavior begins."
            onChange={(value) => updateField("delay_after", value)}
            disabled={!canWrite}
          />
        </div>
      </Section>

      <Section
        title="Lockout Policy"
        description="Temporarily lock identified users after repeated failed login attempts."
      >
        <div className="space-y-5">
          <CheckboxField
            label="Enable Account Lockout"
            description="Block login attempts for identified users after the configured failure threshold is reached."
            checked={form.lockout_policy.enabled}
            onChange={(checked) =>
              updateField("lockout_policy", {
                ...form.lockout_policy,
                enabled: checked,
              })
            }
            disabled={!canWrite}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <NumberInput
              label="Max Failures"
              value={form.lockout_policy.maxFailures}
              helperText="Number of failed attempts before the user is locked."
              onChange={(value) =>
                updateField("lockout_policy", {
                  ...form.lockout_policy,
                  maxFailures: value,
                })
              }
              disabled={!canWrite}
            />
            <NumberInput
              label="Window Seconds"
              value={form.lockout_policy.windowSeconds}
              helperText="How far back failed attempts are counted."
              onChange={(value) =>
                updateField("lockout_policy", {
                  ...form.lockout_policy,
                  windowSeconds: value,
                })
              }
              disabled={!canWrite}
            />
            <NumberInput
              label="Lockout Seconds"
              value={form.lockout_policy.lockoutSeconds}
              helperText="How long the account should reject login attempts."
              onChange={(value) =>
                updateField("lockout_policy", {
                  ...form.lockout_policy,
                  lockoutSeconds: value,
                })
              }
              disabled={!canWrite}
            />
          </div>
        </div>
      </Section>

      <Section
        title="WebAuthn / Origins"
        description="Relying-party identity and allowed origins must stay aligned with your real deployment surfaces."
      >
        <div className="space-y-4">
          <Input
            label="RP ID"
            value={form.rpid}
            helperText="Usually the effective domain that should own the WebAuthn credentials."
            onChange={(value) => updateField("rpid", value)}
            disabled={!canWrite}
          />

          <OriginsEditor
            origins={form.origins}
            setOrigins={(value) => updateField("origins", value)}
            canWrite={canWrite}
          />
        </div>
      </Section>

      <div className="sticky bottom-4 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl border border-subtle bg-surface px-5 py-4 shadow-lg">
          <div className="space-y-1">
            <div className="text-sm font-medium text-primary">
              {isDirty
                ? "Unsaved configuration changes"
                : "Configuration is up to date"}
            </div>
            <div className="text-sm text-muted">
              {isDirty
                ? "Review and save when you are ready, or discard to return to the last fetched state."
                : "Changes will appear here once you edit a field."}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void reset()}
              disabled={!isDirty || isSaving}
              className="btn btn-secondary disabled:opacity-50"
            >
              Discard
            </button>

            <button
              onClick={() => void save()}
              disabled={!isDirty || isSaving || !canWrite}
              className="btn btn-primary disabled:opacity-50"
            >
              {!canWrite
                ? "Read Only"
                : stepUpPending
                  ? "Verifying..."
                  : update.isPending
                    ? "Saving..."
                    : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-subtle bg-surface px-3 py-1.5 text-xs text-muted">
      <span className="font-medium text-primary">{value}</span>
      <span className="mx-1 opacity-60">•</span>
      <span>{label}</span>
    </div>
  );
}

function FocusPanel({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-subtle bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-alt)_72%,transparent),transparent)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-xl bg-surface p-2 text-[var(--primary)] shadow-sm">
          <Icon size={18} />
        </div>

        <div className="text-2xl font-semibold tracking-tight text-primary">
          {value}
        </div>
      </div>

      <div className="mt-4 space-y-1">
        <div className="text-sm font-medium text-primary">{title}</div>
        <div className="text-sm text-muted">{description}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  helperText,
  htmlFor,
  error,
  errorId,
  children,
}: {
  label: string;
  helperText?: string;
  htmlFor?: string;
  error?: string;
  errorId?: string;
  children: React.ReactNode;
}) {
  const labelId = useId();

  const messages = (
    <>
      {helperText && <p className="text-sm text-muted">{helperText}</p>}
      {error && (
        <p id={errorId} className="text-sm text-[var(--highlight)]">
          {error}
        </p>
      )}
    </>
  );

  // With a single control, the text is a real label. A group of controls has
  // nothing to point at, so it becomes a group name instead of an orphan label.
  if (htmlFor) {
    return (
      <div className="space-y-2">
        <label
          htmlFor={htmlFor}
          className="text-xs uppercase tracking-[0.18em] text-muted"
        >
          {label}
        </label>
        {children}
        {messages}
      </div>
    );
  }

  return (
    <div className="space-y-2" role="group" aria-labelledby={labelId}>
      <div
        id={labelId}
        className="text-xs uppercase tracking-[0.18em] text-muted"
      >
        {label}
      </div>
      {children}
      {messages}
    </div>
  );
}

const controlClassName =
  "w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60";

function Input({
  label,
  value,
  onChange,
  helperText,
  disabled,
  error,
  readOnly,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  helperText?: string;
  disabled?: boolean;
  error?: string;
  readOnly?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const errorId = useId();

  return (
    <Field
      label={label}
      helperText={helperText}
      htmlFor={id}
      error={error}
      errorId={errorId}
    >
      <input
        id={id}
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={controlClassName}
      />
    </Field>
  );
}

/**
 * A numeric field that never reports a value it was not given.
 *
 * The previous implementation passed `Number(e.target.value)` straight through,
 * so clearing the field staged a 0. A rate limit or lockout threshold of 0
 * changes authentication behaviour drastically, and nothing said so. Values
 * below `min`, non-integers, and an empty field are now held locally and
 * reported inline instead of being staged. Blur restores the last staged value,
 * so what is displayed is always what would be saved.
 */
function NumberInput({
  label,
  value,
  onChange,
  helperText,
  disabled,
  min = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  helperText?: string;
  disabled?: boolean;
  min?: number;
}) {
  const id = useId();
  const errorId = useId();
  const [pending, setPending] = useState<string | null>(null);

  const text = pending ?? String(value);
  const parsed = Number(text);
  const invalid =
    text.trim() === "" || !Number.isInteger(parsed) || parsed < min;

  const handleChange = (next: string) => {
    setPending(next);

    const candidate = Number(next);
    if (next.trim() === "" || !Number.isInteger(candidate) || candidate < min) {
      return;
    }

    onChange(candidate);
  };

  return (
    <Field
      label={label}
      helperText={helperText}
      htmlFor={id}
      error={invalid ? `Enter a whole number of ${min} or greater.` : undefined}
      errorId={errorId}
    >
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        step={1}
        value={text}
        disabled={disabled}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={invalid ? errorId : undefined}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setPending(null)}
        className={controlClassName}
      />
    </Field>
  );
}

function LoginMethodSelector({
  value,
  onChange,
  canWrite,
}: {
  value: LoginMethod[];
  onChange: (v: LoginMethod[]) => void;
  canWrite: boolean;
}) {
  const toggle = (method: LoginMethod) => {
    const enabled = value.includes(method);

    if (enabled) {
      if (value.length === 1) return;
      onChange(value.filter((current) => current !== method));
      return;
    }

    onChange([...value, method]);
  };

  return (
    <Field
      label="Enabled Login Methods"
      helperText="At least one login method must remain enabled."
    >
      <div className="grid gap-3 md:grid-cols-2">
        {LOGIN_METHOD_OPTIONS.map((option) => {
          const checked = value.includes(option.value);
          const disabled = !canWrite || (checked && value.length === 1);

          return (
            <label
              key={option.value}
              className={`flex min-h-24 items-start gap-3 rounded-md border border-subtle bg-surface-alt p-4 transition has-[:checked]:border-[var(--primary)] has-[:checked]:bg-surface ${
                canWrite
                  ? "cursor-pointer hover:border-[var(--primary)]"
                  : "cursor-not-allowed opacity-60"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(option.value)}
                className="mt-1 h-4 w-4 rounded border-subtle accent-[var(--primary)] disabled:opacity-50"
              />

              <span className="space-y-1">
                <span className="block text-sm font-medium text-primary">
                  {option.label}
                </span>
                <span className="block text-sm text-muted">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </Field>
  );
}

function CheckboxField({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-md border border-subtle bg-surface-alt p-4 transition ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:border-[var(--primary)]"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-subtle accent-[var(--primary)] disabled:cursor-not-allowed"
      />

      <span className="space-y-1">
        <span className="block text-sm font-medium text-primary">{label}</span>
        <span className="block text-sm text-muted">{description}</span>
      </span>
    </label>
  );
}

const emptyOAuthProvider: OAuthProviderConfig = {
  id: "",
  name: "",
  enabled: true,
  clientId: "",
  clientSecretEnv: "",
  authorizationUrl: "",
  tokenUrl: "",
  userInfoUrl: "",
  scopes: [],
  redirectUri: "",
  redirectUris: [],
  subjectJsonPath: "sub",
  emailJsonPath: "email",
  emailVerifiedJsonPath: "email_verified",
  nameJsonPath: "name",
  allowSignup: true,
  accountLinking: "email",
  requireEmailVerified: false,
};

// Fills only what a controlled input needs, without inventing values the stored
// provider does not have.
function toDraft(provider: OAuthProviderConfig): OAuthProviderConfig {
  return {
    ...provider,
    scopes: provider.scopes ?? [],
    redirectUris: provider.redirectUris ?? [],
    subjectJsonPath: provider.subjectJsonPath ?? "",
    emailJsonPath: provider.emailJsonPath ?? "",
    emailVerifiedJsonPath: provider.emailVerifiedJsonPath ?? "",
  };
}

function OAuthProvidersEditor({
  providers,
  canWrite,
  ensureStepUp,
  toast,
  confirm,
}: {
  providers: OAuthProviderConfig[];
  canWrite: boolean;
  ensureStepUp: () => Promise<boolean>;
  toast: ReturnType<typeof useToast>;
  confirm: ReturnType<typeof useConfirm>;
}) {
  const [draft, setDraft] = useState<OAuthProviderConfig>(emptyOAuthProvider);
  // The provider being edited, captured as it was stored. Diffing against this
  // is what keeps an untouched field out of the PATCH body.
  const [editing, setEditing] = useState<OAuthProviderConfig | null>(null);
  const [errors, setErrors] = useState<ProviderFieldErrors>({});
  const accountLinkingId = useId();
  const { create, update, remove } = useOAuthProviders();

  const isSaving = create.isPending || update.isPending || remove.isPending;

  const setField = <K extends keyof OAuthProviderConfig>(
    key: K,
    value: OAuthProviderConfig[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const startEditing = (provider: OAuthProviderConfig) => {
    if (!canWrite) return;

    // Deliberately not merged over emptyOAuthProvider. Doing that would fill an
    // optional field the provider does not have (nameJsonPath, say) with the
    // template default, and the diff below would then report it as an edit,
    // which is the overwrite this is meant to prevent. The baseline and the
    // draft must start identical.
    const normalizedProvider = toDraft(provider);
    setEditing(normalizedProvider);
    setDraft(normalizedProvider);
    setErrors({});
  };

  const cancelEditing = () => {
    setEditing(null);
    setDraft(emptyOAuthProvider);
    setErrors({});
  };

  const normalized = (): OAuthProviderConfig => ({
    ...draft,
    id: draft.id.trim(),
    name: draft.name.trim(),
    clientId: draft.clientId.trim(),
    clientSecretEnv: draft.clientSecretEnv.trim(),
    authorizationUrl: draft.authorizationUrl.trim(),
    tokenUrl: draft.tokenUrl.trim(),
    userInfoUrl: draft.userInfoUrl.trim(),
    scopes: draft.scopes.filter(Boolean),
    redirectUris: draft.redirectUris.filter(Boolean),
    redirectUri: draft.redirectUri?.trim() || undefined,
    nameJsonPath: draft.nameJsonPath?.trim() || undefined,
  });

  const saveProvider = async () => {
    if (!canWrite) return;

    const provider = normalized();
    const found = validateProvider(provider, {
      isNew: !editing,
      existingIds: providers.map((current) => current.id),
    });

    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    if (!(await ensureStepUp())) return;

    const onError = (error: Error) =>
      toast.error("Could not save provider", getErrorMessage(error));

    if (editing) {
      // Send only what actually changed. Submitting the whole form used to blank
      // out URLs the operator never retyped and reset the JSON paths and
      // allowSignup to the template defaults.
      const updates: Record<string, unknown> = {};
      for (const key of Object.keys(
        provider,
      ) as (keyof OAuthProviderConfig)[]) {
        if (key === "id") continue;
        if (JSON.stringify(editing[key]) !== JSON.stringify(provider[key])) {
          updates[key] = provider[key];
        }
      }

      if (Object.keys(updates).length === 0) {
        toast.success("No changes to save", `${provider.name} is unchanged.`);
        cancelEditing();
        return;
      }

      update.mutate(
        { id: provider.id, updates },
        {
          onSuccess: () => {
            cancelEditing();
            toast.success("Provider updated", `${provider.name} was saved.`);
          },
          onError,
        },
      );
      return;
    }

    create.mutate(provider, {
      onSuccess: () => {
        cancelEditing();
        toast.success("Provider added", `${provider.name} was saved.`);
      },
      onError,
    });
  };

  const toggleProvider = async (provider: OAuthProviderConfig) => {
    if (!canWrite) return;
    if (!(await ensureStepUp())) return;

    update.mutate(
      { id: provider.id, updates: { enabled: !provider.enabled } },
      {
        onSuccess: () =>
          toast.success(
            provider.enabled ? "Provider disabled" : "Provider enabled",
            `${provider.name} was updated.`,
          ),
        onError: (error) =>
          toast.error("Could not update provider", getErrorMessage(error)),
      },
    );
  };

  const removeProvider = async (provider: OAuthProviderConfig) => {
    if (!canWrite) return;

    if (
      !(await confirm({
        title: "Remove provider",
        description: `Remove "${provider.name}"? Users will no longer be able to sign in with it.`,
        confirmLabel: "Remove",
        tone: "danger",
      }))
    ) {
      return;
    }

    if (!(await ensureStepUp())) return;

    remove.mutate(provider.id, {
      onSuccess: () =>
        toast.success("Provider removed", `${provider.name} was removed.`),
      onError: (error) =>
        toast.error("Could not remove provider", getErrorMessage(error)),
    });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-md border border-subtle bg-surface-alt p-4">
        <div className="text-sm font-medium text-primary">
          {editing ? `Editing ${editing.name}` : "Add a provider"}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Input
            label="Provider ID"
            value={draft.id}
            helperText={
              editing
                ? "The provider ID identifies the stored record and cannot be changed."
                : "Use lowercase kebab-case, such as google or github."
            }
            error={errors.id}
            disabled={!canWrite}
            readOnly={Boolean(editing)}
            onChange={(value) => setField("id", value)}
          />
          <Input
            label="Display Name"
            value={draft.name}
            error={errors.name}
            disabled={!canWrite}
            onChange={(value) => setField("name", value)}
          />
          <Input
            label="Client ID"
            value={draft.clientId}
            error={errors.clientId}
            disabled={!canWrite}
            onChange={(value) => setField("clientId", value)}
          />
          <Input
            label="Client Secret Env"
            value={draft.clientSecretEnv}
            helperText="Name of the server environment variable containing the secret."
            error={errors.clientSecretEnv}
            disabled={!canWrite}
            onChange={(value) => setField("clientSecretEnv", value)}
          />
          <Input
            label="Authorization URL"
            value={draft.authorizationUrl}
            placeholder="https://accounts.example.com/o/oauth2/v2/auth"
            error={errors.authorizationUrl}
            disabled={!canWrite}
            onChange={(value) => setField("authorizationUrl", value)}
          />
          <Input
            label="Token URL"
            value={draft.tokenUrl}
            placeholder="https://oauth2.example.com/token"
            error={errors.tokenUrl}
            disabled={!canWrite}
            onChange={(value) => setField("tokenUrl", value)}
          />
          <Input
            label="User Info URL"
            value={draft.userInfoUrl}
            placeholder="https://openidconnect.example.com/v1/userinfo"
            error={errors.userInfoUrl}
            disabled={!canWrite}
            onChange={(value) => setField("userInfoUrl", value)}
          />
          <Input
            label="Redirect URI"
            value={draft.redirectUri ?? ""}
            helperText="The single callback URL sent to the provider. Leave blank to fall back to this deployment's origin."
            error={errors.redirectUri}
            disabled={!canWrite}
            onChange={(value) => setField("redirectUri", value)}
          />
          <Input
            label="Redirect URI Allowlist"
            value={draft.redirectUris.join(", ")}
            helperText="Comma-separated. This restricts which callback URLs an OAuth start may request; it does not replace the Redirect URI above. Leave empty to allow only the origin."
            error={errors.redirectUris}
            disabled={!canWrite}
            onChange={(value) =>
              setField(
                "redirectUris",
                value
                  .split(",")
                  .map((uri) => uri.trim())
                  .filter(Boolean),
              )
            }
          />
          <Input
            label="Scopes"
            value={draft.scopes.join(", ")}
            helperText="Comma-separated scopes requested during OAuth authorization."
            disabled={!canWrite}
            onChange={(value) =>
              setField(
                "scopes",
                value
                  .split(",")
                  .map((scope) => scope.trim())
                  .filter(Boolean),
              )
            }
          />
          <Input
            label="Subject JSON Path"
            value={draft.subjectJsonPath}
            error={errors.subjectJsonPath}
            disabled={!canWrite}
            onChange={(value) => setField("subjectJsonPath", value)}
          />
          <Input
            label="Email JSON Path"
            value={draft.emailJsonPath}
            disabled={!canWrite}
            onChange={(value) => setField("emailJsonPath", value)}
          />
          <Input
            label="Email Verified JSON Path"
            value={draft.emailVerifiedJsonPath}
            disabled={!canWrite}
            onChange={(value) => setField("emailVerifiedJsonPath", value)}
          />
          <Input
            label="Name JSON Path"
            value={draft.nameJsonPath ?? ""}
            disabled={!canWrite}
            onChange={(value) => setField("nameJsonPath", value)}
          />
          <Field
            label="Account Linking"
            helperText="Email linking reuses existing users; disabled requires an existing provider identity."
            htmlFor={accountLinkingId}
          >
            <select
              id={accountLinkingId}
              value={draft.accountLinking}
              disabled={!canWrite}
              onChange={(event) =>
                setField(
                  "accountLinking",
                  event.target.value as "email" | "disabled",
                )
              }
              className={controlClassName}
            >
              <option value="email">Email linking</option>
              <option value="disabled">Disabled</option>
            </select>
          </Field>
          <CheckboxField
            label="Require Verified Email"
            description="Reject OAuth profiles when the configured email verification claim is not true."
            checked={draft.requireEmailVerified}
            disabled={!canWrite}
            onChange={(value) => setField("requireEmailVerified", value)}
          />
          <CheckboxField
            label="Allow Just-in-Time Signup"
            description="Create an account automatically the first time someone signs in with this provider. Turn this off to allow only users who already exist."
            checked={draft.allowSignup}
            disabled={!canWrite}
            onChange={(value) => setField("allowSignup", value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void saveProvider()}
            disabled={!canWrite || isSaving}
            className="btn btn-secondary"
          >
            {editing ? "Save Provider" : "Add Provider"}
          </button>

          {editing && (
            <button
              onClick={cancelEditing}
              disabled={isSaving}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {providers.map((provider) => (
          <div
            key={provider.id}
            role="group"
            aria-label={provider.name}
            className="rounded-md border border-subtle bg-surface-alt p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-primary">
                    {provider.name}
                  </span>
                  <ProviderStateBadge enabled={provider.enabled} />
                </div>
                <div className="text-sm text-muted">{provider.id}</div>
                <div className="truncate text-xs text-muted">
                  Secret env configured
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => startEditing(provider)}
                  disabled={!canWrite || isSaving}
                  aria-label={`Edit ${provider.name}`}
                  className="btn btn-secondary"
                >
                  Edit
                </button>
                <button
                  onClick={() => void toggleProvider(provider)}
                  disabled={!canWrite || isSaving}
                  className="btn btn-secondary"
                >
                  {provider.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => void removeProvider(provider)}
                  disabled={!canWrite || isSaving}
                  aria-label={`Remove ${provider.name}`}
                  className="text-sm text-[var(--highlight)] transition hover:opacity-80 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 text-xs text-muted md:grid-cols-2">
              <span className="truncate">Client ID: {provider.clientId}</span>
              <span className="truncate">
                Scopes: {provider.scopes.join(", ") || "None"}
              </span>
              <span className="truncate">
                Redirects: {describeRedirects(provider)}
              </span>
              <span className="truncate">
                Linking: {provider.accountLinking ?? "email"}
              </span>
              <span className="truncate">
                Verified email:{" "}
                {provider.requireEmailVerified ? "required" : "optional"}
              </span>
              <span className="truncate">
                Just-in-time signup:{" "}
                {provider.allowSignup ? "allowed" : "blocked"}
              </span>
              <span className="truncate">
                Authorization: {provider.authorizationUrl}
              </span>
              <span className="truncate">
                User info: {provider.userInfoUrl}
              </span>
            </div>
          </div>
        ))}

        {providers.length === 0 && (
          <div className="rounded-md border border-subtle bg-surface-alt p-4 text-sm text-muted">
            No OAuth providers configured.
          </div>
        )}
      </div>
    </div>
  );
}

function ProviderStateBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
        enabled
          ? "border-[var(--primary)] bg-[color:var(--accent-soft)] text-primary"
          : "border-subtle bg-surface text-muted"
      }`}
    >
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

function OriginsEditor({
  origins,
  setOrigins,
  canWrite,
}: {
  origins: string[];
  setOrigins: (v: string[]) => void;
  canWrite: boolean;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const originInputId = useId();

  // Emptying the list leaves no origin able to complete a WebAuthn ceremony,
  // which locks every passkey user out. This mirrors the login-method selector,
  // which already refuses to disable the last enabled method.
  const isLastOrigin = origins.length === 1;

  const add = () => {
    if (!canWrite) return;

    const trimmed = input.trim();
    if (!trimmed) return;

    if (!isAbsoluteUrl(trimmed)) {
      setError(
        "Enter a full origin, including the scheme, such as https://example.com.",
      );
      return;
    }

    if (origins.includes(trimmed)) {
      setError("That origin is already allowed.");
      return;
    }

    setOrigins([...origins, trimmed]);
    setInput("");
    setError("");
  };

  return (
    <div className="space-y-3">
      <Field
        label="Allowed Origins"
        helperText="Origins must match the real client surfaces that should be allowed to participate in auth flows. At least one must remain."
        htmlFor={originInputId}
        error={error || undefined}
      >
        <div className="flex gap-2">
          <input
            id={originInputId}
            value={input}
            disabled={!canWrite}
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              setInput(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            className={`flex-1 ${controlClassName}`}
            placeholder="https://example.com"
          />

          <button
            onClick={add}
            disabled={!canWrite}
            className="btn btn-secondary"
          >
            Add
          </button>
        </div>
      </Field>

      {origins.map((origin, index) => (
        <div
          key={index}
          className="flex items-center justify-between rounded-md border border-subtle bg-surface px-3 py-2 text-sm"
        >
          <span className="truncate text-primary">{origin}</span>

          <button
            onClick={() =>
              setOrigins(
                origins.filter((_, currentIndex) => currentIndex !== index),
              )
            }
            disabled={!canWrite || isLastOrigin}
            aria-label={`Remove ${origin}`}
            title={
              isLastOrigin
                ? "At least one allowed origin is required for WebAuthn to work."
                : undefined
            }
            className="text-[var(--highlight)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ))}

      {isLastOrigin && (
        <p className="text-sm text-muted">
          This is the only allowed origin. Add another before removing it, or
          WebAuthn flows will stop working.
        </p>
      )}
    </div>
  );
}

function AddRoleInput({
  roles,
  onAdd,
  disabled,
}: {
  roles: string[];
  onAdd: (role: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  const add = () => {
    if (disabled) return;

    const trimmed = value.trim();

    if (!trimmed) return;
    if (roles.includes(trimmed)) return;

    onAdd(trimmed);
    setValue("");
  };

  return (
    <div className="flex gap-2">
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add role (e.g. admin:read)"
        aria-label="Add a role"
        className={`flex-1 ${controlClassName}`}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
      />

      <button onClick={add} disabled={disabled} className="btn btn-secondary">
        Add
      </button>
    </div>
  );
}
