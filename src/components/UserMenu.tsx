// src/components/UserMenu.tsx
import { useState } from "react";
import { useAuth } from "@seamless-auth/react";
import { useNavigate } from "react-router-dom";

function getInitials(email: string) {
  if (!email) return "?";
  return email
    .split("@")[0]
    .split(".")
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
}

function timeAgo(date?: string) {
  if (!date) return "unknown";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-3 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-semibold">
          {getInitials(user.email)}
        </div>

        {/* Info */}
        <div className="text-left hidden sm:block">
          <div className="text-sm font-medium">{user.email}</div>
          <div className="text-xs text-gray-400">
            last login: {timeAgo(user.lastLogin)}
          </div>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-surface border border-subtle border border-gray-200 dark:border-gray-800 rounded shadow-lg">
          <button
            onClick={() => {
              navigate("/profile");
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Profile
          </button>

          <button
            onClick={logout}
            className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
