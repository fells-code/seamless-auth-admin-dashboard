import { useAuth } from "@seamless-auth/react";
import { Navigate } from "react-router-dom";
import AuthLoading from "./AuthLoading";
import { useState, useEffect } from "react";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (user !== undefined) {
      setTimeout(() => setReady(true), 100);
    }
  }, [user]);

  if (user === undefined) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/unauthenticated" replace />;
  }

  return (
    <div
      className={`transition-opacity duration-300 ${
        ready ? "opacity-100" : "opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
