import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCollectionCars, getAllCollectionCars, addCarToCollection, removeCarFromCollection, updateCarRating } from "@/api/cars";
import { useFilterStore } from "@/stores/filterStore";
import { useCollection } from "@/hooks/useCollections";

export function useCollectionCars(collectionId: number, page?: number) {
  const { filters, sort } = useFilterStore();
  const { data: collection } = useCollection(collectionId);

  const query = useQuery({
    queryKey: ["collectionCars", collectionId, filters, sort, page ?? "all"],
    queryFn: ({ signal }) => page == null
      ? getAllCollectionCars({ collectionId, filters, sort }, signal)
      : getCollectionCars({ collectionId, filters, sort, page, signal }),
    enabled: collectionId > 0,
    staleTime: 5000,
    refetchInterval: (query) => {
      // Poll while collection is fetching from search filter
      if (collection?.is_fetching) return 3000;
      const data = query.state.data;
      const cars = data?.cars;
      if (!data) return false;
      if (!cars || cars.length === 0) return false;
      // Poll only for REAL cars that are still loading (ignore placeholders — they have negative IDs)
      const hasRealPending = cars.some((c: any) =>
        c.id > 0 && (c.status === "pending" || c.status === "scraping")
      );
      if (hasRealPending) return 3000;
      return false;
    },
  });

  return query;
}

export function useAddCar(collectionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => addCarToCollection(collectionId, url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collectionCars", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useRateCar(collectionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ carId, rating }: { carId: number; rating: number }) =>
      updateCarRating(collectionId, carId, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collectionCars", collectionId] });
    },
  });
}

export function useRemoveCar(collectionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (carId: number) => removeCarFromCollection(collectionId, carId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collectionCars", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}
