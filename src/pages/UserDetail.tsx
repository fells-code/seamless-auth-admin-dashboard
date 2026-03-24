import { useParams, useNavigate } from "react-router-dom";
import { useUserDetail } from "../hooks/useUserDetail";
import { useUserAnomalies } from "../hooks/useUserAnomalies";
import { useRevokeSession } from "../hooks/useRevokeSession";
import { useDeleteUser } from "../hooks/useDeleteUser";

import Tabs from "../components/Tabs";
import Table from "../components/Table";
import Skeleton from "../components/Skeleton";
import EditUserModal from "../components/EditUserModal";

import { useState } from "react";
import RiskBadge from "../components/RiskBadge";
import { calculateRiskScore } from "../lib/riskScore";
import MiniLineChart from "../components/MiniLineChart";
import { useUserTimeseries } from "../hooks/useUserTimeseries";
import { Trash2, ShieldOff } from "lucide-react";

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useUserDetail(id!);
  const { data: anomalies } = useUserAnomalies(id!);
  const { data: timeseries } = useUserTimeseries(data?.user?.id || "");

  const revokeSession = useRevokeSession();
  const deleteUser = useDeleteUser();

  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState("Overview");

  if (isLoading || !data) {
    return <Skeleton className="h-40" />;
  }

  const { user, sessions, credentials, events } = data;

  const failedLogins =
    events.filter((e) => e.type === "login_failed").length ?? 0;

  const suspiciousCount = anomalies?.suspiciousEvents.length ?? 0;

  const risk = calculateRiskScore({
    suspiciousEvents: suspiciousCount,
    failedLogins,
  });

  const handleDeleteUser = () => {
    if (!confirm("Delete this user?")) return;

    deleteUser.mutate(user.id, {
      onSuccess: () => navigate("/users"),
    });
  };

  const revokeAllSessions = () => {
    if (!confirm("Revoke all sessions?")) return;
    sessions.forEach((s: any) => revokeSession.mutate(s.id));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="heading-1">{user.email}</h1>
            <RiskBadge level={risk.level} color={risk.color as any} />
          </div>

          <p className="text-subtle font-mono">{user.id}</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(true)} className="btn btn-primary">
            Edit
          </button>

          <button
            onClick={revokeAllSessions}
            className="btn btn-secondary flex items-center gap-1"
          >
            <ShieldOff size={14} />
            Revoke
          </button>

          <button
            onClick={handleDeleteUser}
            className="btn btn-danger flex items-center gap-1"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={["Overview", "Sessions", "Credentials", "Events", "Security"]}
        active={tab}
        onChange={setTab}
      />

      {/* CONTENT */}
      {tab === "Overview" && (
        <div className="grid grid-cols-3 gap-5">
          <Card className="col-span-3">
            <CardHeader title="Login Activity" subtitle="Last 24 hours" />
            <MiniLineChart data={timeseries?.timeseries ?? []} />
          </Card>

          <Stat label="Roles" value={user.roles.join(", ")} />
          <Stat label="Verified" value={user.verified ? "Yes" : "No"} />
          <Stat label="Sessions" value={sessions.length} />
        </div>
      )}

      {tab === "Sessions" && (
        <Table
          selectable
          columns={[
            { key: "ipAddress", label: "IP" },
            { key: "userAgent", label: "Device" },
            {
              key: "lastUsedAt",
              label: "Last Used",
              sortable: true,
              render: (v) => new Date(v).toLocaleString(),
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
          bulkActions={[
            {
              label: "Revoke Selected",
              variant: "danger",
              onClick: (rows) =>
                rows.forEach((r) => revokeSession.mutate(r.id)),
            },
          ]}
          data={sessions}
        />
      )}

      {tab === "Credentials" && (
        <Table
          columns={[
            { key: "deviceType", label: "Device" },
            { key: "browser", label: "Browser" },
            { key: "platform", label: "Platform" },
            {
              key: "createdAt",
              label: "Created",
              render: (v) => new Date(v).toLocaleString(),
            },
          ]}
          data={credentials}
        />
      )}

      {tab === "Events" && (
        <Table
          columns={[
            { key: "type", label: "Type" },
            {
              key: "created_at",
              label: "Time",
              sortable: true,
              render: (v) => new Date(v).toLocaleString(),
            },
          ]}
          data={events}
        />
      )}

      {tab === "Security" && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader title="Security Signals" />

          {anomalies?.suspiciousEvents.length ? (
            <>
              <div className="text-sm text-red-400 mb-4">
                {anomalies.suspiciousEvents.length} suspicious events detected
              </div>

              <Table
                columns={[
                  { key: "type", label: "Type" },
                  { key: "ip_address", label: "IP" },
                  {
                    key: "created_at",
                    label: "Time",
                    render: (v) => new Date(v).toLocaleString(),
                  },
                ]}
                data={anomalies.suspiciousEvents}
              />
            </>
          ) : (
            <div className="text-sm text-muted">
              No suspicious activity detected
            </div>
          )}
        </Card>
      )}

      {editing && (
        <EditUserModal user={user} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}

/* ---------- Reusable UI ---------- */

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-surface border border-subtle rounded-xl p-5 ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {subtitle && <p className="text-subtle text-xs mt-1">{subtitle}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface border border-subtle rounded-xl p-4">
      <div className="text-subtle text-xs uppercase tracking-wide">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
