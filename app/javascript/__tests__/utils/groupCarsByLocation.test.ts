import { describe, it, expect } from "vitest";
import { groupCarsByLocation } from "@/utils/groupCarsByLocation";
import type { Car } from "@/types/car";

function makeCar(id: number, lat: number | null, lng: number | null): Car {
  return {
    id,
    seller_latitude: lat,
    seller_longitude: lng,
  } as Car;
}

describe("groupCarsByLocation", () => {
  it("groups cars at identical coordinates into one group", () => {
    const cars = [
      makeCar(1, 51.4556, 12.3731),
      makeCar(2, 51.4556, 12.3731),
      makeCar(3, 51.4556, 12.3731),
    ];
    const groups = groupCarsByLocation(cars);
    expect(groups).toHaveLength(1);
    expect(groups[0].cars.map((c) => c.id)).toEqual([1, 2, 3]);
    expect(groups[0].latitude).toBe(51.4556);
    expect(groups[0].longitude).toBe(12.3731);
  });

  it("groups cars at near-identical coordinates (within ~11 m)", () => {
    const cars = [makeCar(1, 51.45561, 12.37312), makeCar(2, 51.45563, 12.37314)];
    const groups = groupCarsByLocation(cars);
    expect(groups).toHaveLength(1);
    expect(groups[0].cars).toHaveLength(2);
  });

  it("keeps cars at different locations in separate groups", () => {
    const cars = [makeCar(1, 51.4556, 12.3731), makeCar(2, 48.1351, 11.582)];
    const groups = groupCarsByLocation(cars);
    expect(groups).toHaveLength(2);
    expect(groups[0].cars.map((c) => c.id)).toEqual([1]);
    expect(groups[1].cars.map((c) => c.id)).toEqual([2]);
  });

  it("skips cars without coordinates", () => {
    const cars = [makeCar(1, null, null), makeCar(2, 51.4556, null), makeCar(3, 51.4556, 12.3731)];
    const groups = groupCarsByLocation(cars);
    expect(groups).toHaveLength(1);
    expect(groups[0].cars.map((c) => c.id)).toEqual([3]);
  });

  it("returns an empty array for no cars", () => {
    expect(groupCarsByLocation([])).toEqual([]);
  });

  it("handles string coordinates as returned by the API", () => {
    // The API serializes decimal columns as strings despite the Car type.
    const cars = [
      makeCar(1, "51.4556" as unknown as number, "12.3731" as unknown as number),
      makeCar(2, "51.4556" as unknown as number, "12.3731" as unknown as number),
      makeCar(3, "48.1351" as unknown as number, "11.582" as unknown as number),
    ];
    const groups = groupCarsByLocation(cars);
    expect(groups).toHaveLength(2);
    expect(groups[0].cars.map((c) => c.id)).toEqual([1, 2]);
    expect(groups[0].latitude).toBe(51.4556);
    expect(groups[0].longitude).toBe(12.3731);
  });

  it("skips cars with non-numeric coordinate strings", () => {
    const cars = [makeCar(1, "abc" as unknown as number, "12.3731" as unknown as number)];
    expect(groupCarsByLocation(cars)).toEqual([]);
  });
});
