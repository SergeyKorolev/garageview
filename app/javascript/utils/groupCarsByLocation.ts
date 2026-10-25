import type { Car } from "@/types/car";

export interface CarLocationGroup {
  key: string;
  longitude: number;
  latitude: number;
  cars: Car[];
}

// ~11 m at the equator: coordinates rounded to 4 decimals are treated as one location,
// so markers at identical or near-identical dealer coordinates group together.
const COORDINATE_PRECISION = 4;

// The API serializes decimal columns as strings, so seller coordinates arrive
// as strings at runtime despite the Car type declaring them as numbers.
function toCoordinate(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function groupCarsByLocation(cars: Car[]): CarLocationGroup[] {
  const groups = new Map<string, CarLocationGroup>();

  for (const car of cars) {
    const latitude = toCoordinate(car.seller_latitude);
    const longitude = toCoordinate(car.seller_longitude);
    if (latitude == null || longitude == null) continue;

    const key = `${latitude.toFixed(COORDINATE_PRECISION)},${longitude.toFixed(COORDINATE_PRECISION)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.cars.push(car);
    } else {
      groups.set(key, {
        key,
        longitude,
        latitude,
        cars: [car],
      });
    }
  }

  return [...groups.values()];
}
