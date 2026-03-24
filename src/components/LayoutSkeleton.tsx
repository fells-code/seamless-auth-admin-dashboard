import Skeleton from "./Skeleton";

export default function LayoutSkeleton() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 p-4 space-y-3 border-r border-gray-800">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>

      {/* Main */}
      <div className="flex-1 p-6">
        <Skeleton className="h-6 w-48 mb-6" />

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>

        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
