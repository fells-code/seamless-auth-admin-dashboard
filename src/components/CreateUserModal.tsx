// src/components/CreateUserModal.tsx
import { useState } from "react";
import { useCreateUser } from "../hooks/useCreateUser";

export default function CreateUserModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const createUser = useCreateUser();

  const submit = () => {
    createUser.mutate(
      { email, phone },
      {
        onSuccess: () => onClose(),
      },
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-surface border border-subtle p-6 rounded-lg w-96 space-y-4">
        <h2 className="text-lg font-semibold">Create User</h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded"
        />

        <input
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose}>Cancel</button>

          <button
            onClick={submit}
            className="bg-primary text-white hover:opacity-90"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
