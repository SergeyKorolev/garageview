import client from "./client";
import type {
  SearchFilter,
  CreateSearchFilterPayload,
} from "@/types/searchFilter";

export async function getSearchFilters(
  collectionId: number
): Promise<SearchFilter[]> {
  const { data } = await client.get(`/collections/${collectionId}/search_filters`);
  return data;
}

export async function createSearchFilter(
  collectionId: number,
  payload: CreateSearchFilterPayload
): Promise<SearchFilter> {
  const { data } = await client.post(
    `/collections/${collectionId}/search_filters`,
    { search_filter: payload }
  );
  return data;
}

export async function deleteSearchFilter(
  collectionId: number,
  filterId: number
): Promise<void> {
  await client.delete(`/collections/${collectionId}/search_filters/${filterId}`);
}

export async function refreshSearchFilter(
  collectionId: number,
  filterId: number
): Promise<void> {
  await client.post(
    `/collections/${collectionId}/search_filters/${filterId}/refresh`
  );
}
