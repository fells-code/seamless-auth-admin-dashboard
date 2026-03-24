import { useState, useEffect } from "react";
import { useSystemConfig } from "../hooks/useSystemConfig";
import { useUpdateSystemConfig } from "../hooks/useUpdateSystemConfig";
import Skeleton from "../components/Skeleton";
import RoleChips from "../components/RoleChips";
import { Section } from "../components/Section";

export default function SystemConfig() {
  const { data, isLoading } = useSystemConfig();
  const update = useUpdateSystemConfig();

  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (data) {
      setForm(data);
    }
  }, [data]);

  if (isLoading || !form) return <Skeleton className="h-40" />;

  const updateField = (key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const save = () => {
    update.mutate(form);
  };

  return (
    <div className="space-y-8">
      <h1 className="heading-1">System Configuration</h1>

      {/* GENERAL */}
      <Section title="General">
        <Input
          label="App Name"
          value={form.app_name}
          onChange={(v) => updateField("app_name", v)}
        />
      </Section>

      {/* ROLES */}
      <Section title="Roles">
        <label className="text-sm text-gray-400">Available Roles</label>
        <RoleChips
          roles={form.available_roles ?? []}
          selected={form.available_roles}
          onChange={(roles) => updateField("available_roles", roles)}
        />

        <div className="mt-4">
          <label className="text-sm text-gray-400">Default Roles</label>
          <RoleChips
            roles={form.available_roles ?? []}
            selected={form.default_roles}
            onChange={(roles) => updateField("default_roles", roles)}
          />
        </div>
      </Section>

      {/* TOKENS */}
      <Section title="Token Settings">
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
      </Section>

      {/* RATE LIMIT */}
      <Section title="Rate Limiting">
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
      </Section>

      {/* WEBAUTHN / ORIGINS */}
      <Section title="WebAuthn / Origins">
        <Input
          label="RP ID"
          value={form.rpid}
          onChange={(v) => updateField("rpid", v)}
        />

        <OriginsEditor
          origins={form.origins ?? []}
          setOrigins={(v) => updateField("origins", v)}
        />
      </Section>

      {/* SAVE */}
      <div>
        <button
          onClick={save}
          className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          Save Changes
        </button>
      </div>
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
    <div className="space-y-1">
      <label className="text-sm text-gray-400">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded"
      />
    </div>
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
    <div className="space-y-1">
      <label className="text-sm text-gray-400">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded"
      />
    </div>
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
    <div className="space-y-2">
      <label className="text-sm text-gray-400">Allowed Origins</label>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded"
          placeholder="https://example.com"
        />

        <button onClick={add} className="bg-purple-600 text-white px-3 rounded">
          Add
        </button>
      </div>

      {origins.map((o, i) => (
        <div key={i} className="flex justify-between text-sm">
          <span>{o}</span>
          <button
            onClick={() => setOrigins(origins.filter((_, idx) => idx !== i))}
            className="text-red-500"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
