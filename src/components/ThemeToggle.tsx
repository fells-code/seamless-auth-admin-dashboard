import { useTheme } from "../hooks/useTheme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button onClick={toggle} className="px-3 py-1">
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
