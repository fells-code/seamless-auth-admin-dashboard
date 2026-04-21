/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useMemo, useState } from "react";
import { ShieldCheck, TimerReset, Waypoints } from "lucide-react";
import { useSystemConfig, type SystemConfig } from "../hooks/useSystemConfig";
import { useUpdateSystemConfig } from "../hooks/useUpdateSystemConfig";
import Skeleton from "../components/Skeleton";
import RoleChips from "../components/RoleChips";
import { Section } from "../components/Section";
import StatCard from "../components/StatCard";

export default function SystemConfigPage() {
  const { data, isLoading } = useSystemConfig();
  const update = useUpdateSystemConfig();

  const [draft, setDraft] = useState<Partial<SystemConfig>>({});

  const form = useMemo<SystemConfig | null>(() => {
    if (!data) return null;
    return { ...data, ...draft };
  }, [data, draft]);

  const isDirty = useMemo(() => {
    if (!data || !form) return false;
    return JSON.stringify(data) !== JSON.stringify(form);
  }, [data, form]);

  if (isLoading || !form) {
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

  const updateField = <K extends keyof SystemConfig>(
    key: K,
    value: SystemConfig[K],
  ) => {
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

  const reset = () => {
    setDraft({});
  };

  const save = () => {
    update.mutate(form);
  };

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
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
      </div>

      <Section
        title="General"
        description="Top-level product and deployment configuration used by the auth system."
      >
        <Input
          label="App Name"
          value={form.app_name}
          helperText="This is the operator-facing or relying-party name used by the system."
          onChange={(value) => updateField("app_name", value)}
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

            <RoleChips
              roles={form.available_roles}
              selected={form.available_roles}
              onChange={(roles) => updateField("available_roles", roles)}
            />

            <AddRoleInput
              roles={form.available_roles}
              onAdd={(role) =>
                updateField("available_roles", [...form.available_roles, role])
              }
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
            />
          </div>
        </div>
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
          />

          <Input
            label="Refresh Token TTL"
            value={form.refresh_token_ttl}
            helperText="Longer-lived tokens extend session continuity but also extend persistence."
            onChange={(value) => updateField("refresh_token_ttl", value)}
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
          />

          <NumberInput
            label="Delay After"
            value={form.delay_after}
            helperText="How many requests can pass before delay behavior begins."
            onChange={(value) => updateField("delay_after", value)}
          />
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
          />

          <OriginsEditor
            origins={form.origins}
            setOrigins={(value) => updateField("origins", value)}
          />
        </div>
      </Section>

      <div className="sticky bottom-4 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl border border-subtle bg-surface px-5 py-4 shadow-lg">
          <div className="space-y-1">
            <div className="text-sm font-medium text-primary">
              {isDirty ? "Unsaved configuration changes" : "Configuration is up to date"}
            </div>
            <div className="text-sm text-muted">
              {isDirty
                ? "Review and save when you are ready, or discard to return to the last fetched state."
                : "Changes will appear here once you edit a field."}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={reset}
              disabled={!isDirty || update.isPending}
              className="btn btn-secondary disabled:opacity-50"
            >
              Discard
            </button>

            <button
              onClick={save}
              disabled={!isDirty || update.isPending}
              className="btn btn-primary disabled:opacity-50"
            >
              {update.isPending ? "Saving..." : "Save Changes"}
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
  children,
}: {
  label: string;
  helperText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-[0.18em] text-muted">
        {label}
      </label>
      {children}
      {helperText && <p className="text-sm text-muted">{helperText}</p>}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  helperText?: string;
}) {
  return (
    <Field label={label} helperText={helperText}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
      />
    </Field>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  helperText,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  helperText?: string;
}) {
  return (
    <Field label={label} helperText={helperText}>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
      />
    </Field>
  );
}

function OriginsEditor({
  origins,
  setOrigins,
}: {
  origins: string[];
  setOrigins: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    if (!input) return;
    setOrigins([...origins, input]);
    setInput("");
  };

  return (
    <div className="space-y-3">
      <Field
        label="Allowed Origins"
        helperText="Origins must match the real client surfaces that should be allowed to participate in auth flows."
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
            placeholder="https://example.com"
          />

          <button onClick={add} className="btn btn-secondary">
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
              setOrigins(origins.filter((_, currentIndex) => currentIndex !== index))
            }
            className="text-[var(--highlight)] transition hover:opacity-80"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

function AddRoleInput({
  roles,
  onAdd,
}: {
  roles: string[];
  onAdd: (role: string) => void;
}) {
  const [value, setValue] = useState("");

  const add = () => {
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
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add role (e.g. admin)"
        className="flex-1 rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
      />

      <button onClick={add} className="btn btn-secondary">
        Add
      </button>
    </div>
  );
}
