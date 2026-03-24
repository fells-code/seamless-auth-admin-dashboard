import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

export default function Topbar() {
  return (
    <div className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-end px-4">
      <UserMenu />
      <ThemeToggle />
    </div>
  );
}
