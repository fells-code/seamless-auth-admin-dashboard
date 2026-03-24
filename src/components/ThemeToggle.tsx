import { useTheme } from "../hooks/useTheme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="px-3 py-1 rounded border border-subtle bg-surface"
    >
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
