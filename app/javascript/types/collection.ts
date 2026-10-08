export interface Collection {
  id: number;
  name: string;
  default: boolean;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  cars_count: number;
  ai_rated_count: number;
  search_filters_count: number;
  preview_photos: string[];
  is_fetching: boolean;
  expected_cars?: number | null;
  ready_cars?: number | null;
  price_min: number | null;
  price_max: number | null;
  mileage_min: number | null;
  mileage_max: number | null;
  created_at: string;
  updated_at: string;
  role: "owner" | "editor" | "viewer";
  members_count: number;
  owner: { id: number; name: string } | null;
  compare_token?: string | null;
  compare_url?: string | null;
  compare_role?: string;
  share_token?: string | null;
  share_url?: string | null;
}

export interface CreateCollectionPayload {
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
}

export interface UpdateCollectionPayload extends Partial<CreateCollectionPayload> {}
