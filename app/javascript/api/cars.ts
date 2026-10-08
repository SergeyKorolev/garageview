import client from "./client";
import type { Car, CarFilters, CarSort } from "@/types/car";

interface GetCollectionCarsParams {
  collectionId: number;
  filters?: CarFilters;
  sort?: CarSort;
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}

interface PaginatedCars {
  cars: Car[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export async function getCollectionCars(
  params: GetCollectionCarsParams
): Promise<PaginatedCars> {
  const { collectionId, filters = {}, sort, page = 1, perPage = 50, signal } = params;
  const { data } = await client.get(`/collections/${collectionId}/cars`, {
    signal,
    params: {
      ...filters,
      sort_by: sort?.field,
      sort_dir: sort?.direction,
      page,
      per_page: perPage,
    },
  });
  return data;
}

export async function getAllCollectionCars(
  params: Omit<GetCollectionCarsParams, "page" | "perPage">,
  signal?: AbortSignal
): Promise<PaginatedCars> {
  const first = await getCollectionCars({ ...params, page: 1, perPage: 200, signal });
  const cars = [...first.cars];
  for (let page = 2; page <= first.total_pages; page++) {
    const next = await getCollectionCars({ ...params, page, perPage: 200, signal });
    cars.push(...next.cars);
  }
  return { ...first, cars: [...new Map(cars.map(car => [car.id, car])).values()] };
}

export async function addCarToCollection(
  collectionId: number,
  url: string
): Promise<Car> {
  const { data } = await client.post(`/collections/${collectionId}/cars`, { url });
  return data;
}

export async function removeCarFromCollection(
  collectionId: number,
  carId: number
): Promise<void> {
  await client.delete(`/collections/${collectionId}/cars/${carId}`);
}

export async function updateCarRating(
  collectionId: number,
  carId: number,
  rating: number
): Promise<Car> {
  const { data } = await client.patch(`/collections/${collectionId}/cars/${carId}`, { rating });
  return data;
}

export async function triggerAiRating(collectionId: number): Promise<void> {
  await client.post(`/collections/${collectionId}/cars/ai_rate`);
}
