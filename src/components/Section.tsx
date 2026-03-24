export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface border border-subtle border border-gray-200 dark:border-gray-800 p-5 rounded-xl space-y-4">
      <h2 className="heading-2">{title}</h2>
      {children}
    </div>
  );
}
