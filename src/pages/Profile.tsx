/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useAuth } from "@seamless-auth/react";
import { useUserDetail } from "../hooks/useUserDetail";
import { useRevokeSession } from "../hooks/useRevokeSession";
import { useUpdateUser } from "../hooks/useUpdateUser";

import Table from "../components/Table";
import Skeleton from "../components/Skeleton";
import { useState } from "react";
import { Section } from "../components/Section";
import { ShieldOff } from "lucide-react";

/* ---------- Types ---------- */

type Session = {
  id: string;
  ipAddress: string;
  userAgent: string;
  lastUsedAt: string;
};

type Credential = {
  id: string;
  deviceType: string;
  browser: string;
  createdAt: string;
};

type UserDetailResponse = {
  sessions: Session[];
  credentials: Credential[];
};

/* ---------- Component ---------- */

export default function Profile() {
  const { user } = useAuth();

  const [offset, setOffset] = useState(0);
  const limit = 5;

  const { data, isLoading } = useUserDetail(user?.id);
  const revokeSession = useRevokeSession();
  const updateUser = useUpdateUser(user?.id);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [initialized, setInitialized] = useState(false);

  // initialize once (no effect)
  if (!initialized && user) {
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
    setInitialized(true);
  }

  if (isLoading || !data) {
    return <Skeleton className="h-40 rounded-xl" />;
  }

  const { sessions, credentials } = data as UserDetailResponse;

  const save = () => {
    updateUser.mutate({ email, phone });
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="heading-1">Profile</h1>
        <p className="text-muted text-sm">
          Manage your account and active sessions
        </p>
      </div>

      {/* Account */}
      <Section title="Account">
        <div className="space-y-4">
          <Input label="Email" value={email} onChange={setEmail} />
          <Input label="Phone" value={phone} onChange={setPhone} />

          <div className="flex justify-end">
            <button onClick={save} className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </div>
      </Section>

      {/* Sessions */}
      <Section title="Sessions">
        <Table<Session>
          limit={limit}
          offset={offset}
          total={sessions.length}
          onPageChange={setOffset}
          columns={[
            {
              key: "ipAddress",
              label: "IP",
              render: (v) => <span className="font-mono text-sm">{v}</span>,
            },
            {
              key: "userAgent",
              label: "Device",
              render: (v) => (
                <span className="text-sm text-muted truncate max-w-[200px]">
                  {v}
                </span>
              ),
            },
            {
              key: "lastUsedAt",
              label: "Last Used",
              render: (v) => (
                <span className="text-sm text-muted">
                  {new Date(v).toLocaleString()}
                </span>
              ),
            },
          ]}
          actions={[
            {
              icon: ShieldOff,
              label: "Revoke",
              variant: "danger",
              onClick: (row) => revokeSession.mutate(row.id),
            },
          ]}
          data={sessions.slice(offset, offset + limit)}
        />
      </Section>

      {/* Credentials */}
      <Section title="Credentials">
        <Table<Credential>
          columns={[
            { key: "deviceType", label: "Device" },
            { key: "browser", label: "Browser" },
            {
              key: "createdAt",
              label: "Created",
              render: (v) => (
                <span className="text-sm text-muted">
                  {new Date(v).toLocaleString()}
                </span>
              ),
            },
          ]}
          data={credentials}
        />
      </Section>
    </div>
  );
}

/* ---------- Shared Input ---------- */

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
      <label className="text-xs text-muted uppercase tracking-wide">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
      />
    </div>
  );
}
