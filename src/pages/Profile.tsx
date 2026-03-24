// src/pages/Profile.tsx
import { useAuth } from "@seamless-auth/react";
import { useUserDetail } from "../hooks/useUserDetail";
import { useRevokeSession } from "../hooks/useRevokeSession";
import { useUpdateUser } from "../hooks/useUpdateUser";

import Table from "../components/Table";
import Skeleton from "../components/Skeleton";
import { useState } from "react";
import { Section } from "../components/Section";

export default function Profile() {
  const { user } = useAuth();

  const { data, isLoading } = useUserDetail(user?.id);
  const revokeSession = useRevokeSession();
  const updateUser = useUpdateUser(user?.id);

  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  if (isLoading || !data) return <Skeleton className="h-40" />;

  const { sessions, credentials } = data;

  const save = () => {
    updateUser.mutate({ email, phone });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Profile</h1>

      {/* Profile Info */}
      <div className="space-y-3 bg-surface border border-subtle p-4 rounded-lg border border-gray-800">
        <Input label="Email" value={email} onChange={setEmail} />
        <Input label="Phone" value={phone} onChange={setPhone} />

        <button
          onClick={save}
          className="bg-primary text-white hover:opacity-90"
        >
          Save Changes
        </button>
      </div>

      {/* Sessions */}
      <Section title="Sessions">
        <Table
          columns={[
            { key: "ipAddress", label: "IP" },
            { key: "lastUsedAt", label: "Last Used" },
            { key: "actions", label: "" },
          ]}
          data={sessions.map((s: any) => ({
            ...s,
            lastUsedAt: new Date(s.lastUsedAt).toLocaleString(),
            actions: (
              <button
                onClick={() => revokeSession.mutate(s.id)}
                className="text-red-500"
              >
                Revoke
              </button>
            ),
          }))}
        />
      </Section>

      {/* Credentials */}
      <Section title="Credentials">
        <Table
          columns={[
            { key: "deviceType", label: "Device" },
            { key: "browser", label: "Browser" },
            { key: "createdAt", label: "Created" },
          ]}
          data={credentials.map((c: any) => ({
            ...c,
            createdAt: new Date(c.createdAt).toLocaleString(),
          }))}
        />
      </Section>
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
    <div>
      <label className="text-sm text-gray-400">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded"
      />
    </div>
  );
}
