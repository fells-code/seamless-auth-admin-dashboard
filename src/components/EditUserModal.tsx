// src/components/EditUserModal.tsx
import { useState } from "react";
import { useUpdateUser } from "../hooks/useUpdateUser";
import { useRoles } from "../hooks/useRoles";
import RoleChips from "./RoleChips";

export default function EditUserModal({
  user,
  onClose,
}: {
  user: any;
  onClose: () => void;
}) {
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [roles, setRoles] = useState<string[]>(user.roles);

  const { data: roleData } = useRoles();
  const availableRoles = roleData?.roles ?? [];

  const updateUser = useUpdateUser(user.id);

  const submit = () => {
    updateUser.mutate(
      {
        email,
        phone,
        roles,
      },
      {
        onSuccess: () => onClose(),
      },
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-96 space-y-4">
        <h2 className="text-lg font-semibold">Edit User</h2>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded"
          placeholder="Email"
        />

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded"
          placeholder="Phone"
        />

        {/* Role Chips */}
        <div>
          <label className="text-sm text-gray-400">Roles</label>

          <RoleChips
            roles={availableRoles}
            selected={roles}
            onChange={setRoles}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose}>Cancel</button>

          <button
            onClick={submit}
            className="bg-purple-600 text-white px-3 py-1 rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
