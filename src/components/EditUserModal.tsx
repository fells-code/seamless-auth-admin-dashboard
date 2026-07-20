/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/components/EditUserModal.tsx
import { useId, useState } from "react";
import Dialog from "./Dialog";
import { useUpdateUser } from "../hooks/useUpdateUser";
import { useRoles } from "../hooks/useRoles";
import { useStepUpGuard } from "../hooks/useStepUpGuard";
import RoleChips from "./RoleChips";
import { StateMessage } from "./StateMessage";
import { getErrorMessage } from "../lib/errorMessage";
import { useToast } from "../hooks/useToast";
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
  const [stepUpPending, setStepUpPending] = useState(false);

  const { data: roleData } = useRoles();
  const availableRoles = roleData?.roles ?? [];

  const updateUser = useUpdateUser(user.id);
  const ensureStepUp = useStepUpGuard();
  const toast = useToast();

  const submit = async () => {
    setStepUpPending(true);
    try {
      if (!(await ensureStepUp())) {
        return;
      }

      updateUser.mutate(
        { email, phone, roles },
        {
          onSuccess: () => {
            toast.success("User updated", `${email} was saved.`);
            onClose();
          },
          onError: (error) => {
            toast.error("User update failed", getErrorMessage(error));
          },
        },
      );
    } finally {
      setStepUpPending(false);
    }
  };

  const isSaving = updateUser.isPending || stepUpPending;

  return (
    <Dialog
      title="Edit User"
      description="Update user details and roles"
      onClose={onClose}
    >
      <>
        {/* Form */}
        <div className="space-y-4">
          {updateUser.isError && (
            <StateMessage
              tone="error"
              title="User update failed"
              description={getErrorMessage(updateUser.error)}
            />
          )}
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

          <button
            onClick={() => void submit()}
            disabled={isSaving || !email.trim() || roles.length === 0}
            className="btn btn-primary disabled:opacity-50"
          >
            {stepUpPending ? "Verifying..." : "Save"}
          </button>
        </div>
      </>
    </Dialog>
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
  const id = useId();

  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="text-xs text-muted uppercase tracking-wide"
      >
        {label}
      </label>

      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
      />
    </div>
  );
}
