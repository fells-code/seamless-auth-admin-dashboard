import { useEffect, useState } from "react";
import LayoutSkeleton from "./LayoutSkeleton";

export default function AuthLoading() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <LayoutSkeleton />
    </div>
  );
}
