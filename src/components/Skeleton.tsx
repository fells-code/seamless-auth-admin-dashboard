export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-gray-200 dark:bg-gray-800 ${className}`}
    >
      <div className="absolute inset-0 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-gray-600/40 to-transparent" />
    </div>
  );
}
