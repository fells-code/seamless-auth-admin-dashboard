// src/components/CreateUserModal.tsx
import { useState } from "react";
import { useCreateUser } from "../hooks/useCreateUser";
import { useRoles } from "../hooks/useRoles";
import RoleChips from "./RoleChips";

export default function CreateUserModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roles, setRoles] = useState<string[]>([]);

  const { data: roleData } = useRoles();
  const availableRoles = roleData?.roles ?? [];

  const createUser = useCreateUser();

  const submit = () => {
    createUser.mutate(
      { email, phone, roles },
      {
        onSuccess: () => onClose(),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl border border-subtle bg-surface p-6 shadow-lg space-y-5">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Create User</h2>
          <p className="text-subtle text-xs">Add a new user and assign roles</p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <Input label="Email" value={email} onChange={setEmail} />

          <Input label="Phone" value={phone} onChange={setPhone} />

          <div className="space-y-2">
            <label className="text-xs text-muted uppercase tracking-wide">
              Roles
            </label>

            <RoleChips
              roles={availableRoles}
              selected={roles}
              onChange={setRoles}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>

          <button onClick={submit} className="btn btn-primary">
            Create
          </button>
        </div>
      </div>
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
