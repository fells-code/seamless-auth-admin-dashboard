// src/components/SearchInput.tsx
export default function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 outline-none w-full"
      placeholder="Search users..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
