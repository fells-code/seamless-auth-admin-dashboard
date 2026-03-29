/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useState } from "react";
import { useSystemConfig, type SystemConfig } from "../hooks/useSystemConfig";
import { useUpdateSystemConfig } from "../hooks/useUpdateSystemConfig";
import Skeleton from "../components/Skeleton";
import RoleChips from "../components/RoleChips";
import { Section } from "../components/Section";

export default function SystemConfig() {
  const { data, isLoading } = useSystemConfig();
  const update = useUpdateSystemConfig();

  const [form, setForm] = useState<SystemConfig | null>(null);

  // initialize form once when data arrives
  if (!form && data) {
    setForm(data);
  }

  if (isLoading || !form) {
    return <Skeleton className="h-40 rounded-xl" />;
  }

  const updateField = <K extends keyof SystemConfig>(
    key: K,
    value: SystemConfig[K],
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const save = () => {
    update.mutate(form);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="heading-1">System Configuration</h1>
        <p className="text-muted text-sm">
          Manage authentication settings and system behavior
        </p>
      </div>

      <Section title="General">
        <Input
          label="App Name"
          value={form.app_name}
          onChange={(v) => updateField("app_name", v)}
        />
      </Section>

      <Section title="Roles">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs text-muted uppercase tracking-wide">
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

          <div className="space-y-2">
            <label className="text-xs text-muted uppercase tracking-wide">
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

      <Section title="Token Settings">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Access Token TTL"
            value={form.access_token_ttl}
            onChange={(v) => updateField("access_token_ttl", v)}
          />

          <Input
            label="Refresh Token TTL"
            value={form.refresh_token_ttl}
            onChange={(v) => updateField("refresh_token_ttl", v)}
          />
        </div>
      </Section>

      <Section title="Rate Limiting">
        <div className="grid grid-cols-2 gap-4">
          <NumberInput
            label="Rate Limit"
            value={form.rate_limit}
            onChange={(v) => updateField("rate_limit", v)}
          />

          <NumberInput
            label="Delay After"
            value={form.delay_after}
            onChange={(v) => updateField("delay_after", v)}
          />
        </div>
      </Section>

      <Section title="WebAuthn / Origins">
        <div className="space-y-4">
          <Input
            label="RP ID"
            value={form.rpid}
            onChange={(v) => updateField("rpid", v)}
          />

          <OriginsEditor
            origins={form.origins}
            setOrigins={(v) => updateField("origins", v)}
          />
        </div>
      </Section>

      <div className="flex justify-end">
        <button onClick={save} className="btn btn-primary">
          Save Changes
        </button>
      </div>
    </div>
  );
}

/* ---------- Reusable Form Components ---------- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-muted uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
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
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label}>
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
      <Field label="Allowed Origins">
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

      {origins.map((o, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-md border border-subtle bg-surface px-3 py-2 text-sm"
        >
          <span className="truncate">{o}</span>

          <button
            onClick={() => setOrigins(origins.filter((_, idx) => idx !== i))}
            className="text-[var(--highlight)] hover:opacity-80"
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
