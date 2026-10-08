import type { TravelTime } from "@/types/car";
import { formatTravelTime, formatDistance } from "@/utils/formatters";

interface TravelBadgeProps {
  travelTime?: TravelTime;
  compact?: boolean;
}

export default function TravelBadge({ travelTime, compact = false }: TravelBadgeProps) {
  if (!travelTime) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        {travelTime.driving_seconds != null && (
          <span title="Driving time">
            {formatTravelTime(travelTime.driving_seconds)}
          </span>
        )}
        {travelTime.flying_seconds != null && (
          <span title="Flying time">
            {formatTravelTime(travelTime.flying_seconds)}
          </span>
        )}
      </div>
    );
  }

  const routeVia = travelTime.route_cities?.length
    ? ` via ${travelTime.route_cities.join(", ")}`
    : "";

  return (
    <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
      {travelTime.driving_seconds != null && (
        <div className="flex items-start gap-1.5">
          <span className="shrink-0 text-gray-400">Car</span>
          <span>
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {formatTravelTime(travelTime.driving_seconds)}
            </span>
            <span className="text-gray-400">{routeVia}</span>
          </span>
        </div>
      )}
      {travelTime.flying_seconds != null && travelTime.origin_airport && travelTime.dest_airport && (
        <div className="flex items-start gap-1.5">
          <span className="shrink-0 text-gray-400">Fly</span>
          <span>
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {formatTravelTime(travelTime.flying_seconds)}
            </span>
            <span className="text-gray-400">
              {" "}{travelTime.origin_airport} → {travelTime.dest_airport}
            </span>
            {travelTime.last_mile_info && (
              <span className="text-gray-400">, {travelTime.last_mile_info}</span>
            )}
          </span>
        </div>
      )}
      {travelTime.flying_seconds != null && !travelTime.origin_airport && (
        <div className="flex items-start gap-1.5">
          <span className="shrink-0 text-gray-400">Fly</span>
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {formatTravelTime(travelTime.flying_seconds)}
          </span>
        </div>
      )}
    </div>
  );
}
