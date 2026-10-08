import axios from "axios";
import type { Car } from "@/types/car";

interface PublicCollection {
  id: number;
  name: string;
  owner_name: string;
  cars_count: number;
  created_at: string;
}

export interface PublicCollectionData {
  collection: PublicCollection;
  cars: Car[];
  deep_researches: PublicDeepResearch[];
}

export interface PublicDeepResearch {
  id: number;
  collection_id: number;
  car_ids: number[];
  title: string | null;
  status: string;
  result: any | null;
  share_token: string | null;
  public_url: string | null;
  created_at: string;
}

const publicClient = axios.create({
  baseURL: "/api/v1",
  headers: { Accept: "application/json" },
});

export async function getPublicCollection(token: string): Promise<PublicCollectionData> {
  const { data } = await publicClient.get(`/public/collections/${token}`);
  return data;
}
