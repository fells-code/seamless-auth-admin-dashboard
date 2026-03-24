import { useAuth } from "@seamless-auth/react";
import { Navigate } from "react-router-dom";
import LayoutSkeleton from "../components/LayoutSkeleton";

export default function Unauthenticated() {
  const { isAuthenticated, hasRole, user, loading } = useAuth();

  if (loading || user === undefined) {
    return <LayoutSkeleton />;
  }

  if (isAuthenticated && hasRole("admin")) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="bg-surface border border-subtle border border-gray-200 dark:border-gray-800 p-8 rounded-xl text-center space-y-4">
        <h1 className="text-xl font-semibold">Authentication Required</h1>

        {isAuthenticated && !hasRole("admin") ? (
          <p className="text-red-400 text-sm">
            Your account does not have admin access.
          </p>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            You must be signed in with an admin account to access the dashboard.
          </p>
        )}

        <button className="bg-primary text-white hover:opacity-90">
          Sign In
        </button>
      </div>
    </div>
  );
}
