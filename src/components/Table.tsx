// src/components/Table.tsx
import clsx from "clsx";

export default function Table({
  columns,
  data,
}: {
  columns: { key: string; label: string }[];
  data: any[];
}) {
  return (
    <div className="overflow-auto border rounded-lg border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left px-4 py-2 text-subtle uppercase tracking-wide"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className={clsx(
                "border-t border-gray-200 dark:border-gray-800",
                "hover:bg-gray-50 dark:hover:bg-gray-900",
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2">
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
