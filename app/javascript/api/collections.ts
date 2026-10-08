import client from "./client";
import type {
  Collection,
  CreateCollectionPayload,
  UpdateCollectionPayload,
} from "@/types/collection";

export async function getCollections(): Promise<Collection[]> {
  const { data } = await client.get("/collections");
  return data;
}

export async function getCollection(id: number): Promise<Collection> {
  const { data } = await client.get(`/collections/${id}`);
  return data;
}

export async function createCollection(
  payload: CreateCollectionPayload
): Promise<Collection> {
  const { data } = await client.post("/collections", { collection: payload });
  return data;
}

export async function updateCollection(
  id: number,
  payload: UpdateCollectionPayload
): Promise<Collection> {
  const { data } = await client.patch(`/collections/${id}`, { collection: payload });
  return data;
}

export async function deleteCollection(id: number): Promise<void> {
  await client.delete(`/collections/${id}`);
}
