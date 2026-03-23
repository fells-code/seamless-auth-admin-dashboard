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
import { useUserTimeseries } from "../hooks/useUserTimeSeries";
import MiniLineChart from "../components/MiniLineChart";

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

  const handleDeleteUser = () => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    deleteUser.mutate(user.id, {
      onSuccess: () => navigate("/users"),
    });
  };

  const revokeAllSessions = () => {
    if (!confirm("Revoke ALL sessions for this user?")) return;

    sessions.forEach((s: any) => revokeSession.mutate(s.id));
  };

  const failedLogins =
    events.filter((e) => e.type === "login_failed").length ?? 0;

  const suspiciousCount = anomalies?.suspiciousEvents.length ?? 0;

  const risk = calculateRiskScore({
    suspiciousEvents: suspiciousCount,
    failedLogins,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{user.email}</h1>
            <RiskBadge level={risk.level} color={risk.color as any} />
          </div>

          <p className="text-gray-400 text-sm">{user.id}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="bg-purple-600 text-white px-3 py-1 rounded"
          >
            Edit
          </button>

          <button
            onClick={revokeAllSessions}
            className="bg-yellow-600 text-white px-3 py-1 rounded"
          >
            Revoke Sessions
          </button>

          <button
            onClick={handleDeleteUser}
            className="bg-red-600 text-white px-3 py-1 rounded"
          >
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

      {/* TAB CONTENT */}

      {tab === "Overview" && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-800 p-4 rounded-lg col-span-3">
            <div className="text-sm text-gray-400 mb-2">
              Login Activity (Last 24h)
            </div>

            <MiniLineChart data={timeseries?.timeseries ?? []} />
          </div>
          <Stat label="Roles" value={user.roles.join(", ")} />
          <Stat label="Verified" value={user.verified ? "Yes" : "No"} />
          <Stat label="Sessions" value={sessions.length} />
        </div>
      )}

      {tab === "Sessions" && (
        <Table
          columns={[
            { key: "ipAddress", label: "IP" },
            { key: "userAgent", label: "User Agent" },
            { key: "lastUsedAt", label: "Last Used" },
            { key: "actions", label: "" },
          ]}
          data={sessions.map((s: any) => ({
            ...s,
            lastUsedAt: new Date(s.lastUsedAt).toLocaleString(),
            actions: (
              <button
                onClick={() => revokeSession.mutate(s.id)}
                className="text-red-500 hover:underline"
              >
                Revoke
              </button>
            ),
          }))}
        />
      )}

      {tab === "Credentials" && (
        <Table
          columns={[
            { key: "deviceType", label: "Device" },
            { key: "browser", label: "Browser" },
            { key: "platform", label: "Platform" },
            { key: "createdAt", label: "Created" },
          ]}
          data={credentials.map((c: any) => ({
            ...c,
            createdAt: new Date(c.createdAt).toLocaleString(),
          }))}
        />
      )}

      {tab === "Events" && (
        <Table
          columns={[
            { key: "type", label: "Type" },
            { key: "created_at", label: "Time" },
          ]}
          data={events.map((e: any) => ({
            ...e,
            created_at: new Date(e.created_at).toLocaleString(),
          }))}
        />
      )}

      {tab === "Security" && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
          {anomalies?.suspiciousEvents.length ? (
            <>
              <div className="text-red-400 mb-3">
                {anomalies.suspiciousEvents.length} suspicious events detected
              </div>

              <Table
                columns={[
                  { key: "type", label: "Type" },
                  { key: "ip_address", label: "IP" },
                  { key: "created_at", label: "Time" },
                ]}
                data={anomalies.suspiciousEvents.map((e: any) => ({
                  ...e,
                  created_at: new Date(e.created_at).toLocaleString(),
                }))}
              />
            </>
          ) : (
            <div className="text-green-400">No suspicious activity</div>
          )}
        </div>
      )}

      {editing && (
        <EditUserModal user={user} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-800 p-4 rounded-lg">
      <div className="text-gray-400 text-sm">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
