// src/components/RoleChips.tsx
export default function RoleChips({
  roles,
  selected,
  onChange,
}: {
  roles: string[];
  selected: string[];
  onChange: (roles: string[]) => void;
}) {
  function toggle(role: string) {
    if (selected.includes(role)) {
      onChange(selected.filter((r) => r !== role));
    } else {
      onChange([...selected, role]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((role) => {
        const active = selected.includes(role);

        return (
          <button
            key={role}
            onClick={() => toggle(role)}
            className={`px-3 py-1 rounded-full text-sm transition
              ${
                active
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }
            `}
          >
            {role}
          </button>
        );
      })}
    </div>
  );
}
