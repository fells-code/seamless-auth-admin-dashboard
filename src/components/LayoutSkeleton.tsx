import Skeleton from "./Skeleton";

export default function LayoutSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-base text-primary">
      {/* Sidebar */}
      <div className="w-64 border-r border-subtle px-4 py-5 space-y-4">
        {/* Logo */}
        <Skeleton className="h-5 w-32" />

        {/* Nav items */}
        <div className="space-y-2 mt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 rounded-md" />
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <div className="h-14 border-b border-subtle flex items-center justify-end px-6">
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-7xl px-6 py-6 space-y-6">
            {/* Page title */}
            <Skeleton className="h-6 w-48" />

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-5">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>

            {/* Chart */}
            <Skeleton className="h-64 rounded-xl" />

            {/* Table rows */}
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
