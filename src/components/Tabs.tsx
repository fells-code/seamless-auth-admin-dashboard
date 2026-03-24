import clsx from "clsx";

export default function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-lg border border-subtle bg-surface-alt p-1">
      {tabs.map((tab) => {
        const isActive = active === tab;

        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={clsx(
              "px-3 py-1.5 text-sm rounded-md transition-all duration-150 cursor-pointer",
              isActive
                ? "bg-surface text-primary shadow-sm"
                : "text-muted hover:text-primary hover:bg-surface",
            )}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
