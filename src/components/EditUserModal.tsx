/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/components/EditUserModal.tsx
import { useState } from "react";
import { useUpdateUser } from "../hooks/useUpdateUser";
import { useRoles } from "../hooks/useRoles";
import RoleChips from "./RoleChips";
import type { User } from "@seamless-auth/types";

export default function EditUserModal({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [roles, setRoles] = useState<string[]>(user.roles);

  const { data: roleData } = useRoles();
  const availableRoles = roleData?.roles ?? [];

  const updateUser = useUpdateUser(user.id);

  const submit = () => {
    updateUser.mutate({ email, phone, roles }, { onSuccess: () => onClose() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl border border-subtle bg-surface p-6 shadow-lg transition-all">
        {/* Header */}
        <div className="mb-5">
          <h2 className="text-lg font-semibold tracking-tight">Edit User</h2>
          <p className="text-subtle text-xs mt-1">
            Update user details and roles
          </p>
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
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>

          <button onClick={submit} className="btn btn-primary">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Input Component ---------- */

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
