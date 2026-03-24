// src/pages/Users.tsx
import { useState } from "react";
import { useUsers } from "../hooks/useUsers";
import Table from "../components/Table";
import Skeleton from "../components/Skeleton";
import SearchInput from "../components/SearchInput";
import { useNavigate } from "react-router-dom";
import CreateUserModal from "../components/CreateUserModal";
import { ArrowRight, Trash2 } from "lucide-react";

function formatTimeAgo(date?: string) {
  if (!date) return "-";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Users() {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);

  const limit = 10;

  const { data, isLoading } = useUsers({ search, limit, offset });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="heading-1">Users</h1>
          <p className="text-muted text-sm">
            Manage users and access across your system
          </p>
        </div>

        <button onClick={() => setOpen(true)} className="btn btn-primary">
          Create User
        </button>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <SearchInput
          value={search}
          onChange={(v) => {
            setOffset(0);
            setSearch(v);
          }}
        />
      </div>

      {/* Table */}
      {users.length === 0 ? (
        <div className="text-muted text-sm">
          No users found. Create your first user to get started.
        </div>
      ) : (
        <Table
          data={users}
          selectable
          limit={limit}
          offset={offset}
          total={total}
          onPageChange={setOffset}
          columns={[
            {
              key: "email",
              label: "User",
              sortable: true,
              render: (value: string, row: any) => (
                <div
                  onClick={() => navigate(`/users/${row.id}`)}
                  className="group flex items-center justify-between cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-medium transition-colors group-hover:text-primary">
                      {value}
                    </span>

                    <span className="text-xs text-muted">
                      {row.phone || "No phone"}
                    </span>
                  </div>
                </div>
              ),
            },
            {
              key: "roles",
              label: "Roles",
              render: (roles: string[]) => (
                <div className="flex flex-wrap gap-1">
                  {roles.map((r) => (
                    <span
                      key={r}
                      className="px-2 py-0.5 text-xs rounded-full bg-surface-alt border border-subtle"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              ),
            },
            {
              key: "verified",
              label: "Status",
              sortable: true,
              render: (value: boolean) => (
                <span
                  className={`text-xs font-medium ${
                    value ? "text-[var(--accent)]" : "text-[var(--highlight)]"
                  }`}
                >
                  {value ? "Verified" : "Unverified"}
                </span>
              ),
            },
            {
              key: "lastLogin",
              label: "Last Active",
              sortable: true,
              render: (value: string) => (
                <span className="text-sm text-muted">
                  {formatTimeAgo(value)}
                </span>
              ),
            },
          ]}
          actions={[
            {
              icon: ArrowRight,
              label: "View",
              onClick: (row) => navigate(`/users/${row.id}`),
            },
            {
              icon: Trash2,
              label: "Delete",
              variant: "danger",
              onClick: (row) => {
                console.log("delete user", row.id);
              },
            },
          ]}
        />
      )}

      {open && <CreateUserModal onClose={() => setOpen(false)} />}
    </div>
  );
}
