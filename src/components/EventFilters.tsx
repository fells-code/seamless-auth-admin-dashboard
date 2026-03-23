import { AuthEventTypeEnum } from "../types/authEventTypes";

const eventTypes = AuthEventTypeEnum.options;

export default function EventFilters({
  type,
  setType,
}: {
  type: string;
  setType: (v: string) => void;
}) {
  return (
    <select
      value={type}
      onChange={(e) => setType(e.target.value)}
      className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800"
    >
      <option value="">All Events</option>

      {eventTypes.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
