// src/components/Sidebar.tsx
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Shield,
  Activity,
  KeyRound,
  Settings,
} from "lucide-react";

const navItems = [
  { name: "Overview", path: "/", icon: LayoutDashboard },
  { name: "Users", path: "/users", icon: Users },
  { name: "Sessions", path: "/sessions", icon: KeyRound },
  { name: "Events", path: "/events", icon: Activity },
  { name: "Security", path: "/security", icon: Shield },
  { name: "System", path: "/system", icon: Settings },
];

export default function Sidebar() {
  return (
    <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-4">
      <div className="text-xl font-bold mb-6">Seamless Auth</div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md transition ${
                  isActive
                    ? "bg-purple-600 text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`
              }
            >
              <Icon size={18} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
