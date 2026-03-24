import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

export default function Topbar() {
  return (
    <header className="relative h-14 flex items-center justify-between px-6 border-b border-subtle bg-surface/80 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
      {/* Left side (future space for breadcrumbs or page title) */}
      <div className="flex items-center gap-3">
        {/* intentionally empty for now */}
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-surface-alt border border-subtle">
          <ThemeToggle />
        </div>

        <UserMenu />
      </div>
    </header>
  );
}
