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

export function groupCarsByLocation(cars: Car[]): CarLocationGroup[] {
  const groups = new Map<string, CarLocationGroup>();

  for (const car of cars) {
    if (car.seller_latitude == null || car.seller_longitude == null) continue;

    const key = `${car.seller_latitude.toFixed(COORDINATE_PRECISION)},${car.seller_longitude.toFixed(COORDINATE_PRECISION)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.cars.push(car);
    } else {
      groups.set(key, {
        key,
        longitude: car.seller_longitude,
        latitude: car.seller_latitude,
        cars: [car],
      });
    }
  }

  return [...groups.values()];
}
