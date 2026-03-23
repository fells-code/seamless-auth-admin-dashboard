// src/components/Topbar.tsx
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

export default function Topbar() {
  const { theme, toggle } = useTheme();

  return (
    <div className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-end px-4">
      <button
        onClick={toggle}
        className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  );
}
