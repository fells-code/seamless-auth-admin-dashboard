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
    <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={clsx(
            "px-3 py-2 text-sm",
            active === tab
              ? "border-b-2 border-purple-500 text-purple-500"
              : "text-gray-400 hover:text-white",
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
