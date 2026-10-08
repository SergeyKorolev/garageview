import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
} from "@/api/collections";
import type { CreateCollectionPayload, UpdateCollectionPayload } from "@/types/collection";

export function useCollections() {
  return useQuery({
    queryKey: ["collections"],
    queryFn: getCollections,
    refetchInterval: (query) => {
      const collections = query.state.data;
      if (Array.isArray(collections) && collections.some((b: any) => b.is_fetching)) return 3000;
      return false;
    },
  });
}

export function useCollection(id: number) {
  return useQuery({
    queryKey: ["collections", id],
    queryFn: () => getCollection(id),
    enabled: id > 0,
    staleTime: 5000,
    // Poll while collection is fetching new cars from search filters (match useCollectionCars interval)
    refetchInterval: (query) => {
      if (query.state.data?.is_fetching) return 3000;
      return false;
    },
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCollectionPayload) => createCollection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCollectionPayload }) =>
      updateCollection(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["collections", id] });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}
