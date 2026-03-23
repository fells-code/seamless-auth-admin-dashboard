// src/pages/Users.tsx
import { useState } from "react";
import { useUsers } from "../hooks/useUsers";
import Table from "../components/Table";
import Skeleton from "../components/Skeleton";
import SearchInput from "../components/SearchInput";
import { useNavigate } from "react-router-dom";
import CreateUserModal from "../components/CreateUserModal";

export default function Users() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 10;

  const { data, isLoading } = useUsers({ search, limit, offset });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const start = offset + 1;
  const end = Math.min(offset + limit, total);

  const columns = [
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "roles", label: "Roles" },
    { key: "verified", label: "Verified" },
    { key: "lastLogin", label: "Last Login" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Users</h1>

        <button
          onClick={() => setOpen(true)}
          className="bg-purple-600 text-white px-3 py-1 rounded"
        >
          Create User
        </button>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <SearchInput value={search} onChange={(v) => setSearch(v)} />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-gray-500">No users found</div>
      ) : (
        <Table
          columns={columns}
          data={users.map((u) => ({
            ...u,
            email: (
              <button
                onClick={() => navigate(`/users/${u.id}`)}
                className="text-purple-500 hover:underline"
              >
                {u.email}
              </button>
            ),
            roles: u.roles.join(", "),
            verified: u.verified ? "Yes" : "No",
            lastLogin: u.lastLogin
              ? new Date(u.lastLogin).toLocaleString()
              : "-",
          }))}
        />
      )}

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-400">
          Showing {start}-{end} of {total}
        </div>

        <div className="flex gap-2">
          <button
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded"
          >
            Prev
          </button>

          <button
            disabled={offset + limit >= total}
            onClick={() => setOffset((o) => o + limit)}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded"
          >
            Next
          </button>
        </div>
      </div>

      {open && <CreateUserModal onClose={() => setOpen(false)} />}
    </div>
  );
}
