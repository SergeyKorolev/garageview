import client from "./client";

export interface DeepResearch {
  id: number;
  collection_id: number;
  car_ids: number[];
  title: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  result: any | null;
  share_token: string | null;
  public_url: string | null;
  created_at: string;
}

export async function getDeepResearches(collectionId: number): Promise<DeepResearch[]> {
  const res = await client.get(`/collections/${collectionId}/deep_researches`);
  return res.data;
}

export async function getDeepResearch(collectionId: number, id: number): Promise<DeepResearch> {
  const res = await client.get(`/collections/${collectionId}/deep_researches/${id}`);
  return res.data;
}

export async function createDeepResearch(collectionId: number, carIds: number[]): Promise<{ id: number; status: string }> {
  const res = await client.post(`/collections/${collectionId}/deep_researches`, { car_ids: carIds });
  return res.data;
}

export async function deleteDeepResearch(collectionId: number, id: number): Promise<void> {
  await client.delete(`/collections/${collectionId}/deep_researches/${id}`);
}

export async function shareResearch(
  collectionId: number,
  researchId: number
): Promise<{ share_token: string; public_url: string }> {
  const res = await client.post(`/collections/${collectionId}/deep_researches/${researchId}/share`);
  return res.data;
}

export async function unshareResearch(
  collectionId: number,
  researchId: number
): Promise<void> {
  await client.delete(`/collections/${collectionId}/deep_researches/${researchId}/share`);
}

export async function chatWithResearch(
  collectionId: number,
  researchId: number,
  message: string,
  history: { role: string; content: string }[]
): Promise<{ reply: string }> {
  const res = await client.post(`/collections/${collectionId}/deep_researches/${researchId}/chat`, {
    message,
    history,
  });
  return res.data;
}
